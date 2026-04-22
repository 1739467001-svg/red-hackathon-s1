import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject, Observable } from 'rxjs';
import { LlmService } from '../llm/llm.service';
import { SearchService } from '../search/search.service';
import { Simulation } from './entities/simulation.entity';
import { Message } from './entities/message.entity';
import { Result } from './entities/result.entity';
import { characters } from '../../data/characters';
import { judges } from '../../data/judges';
import { PhaseExecutor } from './phase-executor';
import type {
  MessageCallback,
  TypingCallback,
  ToolCallCallback,
} from './phase-executor';
import type {
  AwardTier,
  AwardInfo,
  ReportGroupEntry,
  SimulationReport,
} from './interfaces/simulation.interfaces';
import { GroupRunner } from './group-runner';
import { JudgeRunner } from './judge-runner';
import type { GroupAssignment } from './interfaces/simulation.interfaces';

interface MessageEvent {
  data: string;
}

@Injectable()
export class SimulationService {
  private eventStreams = new Map<string, Subject<MessageEvent>>();

  constructor(
    @InjectRepository(Simulation)
    private simulationRepo: Repository<Simulation>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(Result) private resultRepo: Repository<Result>,
    private llmService: LlmService,
    private searchService: SearchService,
    private configService: ConfigService,
  ) {}

  async startSimulation(ideas: string[]): Promise<{ simulationId: string }> {
    // 1. Phase 0: Group assignment
    const phaseExecutor = new PhaseExecutor(
      this.llmService,
      this.searchService,
    );
    const groups = phaseExecutor.executePhase0(characters, ideas);

    // 2. Save to DB
    const simulation = this.simulationRepo.create({
      ideas,
      groups,
      currentPhase: 0,
      status: 'running' as const,
    });
    const saved = await this.simulationRepo.save(simulation);

    // 3. Create event stream
    const subject = new Subject<MessageEvent>();
    this.eventStreams.set(saved.id, subject);

    // 4. Start async simulation (don't await)
    this.runSimulation(saved.id, groups).catch((err) => {
      console.error('Simulation failed:', err);
      this.failSimulation(
        saved.id,
        err instanceof Error ? err.message : String(err),
      );
    });

    return { simulationId: saved.id };
  }

  private async runSimulation(
    simulationId: string,
    groups: GroupAssignment[],
  ): Promise<void> {
    const subject = this.eventStreams.get(simulationId);
    const onMessage: MessageCallback = async (msg) => {
      // Save to DB
      await this.messageRepo.save({ simulationId, ...msg });
      // Push to SSE
      subject?.next({
        data: JSON.stringify({ type: 'message', ...msg }),
      });
    };

    const onTyping: TypingCallback = (msg) => {
      subject?.next({
        data: JSON.stringify({ type: 'agent_typing', ...msg }),
      });
    };

    const onToolCall: ToolCallCallback = (msg) => {
      subject?.next({
        data: JSON.stringify({ type: 'tool_call', ...msg }),
      });
    };

    // Create group runners
    const runners = groups.map(
      (g) =>
        new GroupRunner(g, characters, this.llmService, this.searchService),
    );

    // Phase 1: All groups in parallel
    subject?.next({
      data: JSON.stringify({ type: 'phase_change', phase: 1 }),
    });
    await this.simulationRepo.update(simulationId, { currentPhase: 1 });
    await Promise.all(
      runners.map((r) => r.runPhase1(onMessage, onTyping, onToolCall)),
    );

    // Phase 2: All groups in parallel
    subject?.next({
      data: JSON.stringify({ type: 'phase_change', phase: 2 }),
    });
    await this.simulationRepo.update(simulationId, { currentPhase: 2 });
    // Get phase 1 summaries (last message from each group's leader in phase 1)
    const bpResults = await Promise.all(
      runners.map(async (r) => {
        const group = r.getGroup();
        const leader = group.members.find((m) => m.isLeader);
        const lastMsg = await this.messageRepo.findOne({
          where: {
            simulationId,
            groupId: group.groupId,
            phase: 1,
            ...(leader ? { agentId: leader.characterId } : {}),
          },
          order: { createdAt: 'DESC' },
        });
        return r.runPhase2(
          lastMsg?.content || '',
          onMessage,
          onTyping,
          onToolCall,
        );
      }),
    );

    // Phase 3: Sequential judging
    subject?.next({
      data: JSON.stringify({ type: 'phase_change', phase: 3 }),
    });
    await this.simulationRepo.update(simulationId, { currentPhase: 3 });
    const judgeRunner = new JudgeRunner(this.llmService);

    for (let i = 0; i < runners.length; i++) {
      const runner = runners[i];
      const bp = bpResults[i];
      const scores = await judgeRunner.evaluate(
        runner.getGroup(),
        runner.getAgents(),
        bp,
        judges,
        onMessage,
        onTyping,
      );
      const totalScore =
        scores.reduce(
          (sum, s) =>
            sum +
            s.innovation +
            s.presentation +
            s.completeness +
            s.businessPotential +
            s.techDifficulty,
          0,
        ) / scores.length;

      await this.resultRepo.save({
        simulationId,
        groupId: runner.getGroup().groupId,
        bpDocument: bp,
        scores,
        totalScore,
      });
    }

    // Complete
    await this.simulationRepo.update(simulationId, {
      status: 'completed' as const,
    });
    subject?.next({
      data: JSON.stringify({ type: 'complete', simulationId }),
    });
    subject?.complete();
    this.eventStreams.delete(simulationId);
  }

