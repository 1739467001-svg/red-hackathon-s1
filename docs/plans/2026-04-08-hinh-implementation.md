# HinH Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a hackathon simulation sandbox where AI agents deliberate on user ideas through 4 phases, producing business plans with judge scoring.

**Architecture:** Next.js frontend with Phaser 3 game engine for pixel-art tavern scene, NestJS backend with SSE-driven simulation orchestrator that runs 4 parallel agent groups through Claude Haiku 4.5.

**Tech Stack:** Next.js 16, Phaser 3, Zustand, Tailwind CSS 4, shadcn/ui, NestJS 11, TypeORM, PostgreSQL, SSE, OpenAI-compatible API (api.bltcy.ai)

**Design doc:** `docs/plans/2026-04-08-hinh-design.md`

**Dev principles:** Single responsibility, KISS, no `any`, no over-engineering, no backward compat hacks

---

## Task 1: Character Data Preparation

准备 20 个 OC 角色数据（7 真实 + 13 虚拟）和 6 个评委数据。

**Files:**
- Create: `backend/src/data/characters.ts`
- Create: `backend/src/data/judges.ts`
- Copy: `assets/extracted/OC角色/*.jpeg` → `frontend/public/avatars/`

**Steps:**

1. 解压 OC 图片到前端 public 目录，命名为 `oc-1.jpeg` ~ `oc-7.jpeg`
2. 为 13 个虚拟角色生成像素风头像（用 AI 图片生成工具），保存为 `oc-8.jpeg` ~ `oc-20.jpeg`
3. 创建 `backend/src/data/characters.ts`，导出 20 个角色数据数组：

```typescript
export interface CharacterData {
  id: string;
  name: string;
  avatarUrl: string;
  characterType: string;
  colorPreference: string;
  personality: string[];
  description: string;
  skill: string;
  weapon: string;
  equipment: string;
  companion: string;
  isGenerated: boolean;
}

export const characters: CharacterData[] = [
  // 7 个真实角色（从 xlsx 数据填充）
  // 13 个虚拟角色（LLM 一次性生成）
];
```

4. 创建 `backend/src/data/judges.ts`，导出 6 个评委数据：

```typescript
export interface JudgeData {
  id: string;
  name: string;
  title: string;
  avatarUrl: string;
  personality: string;
  focusAreas: string[];
  judgingStyle: string;
}

export const judges: JudgeData[] = [
  { id: 'judge-1', name: 'Chaos', title: '小红书CPO', ... },
  { id: 'judge-2', name: '菲特', title: '资深产品专家', ... },
  { id: 'judge-3', name: '刘靖康', title: 'Insta360创始人', ... },
  { id: 'judge-4', name: '傅盛', title: '猎豹移动CEO', ... },
  { id: 'judge-5', name: '张鹏', title: '极客公园创始人', ... },
  { id: 'judge-6', name: '曹曦', title: '砺思资本创始人', ... },
];
```

5. 同步创建前端类型 `frontend/src/types/character.ts`
6. Commit: `feat: add character and judge data`

---

## Task 2: Backend — Database Entities

**Files:**
- Create: `backend/src/modules/simulation/entities/simulation.entity.ts`
- Create: `backend/src/modules/simulation/entities/message.entity.ts`
- Create: `backend/src/modules/simulation/entities/result.entity.ts`

**Steps:**

1. 创建 simulation entity：

```typescript
// simulation.entity.ts
@Entity()
export class Simulation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('jsonb')
  ideas: string[];

  @Column('jsonb')
  groups: GroupAssignment[]; // [{groupId, members: [{characterId, role, isLeader}]}]

  @Column({ default: 0 })
  currentPhase: number;

  @Column({ default: 'running' })
  status: 'running' | 'completed';

  @CreateDateColumn()
  createdAt: Date;
}
```

2. 创建 message entity：

```typescript
// message.entity.ts
@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  simulationId: string;

  @Column()
  groupId: number;

  @Column()
  phase: number;

  @Column()
  agentId: string;

  @Column()
  agentName: string;

  @Column()
  agentRole: string;

  @Column('text')
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

3. 创建 result entity：

```typescript
// result.entity.ts
@Entity()
export class Result {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  simulationId: string;

  @Column()
  groupId: number;

  @Column('jsonb')
  bpDocument: BPDocument; // {projectName, problem, solution, targetUsers, features, businessModel, advantage}

  @Column('jsonb')
  scores: JudgeScore[]; // [{judgeId, innovation, presentation, completeness, businessPotential, techDifficulty, comment, suggestion}]

