import type { CharacterData } from '../../data/characters';
import type { ChatMessage, LlmService } from '../llm/llm.service';
import type { SearchService } from '../search/search.service';
import type {
  GroupAssignment,
  BPDocument,
  HackathonRole,
  Track,
} from './interfaces/simulation.interfaces';
import { Agent } from './agent';

/** Shared identity fields for agent events */
export interface AgentIdentity {
  groupId: number;
  agentId: string;
  agentName: string;
  agentRole: string;
  isLeader: boolean;
}

export type MessageCallback = (
  msg: AgentIdentity & { content: string; phase: number },
) => Promise<void>;

export type TypingCallback = (
  msg: AgentIdentity & { isTyping: boolean },
) => void;

export type ToolCallCallback = (
  msg: Pick<AgentIdentity, 'groupId' | 'agentId' | 'agentName'> & {
    toolName: string;
    toolInput: string;
    status: 'calling' | 'completed';
  },
) => void;

/** Build a typing event payload from an Agent */
export function buildTypingPayload(
  groupId: number,
  agent: Agent,
  isTyping: boolean,
): AgentIdentity & { isTyping: boolean } {
  return {
    groupId,
    agentId: agent.character.id,
    agentName: agent.character.name,
    agentRole: agent.role,
    isLeader: agent.isLeader,
    isTyping,
  };
}

/** Build a per-agent tool call callback */
export function buildToolCallCb(
  groupId: number,
  agent: Agent,
  onToolCall?: ToolCallCallback,
): (
  toolName: string,
  toolInput: string,
  status: 'calling' | 'completed',
) => void {
  return (toolName, toolInput, status) =>
    onToolCall?.({
      groupId,
      agentId: agent.character.id,
      agentName: agent.character.name,
      toolName,
      toolInput,
      status,
    });
}

/** Target members per group (groups will have 3-6 members via round-robin) */
const TARGET_GROUP_SIZE = 5;

/**
 * 成果展示的5个维度，每个组员负责一个方面
 * 顺序对应 agents 数组（0=队长/产品, 1=前端, 2=后端, 3=设计师, 4=运营）
 */
const PRESENTATION_ASPECTS = [
  {
    title: '产品介绍',
    prompt:
      '请以产品经理视角，介绍产品的核心功能、用户体验设计和产品路线图。重点突出产品的独特价值主张，不超过200字。',
  },
  {
    title: '可行性分析与竞品分析',
    prompt:
      '请从技术/前端视角，分析该产品的技术可行性，并对比主要竞品的优劣势，说明我们的差异化优势。不超过200字。',
  },
  {
    title: '解决的痛点与伪命题辨析',
    prompt:
      '请从后端/技术视角，深入分析该产品解决的真实痛点，并辨析哪些需求是真实的、哪些可能是伪命题，如何验证需求真实性。不超过200字。',
  },
  {
    title: '商业化路径',
    prompt:
      '请从设计/用户视角，阐述产品的商业化策略：盈利模式、定价策略、目标市场规模、用户增长路径。不超过200字。',
  },
  {
    title: '后续改善与完善计划',
    prompt:
      '请从运营视角，制定产品的迭代计划：短期（3个月）、中期（1年）、长期（3年）的改善方向和完善计划，以及关键里程碑。不超过200字。',
  },
];

export class PhaseExecutor {
  constructor(
    private llmService: LlmService,
    private searchService: SearchService,
  ) {}

  /** Determine track by character ID: oc-1~20 = software, oc-21~40 = hardware */
  private getTrack(character: CharacterData): Track {
    const num = parseInt(character.id.replace(/\D/g, ''), 10);
    return num <= 20 ? 'software' : 'hardware';
  }

  // Phase 0: Algorithm-based grouping (NO LLM calls)
  // Groups are formed within each track (software / hardware) separately.
  executePhase0(
    allCharacters: CharacterData[],
    ideas: string[],
  ): GroupAssignment[] {
    const leaderTypes = new Set(['ENTJ', 'ENFJ', 'ESTJ', 'ESTP', 'ENTP']);
    const backendTypes = new Set(['INTJ', 'INTP', 'ISTJ', 'ISTP']);
    const designerTypes = new Set(['ISFP', 'INFP', 'INFJ']);
    const marketingTypes = new Set(['ENFP', 'ESFP', 'ESFJ']);

    // Assign roles based on personality traits
    const withRoles = allCharacters.map((c) => {
      const primaryType = c.personality[0] || '';
      let role: HackathonRole = '运营';
      let leaderScore = 0;

      if (leaderTypes.has(primaryType)) leaderScore = 3;
      if (c.personality.some((p) => leaderTypes.has(p)))
        leaderScore = Math.max(leaderScore, 2);

      if (backendTypes.has(primaryType)) role = '后端工程师';
      else if (designerTypes.has(primaryType)) role = '设计师';
      else if (marketingTypes.has(primaryType)) role = '运营';
      else if (primaryType.startsWith('E') || primaryType === 'ISFJ')
        role = '产品经理';
      else role = '前端工程师';

      return { character: c, role, leaderScore, track: this.getTrack(c) };
    });

    // Split by track, shuffle each independently
    const tracks: Track[] = ['software', 'hardware'];
    const allGroups: GroupAssignment[] = [];
    let groupIdCounter = 1;

    for (const track of tracks) {
      const pool = withRoles.filter((w) => w.track === track);
      // Shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      const groupCount = Math.ceil(pool.length / TARGET_GROUP_SIZE);
      const buckets: (typeof pool)[] = Array.from(
        { length: groupCount },
        () => [],
      );
      for (let i = 0; i < pool.length; i++) {
        buckets[i % groupCount].push(pool[i]);
      }

      for (const bucket of buckets) {
        bucket.sort((a, b) => b.leaderScore - a.leaderScore);
        const ideaIndex = Math.min(groupIdCounter - 1, ideas.length - 1);

        allGroups.push({
          groupId: groupIdCounter++,
          idea: ideas[ideaIndex],
          track,
          members: bucket.map((m, idx) => ({
            characterId: m.character.id,
            role: idx === 0 ? '产品经理' : m.role,
            isLeader: idx === 0,
          })),
        });
      }
    }

    return allGroups;
  }

