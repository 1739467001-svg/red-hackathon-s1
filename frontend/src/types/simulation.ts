export interface SimulationMessage {
  type: 'message' | 'phase_change' | 'complete' | 'tool_call' | 'error' | 'score';
  groupId?: number;
  agent?: {
    id: string;
    name: string;
    avatar: string;
    role: string;
    isLeader: boolean;
  };
  content?: string;
  phase?: number;
  simulationId?: string;
}

export interface TypingAgent {
  groupId: number;
  agentId: string;
  agentName: string;
  agentRole: string;
  isLeader: boolean;
  startedAt: number; // Date.now()
}

export type Track = 'software' | 'hardware';

export interface GroupInfo {
  groupId: number;
  idea: string;
  track: Track;
  members: {
    characterId: string;
    role: string;
    isLeader: boolean;
  }[];
}

export interface BPDocument {
  projectName: string;
  problem: string;
  solution: string;
  targetUsers: string;
  features: string;
  businessModel: string;
  advantage: string;
}

export interface JudgeScore {
  judgeId: string;
  judgeName: string;
  innovation: number;
  presentation: number;
  completeness: number;
  businessPotential: number;
  techDifficulty: number;
  comment: string;
  suggestion: string;
}

export interface GroupResult {
  groupId: number;
  bpDocument: BPDocument;
  scores: JudgeScore[];
  totalScore: number;
}

export interface SimulationResult {
  results: GroupResult[];
  messages: SimulationMessage[];
}

export type AwardTier = 'gold' | 'silver' | 'bronze' | 'honorable';

export interface AwardInfo {
  tier: AwardTier;
  label: string;
  groupId: number;
  projectName: string;
  totalScore: number;
  rank: number;
}

export interface DimensionAverages {
  innovation: number;
  presentation: number;
  completeness: number;
  businessPotential: number;
  techDifficulty: number;
}

export interface ReportGroupEntry {
  rank: number;
  award: AwardInfo;
  groupId: number;
  idea: string;
  track: Track;
  members: {
    characterId: string;
    role: string;
    isLeader: boolean;
  }[];
  bpDocument: BPDocument;
  scores: JudgeScore[];
  totalScore: number;
  dimensionAverages: DimensionAverages;
}

export interface SimulationReport {
  simulationId: string;
  createdAt: string;
  ideas: string[];
  totalGroups: number;
  winner: AwardInfo;
  awards: AwardInfo[];
  groups: ReportGroupEntry[];
}