  @Column('float', { default: 0 })
  totalScore: number;
}
```

4. 验证：`cd backend && npm run build`
5. Commit: `feat: add simulation database entities`

---

## Task 3: Backend — LLM Client Service

**Files:**
- Create: `backend/src/modules/llm/llm.service.ts`
- Create: `backend/src/modules/llm/llm.module.ts`

**Steps:**

1. 安装依赖：`cd backend && npm install openai`

2. 创建 LLM service，核心功能：
   - 调用 api.bltcy.ai（OpenAI 兼容格式）
   - Semaphore 限流（最大并发 6）
   - chat 方法：接收 system prompt + messages，返回回复

```typescript
// llm.service.ts
@Injectable()
export class LlmService {
  private client: OpenAI;
  private semaphore: number = 0;
  private readonly maxConcurrent = 6;
  private queue: Array<{ resolve: () => void }> = [];

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://api.bltcy.ai',
      apiKey: process.env.LLM_API_KEY,
    });
  }

  async chat(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
    await this.acquireSemaphore();
    try {
      const response = await this.client.chat.completions.create({
        model: 'claude-haiku-4-5-20251001',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      });
      return response.choices[0].message.content;
    } finally {
      this.releaseSemaphore();
    }
  }
}
```

3. 在 `.env` 添加 `LLM_API_KEY=sk-VsC0gO8mQkr7VKWfcRb0WUKkfkSyDmyR2fXNCCmzYwFxzmJ9`
4. 验证：`npm run build`
5. Commit: `feat: add LLM client service with semaphore`

---

## Task 4: Backend — Search Service

**Files:**
- Create: `backend/src/modules/search/search.service.ts`
- Create: `backend/src/modules/search/search.module.ts`

**Steps:**

1. 创建搜索服务，核心功能：
   - 独立并发队列（max 3）
   - 结果缓存（相同 query 不重复搜索）
   - 使用 Brave Search API 或 DuckDuckGo（根据可用性选择）
   - 超时 10 秒

```typescript
@Injectable()
export class SearchService {
  private cache = new Map<string, string>();
  private semaphore = 0;
  private readonly maxConcurrent = 3;

  async search(query: string): Promise<string> {
    if (this.cache.has(query)) return this.cache.get(query);
    await this.acquireSemaphore();
    try {
      const result = await this.fetchSearchResults(query);
      this.cache.set(query, result);
      return result;
    } finally {
      this.releaseSemaphore();
    }
  }
}
```

2. 验证：`npm run build`
3. Commit: `feat: add search service with queue and cache`

---

## Task 5: Backend — Simulation Orchestrator

这是核心模块，负责整个模拟流程的编排。

**Files:**
- Create: `backend/src/modules/simulation/simulation.module.ts`
- Create: `backend/src/modules/simulation/simulation.service.ts`
- Create: `backend/src/modules/simulation/simulation.controller.ts`
- Create: `backend/src/modules/simulation/agent.ts`
- Create: `backend/src/modules/simulation/group-runner.ts`
- Create: `backend/src/modules/simulation/phase-executor.ts`
- Create: `backend/src/modules/simulation/judge-runner.ts`
- Create: `backend/src/modules/simulation/dto/start-simulation.dto.ts`

**Step 1: Agent 类**

```typescript
// agent.ts — 一个 Agent 就是 persona prompt + 对话历史
export class Agent {
  constructor(
    public readonly character: CharacterData,
    public readonly role: string, // 产品经理/前端工程师/...
    public readonly isLeader: boolean,
    private llmService: LlmService,
    private searchService: SearchService,
  ) {}

  private buildSystemPrompt(): string {
    // 将角色人设 + 岗位 + 当前任务组合成 system prompt
  }

  async speak(conversationHistory: ChatMessage[], instruction: string): Promise<string> {
    // 调用 LLM 生成回复
    // 如果回复中包含搜索意图，调用 searchService，将结果注入后重新生成
  }
}
```

**Step 2: PhaseExecutor**

```typescript
// phase-executor.ts — 按阶段规则驱动发言
export class PhaseExecutor {
  // Phase 0: 算法分组，无 LLM 调用
  async executePhase0(characters: CharacterData[]): Promise<GroupAssignment[]> {}

  // Phase 1: 队长发言 → 组员轮流提问 → 自由回答 → 队长总结
  async executePhase1(group: GroupContext, idea: string, onMessage: MessageCallback): Promise<void> {}