  // Phase 1: Free Discussion
  async executePhase1(
    agents: Agent[],
    groupId: number,
    idea: string,
    onMessage: MessageCallback,
    onTyping?: TypingCallback,
    onToolCall?: ToolCallCallback,
  ): Promise<void> {
    const history: ChatMessage[] = [];
    const leader = agents.find((a) => a.isLeader)!;
    const members = agents.filter((a) => !a.isLeader);

    const emitTyping = (agent: Agent, isTyping: boolean) =>
      onTyping?.(buildTypingPayload(groupId, agent, isTyping));

    const makeToolCb = (agent: Agent) =>
      buildToolCallCb(groupId, agent, onToolCall);

    // Step 1: Leader presents idea and proposes direction
    emitTyping(leader, true);
    const leaderOpening = await leader.speak(
      history,
      `你是本组队长。收到的黑客松主题是："${idea}"。请提出你对这个主题的理解和初步方向。`,
    );
    emitTyping(leader, false);
    history.push({
      role: 'assistant',
      content: `[${leader.character.name}]: ${leaderOpening}`,
    });
    await onMessage({
      groupId,
      agentId: leader.character.id,
      agentName: leader.character.name,
      agentRole: leader.role,
      isLeader: true,
      content: leaderOpening,
      phase: 1,
    });

    // Step 2: Each member asks one question (round-robin)
    for (const member of members) {
      emitTyping(member, true);
      const question = await member.speak(
        history,
        `队长刚才提出了方向，请你从${member.role}的角度提出一个问题或看法。`,
      );
      emitTyping(member, false);
      history.push({
        role: 'assistant',
        content: `[${member.character.name}]: ${question}`,
      });
      await onMessage({
        groupId,
        agentId: member.character.id,
        agentName: member.character.name,
        agentRole: member.role,
        isLeader: false,
        content: question,
        phase: 1,
      });
    }

    // Step 3: Free discussion - each person picks 1-2 questions to answer
    for (const agent of agents) {
      emitTyping(agent, true);
      const response = await agent.speak(
        history,
        `请选择之前讨论中的1-2个问题进行回答或补充你的看法。如果需要搜索市场数据，请用 [SEARCH:搜索关键词] 格式。`,
        makeToolCb(agent),
      );
      emitTyping(agent, false);
      history.push({
        role: 'assistant',
        content: `[${agent.character.name}]: ${response}`,
      });
      await onMessage({
        groupId,
        agentId: agent.character.id,
        agentName: agent.character.name,
        agentRole: agent.role,
        isLeader: agent.isLeader,
        content: response,
        phase: 1,
      });
    }

    // Step 4: Leader summarizes and decides direction
    emitTyping(leader, true);
    const summary = await leader.speak(
      history,
      `作为队长，请分析以上所有讨论，总结出最终的选题和产品方向。请明确给出：1.产品名称 2.核心问题 3.解决方案方向`,
    );
    emitTyping(leader, false);
    history.push({
      role: 'assistant',
      content: `[${leader.character.name}]: ${summary}`,
    });
    await onMessage({
      groupId,
      agentId: leader.character.id,
      agentName: leader.character.name,
      agentRole: leader.role,
      isLeader: true,
      content: summary,
      phase: 1,
    });
  }