  private failSimulation(simulationId: string, errorMessage: string): void {
    const subject = this.eventStreams.get(simulationId);
    subject?.next({
      data: JSON.stringify({ type: 'error', message: errorMessage }),
    });
    subject?.complete();
    this.eventStreams.delete(simulationId);
    this.simulationRepo.update(simulationId, {
      status: 'failed' as const,
    });
  }

  getStream(simulationId: string): Observable<MessageEvent> {
    let subject = this.eventStreams.get(simulationId);
    if (!subject) {
      subject = new Subject<MessageEvent>();
      this.eventStreams.set(simulationId, subject);
    }
    return subject.asObservable();
  }

  async getStatus(simulationId: string) {
    const sim = await this.simulationRepo.findOneBy({ id: simulationId });
    if (!sim) throw new NotFoundException();
    return {
      id: sim.id,
      phase: sim.currentPhase,
      status: sim.status,
      groups: sim.groups,
    };
  }

  async getResult(simulationId: string) {
    const results = await this.resultRepo.find({
      where: { simulationId },
      order: { totalScore: 'DESC' },
    });
    const messages = await this.messageRepo.find({
      where: { simulationId },
      order: { createdAt: 'ASC' },
    });
    return { results, messages };
  }

  async getReport(simulationId: string): Promise<SimulationReport> {
    let sim;
    try {
      sim = await this.simulationRepo.findOneBy({ id: simulationId });
    } catch {
      throw new NotFoundException();
    }
    if (!sim) throw new NotFoundException();

    const results = await this.resultRepo.find({
      where: { simulationId },
      order: { totalScore: 'DESC' },
    });

    const AWARD_TIERS: { tier: AwardTier; label: string }[] = [
      { tier: 'gold', label: '冠军' },
      { tier: 'silver', label: '亚军' },
      { tier: 'bronze', label: '季军' },
    ];

    const awards: AwardInfo[] = results.map((r, idx) => ({
      tier: idx < 3 ? AWARD_TIERS[idx].tier : 'honorable',
      label: idx < 3 ? AWARD_TIERS[idx].label : '优秀奖',
      groupId: r.groupId,
      projectName: (r.bpDocument as { projectName?: string })?.projectName || `组${r.groupId}`,
      totalScore: Number(r.totalScore.toFixed(2)),
      rank: idx + 1,
    }));

    const groupsRaw = sim.groups as Array<{ groupId: number; idea: string; track: string; members: unknown[] }>;
    const groupsMap = new Map<number, { groupId: number; idea: string; track: string; members: unknown[] }>(
      groupsRaw.map((g) => [g.groupId, g] as [number, { groupId: number; idea: string; track: string; members: unknown[] }]),
    );

    const reportGroups: ReportGroupEntry[] = results.map((r, idx) => {
      const groupInfo = groupsMap.get(r.groupId);
      const scoresArr = r.scores as Array<{
        judgeId: string;
        judgeName: string;
        innovation: number;
        presentation: number;
        completeness: number;
        businessPotential: number;
        techDifficulty: number;
        comment: string;
        suggestion: string;
      }>;
      const count = scoresArr.length || 1;
      const dimAvg = {
        innovation: Number((scoresArr.reduce((s, j) => s + (j.innovation || 0), 0) / count).toFixed(2)),
        presentation: Number((scoresArr.reduce((s, j) => s + (j.presentation || 0), 0) / count).toFixed(2)),
        completeness: Number((scoresArr.reduce((s, j) => s + (j.completeness || 0), 0) / count).toFixed(2)),
        businessPotential: Number((scoresArr.reduce((s, j) => s + (j.businessPotential || 0), 0) / count).toFixed(2)),
        techDifficulty: Number((scoresArr.reduce((s, j) => s + (j.techDifficulty || 0), 0) / count).toFixed(2)),
      };

      return {
        rank: idx + 1,
        award: awards[idx],
        groupId: r.groupId,
        idea: groupInfo?.idea || '',
        track: (groupInfo?.track || 'software') as 'software' | 'hardware',
        members: (groupInfo?.members || []) as ReportGroupEntry['members'],
        bpDocument: r.bpDocument as ReportGroupEntry['bpDocument'],
        scores: scoresArr,
        totalScore: Number(r.totalScore.toFixed(2)),
        dimensionAverages: dimAvg,
      };
    });

    return {
      simulationId,
      createdAt: sim.createdAt.toISOString(),
      ideas: sim.ideas as string[],
      totalGroups: results.length,
      winner: awards[0],
      awards,
      groups: reportGroups,
    };
  }
}