  // Phase 2: 队长分配 → 组员确认 → 各自产出 → 队长汇总 BP
  async executePhase2(group: GroupContext, onMessage: MessageCallback): Promise<BPDocument> {}
}
```

**Step 3: GroupRunner**

```typescript
// group-runner.ts — 每组独立运行
export class GroupRunner {
  async run(phase: number, onMessage: MessageCallback): Promise<void> {
    switch (phase) {
      case 1: return this.phaseExecutor.executePhase1(this.group, this.idea, onMessage);
      case 2: return this.phaseExecutor.executePhase2(this.group, onMessage);
    }
  }
}
```

**Step 4: JudgeRunner**

```typescript
// judge-runner.ts — 逐组答辩
export class JudgeRunner {
  async evaluate(group: GroupContext, bp: BPDocument, onMessage: MessageCallback): Promise<JudgeScore[]> {
    // 1. 队长基于 BP 生成陈述
    // 2. LLM 决定 2-3 个评委提问
    // 3. LLM 决定谁回答
    // 4. 全部评委打分 + 点评
  }
}
```

**Step 5: SimulationService（总调度）**

```typescript
// simulation.service.ts
@Injectable()
export class SimulationService {
  async startSimulation(ideas: string[]): Promise<{ simulationId: string }> {
    // 1. 创建 Simulation 记录
    // 2. Phase 0: 分组
    // 3. 启动异步模拟流程（不阻塞请求）
    return { simulationId };
  }

  async runSimulation(simulationId: string): Promise<void> {
    // Phase 1: 4 个 GroupRunner 并行 → Promise.all
    // PhaseGate: 等全部完成
    // Phase 2: 4 个 GroupRunner 并行 → Promise.all
    // PhaseGate: 等全部完成
    // Phase 3: JudgeRunner 逐组执行
    // 保存结果，标记完成
  }

  // SSE 流
  getStream(simulationId: string): Observable<MessageEvent> {}
}
```

**Step 6: Controller + DTO**

```typescript
// simulation.controller.ts
@Controller('api/simulation')
export class SimulationController {
  @Post('start')
  start(@Body() dto: StartSimulationDto) {}

  @Sse(':id/stream')
  stream(@Param('id') id: string) {}

  @Get(':id/status')
  status(@Param('id') id: string) {}