  // Phase 2: Create Product
  async executePhase2(
    agents: Agent[],
    groupId: number,
    phase1Summary: string,
    onMessage: MessageCallback,
    onTyping?: TypingCallback,
    onToolCall?: ToolCallCallback,
  ): Promise<BPDocument> {
    const history: ChatMessage[] = [
      { role: 'assistant', content: `[阶段1总结]: ${phase1Summary}` },
    ];
    const leader = agents.find((a) => a.isLeader)!;
    const members = agents.filter((a) => !a.isLeader);

    const emitTyping = (agent: Agent, isTyping: boolean) =>
      onTyping?.(buildTypingPayload(groupId, agent, isTyping));

    const makeToolCb = (agent: Agent) =>
      buildToolCallCb(groupId, agent, onToolCall);

    // Step 1: Leader assigns tasks
    emitTyping(leader, true);
    const assignment = await leader.speak(
      history,
      `基于阶段1确定的方向，请给每个组员分配具体的BP撰写任务。组员岗位：${members.map((m) => `${m.character.name}(${m.role})`).join('、')}。BP需要包含：项目名称、问题与痛点、解决方案、目标用户、核心功能、商业模式、竞争优势。`,
    );
    emitTyping(leader, false);
    history.push({
      role: 'assistant',
      content: `[${leader.character.name}]: ${assignment}`,
    });
    await onMessage({
      groupId,
      agentId: leader.character.id,
      agentName: leader.character.name,
      agentRole: leader.role,
      isLeader: true,
      content: assignment,
      phase: 2,
    });

    // Step 2: Members confirm/ask questions
    for (const member of members) {
      emitTyping(member, true);
      const confirm = await member.speak(
        history,
        `队长分配了任务，请确认你的任务理解或提出疑问。`,
      );
      emitTyping(member, false);
      history.push({
        role: 'assistant',
        content: `[${member.character.name}]: ${confirm}`,
      });
      await onMessage({
        groupId,
        agentId: member.character.id,
        agentName: member.character.name,
        agentRole: member.role,
        isLeader: false,
        content: confirm,
        phase: 2,
      });
    }

    // Step 3: Each member writes their section (can search)
    for (const member of members) {
      emitTyping(member, true);
      const section = await member.speak(
        history,
        `现在请撰写你负责的BP板块内容。要求详实、有数据支撑。如果需要市场数据，请用 [SEARCH:关键词] 格式搜索。`,
        makeToolCb(member),
      );
      emitTyping(member, false);
      history.push({
        role: 'assistant',
        content: `[${member.character.name}]: ${section}`,
      });
      await onMessage({
        groupId,
        agentId: member.character.id,
        agentName: member.character.name,
        agentRole: member.role,
        isLeader: false,
        content: section,
        phase: 2,
      });
    }

    // Step 4: Leader consolidates into BP document
    emitTyping(leader, true);
    const bpRaw = await leader.speak(
      history,
      `请将团队讨论的创业项目成果，用以下JSON结构整理成文档（这是游戏的标准输出格式）：
{"projectName":"项目名","problem":"问题与痛点","solution":"解决方案","targetUsers":"目标用户","features":"核心功能","businessModel":"商业模式","advantage":"竞争优势"}
请只输出JSON内容，不加其他说明。`,
    );
    emitTyping(leader, false);
    await onMessage({
      groupId,
      agentId: leader.character.id,
      agentName: leader.character.name,
      agentRole: leader.role,
      isLeader: true,
      content: bpRaw,
      phase: 2,
    });

    // Parse BP document
    try {
      const jsonMatch = bpRaw.match(/\{[\s\S]*\}/);
      return jsonMatch
        ? (JSON.parse(jsonMatch[0]) as BPDocument)
        : this.fallbackBP(bpRaw);
    } catch {
      return this.fallbackBP(bpRaw);
    }
  }

  /**
   * Phase 3a: 成果展示
   * 5名组员各自介绍一个方面：产品介绍/可行性分析/痛点辨析/商业化/改善计划
   */
  async executePhase3a(
    agents: Agent[],
    groupId: number,
    bp: BPDocument,
    onMessage: MessageCallback,
    onTyping?: TypingCallback,
  ): Promise<void> {
    const history: ChatMessage[] = [
      {
        role: 'assistant',
        content: `[项目BP]: ${JSON.stringify(bp)}`,
      },
    ];

    const emitTyping = (agent: Agent, isTyping: boolean) =>
      onTyping?.(buildTypingPayload(groupId, agent, isTyping));

    // 每个 agent 对应一个展示方面
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const aspect = PRESENTATION_ASPECTS[i % PRESENTATION_ASPECTS.length];

      emitTyping(agent, true);
      const speech = await agent.speak(
        history,
        `【成果展示环节 - ${aspect.title}】\n基于团队的项目BP文档，${aspect.prompt}\n请以你的角色身份（${agent.role}）进行展示，语言生动有力。`,
      );
      emitTyping(agent, false);

      history.push({
        role: 'assistant',
        content: `[${agent.character.name}(${aspect.title})]: ${speech}`,
      });

      await onMessage({
        groupId,
        agentId: agent.character.id,
        agentName: agent.character.name,
        agentRole: agent.role,
        isLeader: agent.isLeader,
        content: `【${aspect.title}】\n${speech}`,
        phase: 3,
      });
    }
  }

  private fallbackBP(raw: string): BPDocument {
    return {
      projectName: '未命名项目',
      problem: raw,
      solution: '',
      targetUsers: '',
      features: '',
      businessModel: '',
      advantage: '',
    };
  }
}
