export type HackathonRole =
  | '产品经理'
  | '前端工程师'
  | '后端工程师'
  | '设计师'
  | '运营';

export interface GroupMember {
  characterId: string;
  role: HackathonRole;
  isLeader: boolean;
}

export type Track = 'software' | 'hardware';

export interface GroupAssignment {
  groupId: number;
  idea: string;
  track: Track;
  members: GroupMember[];
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

export type AwardTier = 'gold' | 'silver' | 'bronze' | 'honorable';

export interface AwardInfo {
  tier: AwardTier;
  label: string; // 冠军 / 亚军 / 季军 / 优秀奖
  groupId: number;
  projectName: string;
  totalScore: number;
  rank: number;
}

export interface ReportGroupEntry {
  rank: number;
  award: AwardInfo;
  groupId: number;
  idea: string;
  track: Track;
  members: GroupMember[];
  bpDocument: BPDocument;
  scores: JudgeScore[];
  totalScore: number;
  /** Per-dimension average across all judges */
  dimensionAverages: {
    innovation: number;
    presentation: number;
    completeness: number;
    businessPotential: number;
    techDifficulty: number;
  };
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

export interface JudgeScore {
  judgeId: string;
  judgeName: string;
  innovation: number; // 创新性 1-10
  presentation: number; // 现场讲述效果 1-10
  completeness: number; // 完成度 1-10
  businessPotential: number; // 商业潜力 1-10
  techDifficulty: number; // 技术难度 1-10
  comment: string;
  suggestion: string;
}