  @Get(':id/result')
  result(@Param('id') id: string) {}
}
```

6. 注册 SimulationModule 到 AppModule
7. 验证：`npm run build`
8. 验证：`npm run start:dev`，curl POST /api/simulation/start 检查响应
9. Commit: `feat: add simulation orchestrator with agent system`

---

## Task 6: Frontend — Shared Types & Stores

**Files:**
- Create: `frontend/src/types/simulation.ts`
- Create: `frontend/src/stores/simulation-store.ts`
- Create: `frontend/src/services/api.ts`

**Steps:**

1. 定义前端类型（与后端 SSE 消息格式对齐）：

```typescript
// types/simulation.ts
export interface SimulationMessage {
  type: 'message' | 'phase_change' | 'complete';
  groupId?: number;
  agent?: { id: string; name: string; avatar: string; role: string };
  content?: string;
  phase?: number;
  resultId?: string;
}
```

2. 创建 Zustand store：

```typescript
// stores/simulation-store.ts
// 管理：simulationId, currentPhase, groups, messages per group, results
// actions：addMessage, setPhase, setResults, connectSSE, disconnect
```

3. 创建 API service：

```typescript
// services/api.ts
// startSimulation(ideas: string[]): Promise<{simulationId: string}>
// getResult(simulationId: string): Promise<SimulationResult>
// SSE 连接由 store 内管理
```

4. 验证：`cd frontend && npm run build`
5. Commit: `feat: add frontend types, store, and API service`

---

## Task 7: Frontend — Idea Input Page

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Create: `frontend/src/app/globals.css`（追加像素风样式）

**Steps:**

1. 实现全屏像素风 Idea 输入页：
   - 深色背景 + 像素风标题"欢迎来到 HinH"
   - 1-4 个 idea 输入框，支持动态添加/删除
   - "开始模拟"按钮
   - 提交后调用 API，跳转到 `/simulation`

2. **加载 frontend-design + ui-ux-pro-max skill** 辅助设计
3. 像素风字体：使用 Google Fonts 的像素风字体（如 Press Start 2P 或 Silkscreen）
4. 验证：`npm run dev`，浏览器检查页面
5. Commit: `feat: add idea input page with pixel art style`

---

## Task 8: Frontend — Phaser 3 Game Scene

**Files:**
- Create: `frontend/src/components/game/GameCanvas.tsx`（React 包裹组件）
- Create: `frontend/src/components/game/TavernScene.ts`（酒馆场景）
- Create: `frontend/src/components/game/ArenaScene.ts`（答辩厅场景）
- Create: `frontend/src/components/game/CharacterSprite.ts`（角色精灵）

**Steps:**

1. 安装：`cd frontend && npm install phaser`

2. 创建 GameCanvas React 组件：
   - 包裹 Phaser.Game 实例
   - 监听 Zustand store 变化，通过 Phaser 事件驱动场景更新
   - 组件卸载时销毁 Phaser 实例

3. 创建 TavernScene：
   - 像素风酒馆背景（tilemap 或背景图）
   - 4 张桌子固定位置
   - 每桌 5 个 CharacterSprite
   - 角色发言时头顶冒气泡（Tween 动画）
   - 左上角阶段指示器

4. 创建 ArenaScene（答辩厅）：
   - 上排 5 席 + 下排 6 席
   - 逐组上台动画（角色从侧边走入）
   - 发言气泡

5. 创建 CharacterSprite：
   - 加载 OC 头像作为精灵
   - idle 微动画（上下轻微浮动）
   - 说话状态（气泡 + 高亮）
   - 移动 tween（走到指定位置）

6. 像素风素材：酒馆背景 + 桌椅 tileset（从开源素材获取或 AI 生成）
7. 验证：`npm run dev`，确认场景渲染
8. Commit: `feat: add Phaser game scenes (tavern + arena)`

---

## Task 9: Frontend — Simulation Page (Map + Chat Sidebar)

**Files:**
- Create: `frontend/src/app/simulation/page.tsx`
- Create: `frontend/src/components/ChatSidebar.tsx`
- Create: `frontend/src/components/PhaseIndicator.tsx`

**Steps:**

1. 创建 `/simulation` 页面布局：
   - 左侧：GameCanvas（Phaser 酒馆/答辩厅）
   - 右侧：ChatSidebar

2. ChatSidebar：
   - 顶部 4 个 Tab（组 1-4），带未读消息计数
   - 对话列表：每条消息显示角色头像 + 名字 + 岗位 + 内容
   - 自动滚动到最新消息
   - 接收 Zustand store 的消息数据

3. SSE 连接：页面加载时连接，store 管理连接生命周期

4. 验证：前后端同时运行，发起模拟检查消息流
5. Commit: `feat: add simulation page with chat sidebar`

---

## Task 10: Frontend — Result Page

**Files:**
- Create: `frontend/src/app/result/page.tsx`
- Create: `frontend/src/components/ResultCard.tsx`
- Create: `frontend/src/components/BPDocument.tsx`

**Steps:**

1. 创建 `/result` 页面：
   - 排行榜：各组按总分排列，显示组名 + 总分 + 排名奖牌
   - 每组可展开 ResultCard
   - ResultCard 内含：BP 文档全文、每位评委分数（5 维度雷达图或表格）、评委点评、改进建议

2. BPDocument 组件：结构化展示 BP 各板块

3. 验证：mock 数据渲染检查
4. Commit: `feat: add result page with rankings and BP viewer`

---

## Task 11: Integration & Polish

**Steps:**

1. 前后端联调：完整跑一次模拟流程，检查 SSE 消息→Phaser 动画→对话显示→结果展示链路
2. 处理边界情况：SSE 断线重连、模拟过程中刷新页面恢复状态
3. UI 打磨：**加载 frontend-design + ui-ux-pro-max skill**，确保商业级 UI 质量
4. Commit: `feat: complete end-to-end simulation flow`

---

## Task 12: Review & Ship

**Steps:**

1. **加载 simplify skill**：审查所有变更代码
2. **加载 PJR skill**：执行 lint + build（前后端都跑），检查代码逻辑和文档一致性
3. **加载 git-merge-to-develop skill**：合并到 develop 分支
4. **Playwright E2E 测试**：桌面端完整流程测试
   - 输入页：输入 idea，点击开始
   - 模拟页：验证消息流、Tab 切换、Phaser 角色动画
   - 答辩页：验证逐组答辩流程
   - 结果页：验证排名、BP 展开、评委点评
   - 每个按钮、每个交互都要点一遍

---

## 依赖关系

```
Task 1 (数据) ──┐
Task 2 (DB)   ──┤
Task 3 (LLM)  ──┼── Task 5 (编排引擎) ──┐
Task 4 (搜索)  ──┘                       │
                                         ├── Task 11 (联调)── Task 12 (Review)
Task 6 (类型/Store) ──┐                  │
Task 7 (输入页)      ──┤                  │
Task 8 (Phaser)      ──┼── Task 9 (模拟页) ┘
                       │
                       └── Task 10 (结果页)
```

Task 1-4 可并行，Task 6-8 可并行，Task 5 和 Task 9 各自依赖前置完成。
