'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSimulationStore } from '@/stores/simulation-store';
import type { SimulationMessage, TypingAgent, GroupResult } from '@/types/simulation';
import MarkdownContent from './MarkdownContent';
import { getAvatarUrl } from '@/lib/avatar';
import type { PhaseTabId } from './PhaseIndicator';
import type { RankingEntry } from '@/stores/simulation-store';
import { useRouter } from 'next/navigation';

/* ------------------------------------------------------------------ */
/*  Score Card (for judge scoring messages)                            */
/* ------------------------------------------------------------------ */

interface ScoreCardProps {
  msg: SimulationMessage;
}

function ScoreCard({ msg }: ScoreCardProps) {
  const agent = msg.agent;
  if (!agent || !msg.content) return null;

  let score: {
    judgeId?: string;
    judgeName?: string;
    innovation?: number;
    presentation?: number;
    completeness?: number;
    businessPotential?: number;
    techDifficulty?: number;
    comment?: string;
    suggestion?: string;
  } = {};
  try {
    score = JSON.parse(msg.content);
  } catch {
    return null;
  }

  const dimensions = [
    { key: 'innovation', label: '创新性', value: score.innovation ?? 5 },
    { key: 'presentation', label: '讲述效果', value: score.presentation ?? 5 },
    { key: 'completeness', label: '完成度', value: score.completeness ?? 5 },
    { key: 'businessPotential', label: '商业潜力', value: score.businessPotential ?? 5 },
    { key: 'techDifficulty', label: '技术难度', value: score.techDifficulty ?? 5 },
  ];
  const avg = dimensions.reduce((s, d) => s + d.value, 0) / dimensions.length;

  return (
    <div
      className="px-3 py-3"
      style={{ borderBottom: '1px solid var(--tk-cyan-10)', backgroundColor: 'rgba(255,60,120,0.04)' }}
    >
      {/* Judge header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="h-8 w-8 shrink-0 overflow-hidden"
          style={{ border: '1px solid var(--tk-pink)', borderRadius: '0px' }}
        >
          <img src={agent.avatar || getAvatarUrl(agent.id)} alt={agent.name} className="h-full w-full object-cover" />
        </div>
        <span style={{ fontFamily: 'var(--rs-font-display)', color: 'var(--tk-pink)', fontSize: '1rem', fontWeight: 'bold' }}>
          {agent.name}
        </span>
        <span
          className="px-1.5 py-0.5"
          style={{
            fontFamily: 'var(--rs-font-mono)',
            background: 'rgba(255,60,120,0.2)',
            color: 'var(--tk-pink)',
            fontSize: '0.6rem',
            letterSpacing: '1px',
            borderRadius: '0px',
            border: '1px solid var(--tk-pink)',
          }}
        >
          评委评分
        </span>
        <span
          className="ml-auto font-bold tabular-nums"
          style={{
            fontFamily: 'var(--rs-font-mono)',
            color: avg >= 7 ? 'var(--tk-cyan)' : avg >= 5 ? '#f0c040' : 'var(--tk-pink)',
            fontSize: '1.1rem',
          }}
        >
          {avg.toFixed(1)}
          <span style={{ fontSize: '0.65rem', color: 'var(--rs-gray)', marginLeft: '2px' }}>/10</span>
        </span>
      </div>

      {/* Score bars */}
      <div className="space-y-1.5 mb-3">
        {dimensions.map((d) => (
          <div key={d.key} className="flex items-center gap-2">
            <span
              className="w-16 shrink-0 text-right"
              style={{ fontFamily: 'var(--rs-font-mono)', fontSize: '0.65rem', color: 'var(--rs-gray)', letterSpacing: '1px' }}
            >
              {d.label}
            </span>
            <div className="flex-1 h-1.5" style={{ backgroundColor: 'var(--tk-cyan-10)' }}>
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${d.value * 10}%`,
                  backgroundColor: d.value >= 8 ? 'var(--tk-cyan)' : d.value >= 6 ? '#f0c040' : 'var(--tk-pink)',
                }}
              />
            </div>
            <span
              className="w-6 shrink-0 tabular-nums text-right"
              style={{ fontFamily: 'var(--rs-font-mono)', fontSize: '0.75rem', color: 'var(--tk-cyan)' }}
            >
              {d.value}
            </span>
          </div>
        ))}
      </div>

      {/* Comment */}
      {score.comment && (
        <div
          className="px-2 py-1.5 mb-2 text-sm"
          style={{
            fontFamily: 'var(--rs-font-body)',
            color: 'rgba(255,255,255,0.85)',
            backgroundColor: 'rgba(255,60,120,0.08)',
            borderLeft: '2px solid var(--tk-pink)',
            fontSize: '0.8rem',
            lineHeight: '1.5',
          }}
        >
          {score.comment}
        </div>
      )}

      {/* Suggestion */}
      {score.suggestion && (
        <div
          className="text-xs"
          style={{ fontFamily: 'var(--rs-font-mono)', color: 'var(--rs-gray)', fontSize: '0.7rem' }}
        >
          建议：{score.suggestion}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Message Item                                                        */
/* ------------------------------------------------------------------ */

interface MessageItemProps {
  msg: SimulationMessage;
}

function MessageItem({ msg }: MessageItemProps) {
  // 评分消息单独渲染为卡片
  if (msg.type === 'score') {
    return <ScoreCard msg={msg} />;
  }

  const agent = msg.agent;
  if (!agent || !msg.content) return null;

  const isLeader = agent.isLeader;
  const isJudge = agent.role === '评委';

  return (
    <div
      className="flex gap-3 px-3 py-3 transition-colors"
      style={{
        borderBottom: '1px solid var(--tk-cyan-10)',
        backgroundColor: isJudge ? 'rgba(255,60,120,0.04)' : 'transparent',
      }}
    >
      {/* Avatar */}
      <div
        className="h-8 w-8 shrink-0 overflow-hidden"
        style={{
          border: `1px solid ${isJudge ? 'var(--tk-pink)' : 'var(--tk-cyan-20)'}`,
          borderRadius: '0px',
        }}
      >
        <img
          src={agent.avatar || getAvatarUrl(agent.id)}
          alt={agent.name}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span
            className="text-base font-bold truncate"
            style={{
              fontFamily: 'var(--rs-font-display)',
              color: isJudge ? 'var(--tk-pink)' : 'var(--tk-cyan)',
            }}
          >
            {agent.name}
          </span>

          {isLeader && (
            <span
              className="shrink-0 px-1.5 py-0.5"
              style={{
                fontFamily: 'var(--rs-font-mono)',
                background: 'var(--tk-pink)',
                color: '#fff',
                fontSize: '0.6rem',
                letterSpacing: '1px',
                borderRadius: '0px',
              }}
            >
              队长
            </span>
          )}

          {isJudge && (
            <span
              className="shrink-0 px-1.5 py-0.5"
              style={{
                fontFamily: 'var(--rs-font-mono)',
                background: 'rgba(255,60,120,0.2)',
                color: 'var(--tk-pink)',
                fontSize: '0.6rem',
                letterSpacing: '1px',
                borderRadius: '0px',
                border: '1px solid var(--tk-pink)',
              }}
            >
              评委
            </span>
          )}

          {!isJudge && (
            <span
              className="shrink-0 px-1.5 py-0.5 text-xs"
              style={{
                fontFamily: 'var(--rs-font-mono)',
                backgroundColor: 'var(--tk-cyan-10)',
                color: 'var(--tk-cyan)',
                fontSize: '0.65rem',
                letterSpacing: '1px',
                borderRadius: '0px',
              }}
            >
              {agent.role}
            </span>
          )}
        </div>

        <MarkdownContent content={msg.content} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Typing Indicator                                                    */
/* ------------------------------------------------------------------ */

function TypingIndicator({ agent }: { agent: TypingAgent }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - agent.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [agent.startedAt]);

  return (
    <div
      className="flex gap-3 px-3 py-3"
      style={{
        borderBottom: '1px solid var(--tk-cyan-10)',
        backgroundColor: 'transparent',
      }}
    >
      <div
        className="h-8 w-8 shrink-0 overflow-hidden"
        style={{ border: '1px solid var(--tk-cyan-20)', borderRadius: '0px' }}
      >
        <img
          src={getAvatarUrl(agent.agentId)}
          alt={agent.agentName}
          className="h-full w-full object-cover"
          style={{ opacity: 0.7 }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span
            className="text-base font-bold"
            style={{
              fontFamily: 'var(--rs-font-display)',
              color: 'var(--tk-cyan)',
              opacity: 0.8,
            }}
          >
            {agent.agentName}
          </span>
          {agent.isLeader && (
            <span
              className="shrink-0 px-1.5 py-0.5"
              style={{
                fontFamily: 'var(--rs-font-mono)',
                background: 'var(--tk-pink)',
                color: '#fff',
                fontSize: '0.6rem',
                letterSpacing: '1px',
                borderRadius: '0px',
              }}
            >
              队长
            </span>
          )}
          <span
            className="shrink-0 px-1.5 py-0.5"
            style={{
              fontFamily: 'var(--rs-font-mono)',
              backgroundColor: 'var(--tk-cyan-10)',
              color: 'var(--tk-cyan)',
              fontSize: '0.65rem',
              letterSpacing: '1px',
              borderRadius: '0px',
            }}
          >
            {agent.agentRole}
          </span>
          <span
            className="ml-auto text-xs tabular-nums"
            style={{ fontFamily: 'var(--rs-font-mono)', color: 'var(--rs-gray)' }}
          >
            ({elapsed}s)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            style={{
              fontFamily: 'var(--rs-font-mono)',
              color: 'var(--rs-gray)',
              fontSize: '0.75rem',
            }}
          >
            思考中
          </span>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5"
              style={{
                backgroundColor: 'var(--tk-cyan)',
                animation: `blink 1.2s step-end infinite`,
                animationDelay: `${i * 0.4}s`,
                borderRadius: '0px',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ranking Panel (tab 5: 结果公示) — 实时排名 + 导出 Report              */
/* ------------------------------------------------------------------ */

function RankingPanel({ ranking, simulationId }: { ranking: RankingEntry[]; simulationId: string | null }) {
  const router = useRouter();

  const tierColors: Record<string, string> = {
    gold: 'var(--tk-pink)',
    silver: 'var(--tk-cyan)',
    bronze: '#f5a623',
    honorable: 'var(--rs-gray)',
  };

  const tierBg: Record<string, string> = {
    gold: 'rgba(255,60,120,0.08)',
    silver: 'rgba(0,230,255,0.06)',
    bronze: 'rgba(245,166,35,0.06)',
    honorable: 'rgba(255,255,255,0.02)',
  };

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-3 space-y-3">
      <p
        className="text-center mb-4"
        style={{
          fontFamily: 'var(--rs-font-display)',
          color: 'var(--tk-cyan)',
          letterSpacing: '4px',
          fontSize: '0.75rem',
        }}
      >
        ── 最终排名 ──
      </p>

      {ranking.map((r) => (
        <div
          key={r.groupId}
          className="p-3"
          style={{
            border: `1px solid ${tierColors[r.tier] ?? 'var(--tk-cyan-20)'}`,
            backgroundColor: tierBg[r.tier] ?? 'transparent',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              style={{
                fontFamily: 'var(--rs-font-display)',
                fontSize: '1.1rem',
                fontWeight: 900,
                color: tierColors[r.tier] ?? 'var(--rs-white)',
                letterSpacing: '2px',
                minWidth: '28px',
              }}
            >
              #{r.rank}
            </span>
            <div className="flex-1 min-w-0">
              <div
                style={{
                  fontFamily: 'var(--rs-font-display)',
                  color: tierColors[r.tier] ?? 'var(--rs-white)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  letterSpacing: '2px',
                }}
              >
                {r.projectName}
              </div>
              <div
                style={{
                  fontFamily: 'var(--rs-font-mono)',
                  fontSize: '0.65rem',
                  color: 'var(--rs-gray)',
                  letterSpacing: '1px',
                }}
              >
                组 {r.groupId} · {r.label}
              </div>
            </div>
            <span
              style={{
                fontFamily: 'var(--rs-font-mono)',
                color: tierColors[r.tier] ?? 'var(--rs-white)',
                fontSize: '1.2rem',
                fontWeight: 700,
              }}
            >
              {r.totalScore.toFixed(1)}
            </span>
          </div>
        </div>
      ))}

      {/* 导出 Report 按鈕 */}
      {simulationId && (
        <div className="pt-4 space-y-2">
          <button
            type="button"
            onClick={() => router.push(`/report?id=${simulationId}`)}
            className="w-full py-3 text-center transition-all duration-200"
            style={{
              fontFamily: 'var(--rs-font-display)',
              letterSpacing: '3px',
              fontSize: '0.8rem',
              backgroundColor: 'var(--tk-pink)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            导出完整 REPORT
          </button>
          <button
            type="button"
            onClick={() => router.push(`/result?id=${simulationId}`)}
            className="w-full py-2 text-center transition-all duration-200"
            style={{
              fontFamily: 'var(--rs-font-display)',
              letterSpacing: '3px',
              fontSize: '0.75rem',
              backgroundColor: 'transparent',
              color: 'var(--tk-cyan)',
              border: '1px solid var(--tk-cyan-20)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--tk-cyan)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--tk-cyan-20)'; }}
          >
            查看颁奖台
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Result Panel (tab 5: 结果公示)                                      */
/* ------------------------------------------------------------------ */

function ResultPanel({ results }: { results: GroupResult[] }) {
  if (results.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p
          style={{
            fontFamily: 'var(--rs-font-mono)',
            color: 'var(--rs-gray)',
            letterSpacing: '2px',
            fontSize: '0.85rem',
          }}
        >
          等待评审结束...
        </p>
      </div>
    );
  }

  const sorted = [...results].sort((a, b) => b.totalScore - a.totalScore);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-3 space-y-3">
      <p
        className="text-center mb-4"
        style={{
          fontFamily: 'var(--rs-font-display)',
          color: 'var(--tk-cyan)',
          letterSpacing: '4px',
          fontSize: '0.75rem',
        }}
      >
        ── 最终排名 ──
      </p>
      {sorted.map((r, idx) => (
        <div
          key={r.groupId}
          className="p-3"
          style={{
            border: `1px solid ${idx === 0 ? 'var(--tk-pink)' : 'var(--tk-cyan-20)'}`,
            backgroundColor: idx === 0 ? 'rgba(255,60,120,0.06)' : 'rgba(0,230,255,0.03)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: '1.2rem' }}>{medals[idx] ?? `#${idx + 1}`}</span>
            <span
              style={{
                fontFamily: 'var(--rs-font-display)',
                color: idx === 0 ? 'var(--tk-pink)' : 'var(--tk-cyan)',
                fontWeight: 700,
                letterSpacing: '2px',
              }}
            >
              组 {r.groupId}
            </span>
            <span
              className="ml-auto"
              style={{
                fontFamily: 'var(--rs-font-mono)',
                color: idx === 0 ? 'var(--tk-pink)' : 'var(--rs-white)',
                fontSize: '1.1rem',
                fontWeight: 700,
              }}
            >
              {r.totalScore.toFixed(1)}
            </span>
          </div>

          {/* BP title */}
          {r.bpDocument?.projectName && (
            <p
              className="mb-2 truncate"
              style={{
                fontFamily: 'var(--rs-font-mono)',
                color: 'var(--rs-white)',
                fontSize: '0.8rem',
              }}
            >
              {r.bpDocument.projectName}
            </p>
          )}

          {/* Score dimensions */}
          {r.scores && r.scores.length > 0 && (
            <div className="space-y-1">
              {['innovation', 'presentation', 'completeness', 'businessPotential', 'techDifficulty'].map((dim) => {
                const avg =
                  r.scores.reduce((acc: number, s) => acc + ((s as unknown as Record<string, number>)[dim] ?? 0), 0) /
                  r.scores.length;
                const dimLabels: Record<string, string> = {
                  innovation: '创新',
                  presentation: '展示',
                  completeness: '完整',
                  businessPotential: '商业',
                  techDifficulty: '技术',
                };
                return (
                  <div key={dim} className="flex items-center gap-2">
                    <span
                      style={{
                        fontFamily: 'var(--rs-font-mono)',
                        fontSize: '0.6rem',
                        color: 'var(--rs-gray)',
                        width: '28px',
                        letterSpacing: '1px',
                      }}
                    >
                      {dimLabels[dim]}
                    </span>
                    <div
                      className="flex-1 h-1"
                      style={{ backgroundColor: 'var(--tk-cyan-10)' }}
                    >
                      <div
                        style={{
                          width: `${(avg / 10) * 100}%`,
                          height: '100%',
                          backgroundColor: idx === 0 ? 'var(--tk-pink)' : 'var(--tk-cyan)',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--rs-font-mono)',
                        fontSize: '0.65rem',
                        color: 'var(--rs-white)',
                        width: '28px',
                        textAlign: 'right',
                      }}
                    >
                      {avg.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty / Locked Panel                                               */
/* ------------------------------------------------------------------ */

function LockedPanel({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-3">
        <p
          style={{
            fontFamily: 'var(--rs-font-display)',
            color: 'var(--rs-gray)',
            letterSpacing: '3px',
            fontSize: '0.85rem',
          }}
        >
          {label}
        </p>
        <div className="flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2"
              style={{
                backgroundColor: 'var(--tk-cyan)',
                opacity: 0.3,
                animation: `blink 1.5s step-end infinite`,
                animationDelay: `${i * 0.5}s`,
                borderRadius: '0px',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ChatSidebar (main export)                                          */
/* ------------------------------------------------------------------ */

interface ChatSidebarProps {
  activeTab: PhaseTabId;
}

export function ChatSidebar({ activeTab }: ChatSidebarProps) {
  const activeGroupTab = useSimulationStore((s) => s.activeGroupTab);
  const setActiveGroupTab = useSimulationStore((s) => s.setActiveGroupTab);
  const messages = useSimulationStore((s) => s.messages);
  const typingAgents = useSimulationStore((s) => s.typingAgents);
  const groups = useSimulationStore((s) => s.groups);
  const results = useSimulationStore((s) => s.results);
  const ranking = useSimulationStore((s) => s.ranking);
  const simulationId = useSimulationStore((s) => s.simulationId);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const currentPhase = useSimulationStore((s) => s.currentPhase);

  const groupIds = groups.length > 0 ? groups.map((g) => g.groupId) : [];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [lastSeenCounts, setLastSeenCounts] = useState<Record<string, number>>({});

  const getMessagesForGroup = useCallback(
    (groupId: number): SimulationMessage[] => messages.get(groupId) ?? [],
    [messages],
  );

  // Filter messages by tab
  const getFilteredMessages = useCallback(
    (groupId: number): SimulationMessage[] => {
      const all = getMessagesForGroup(groupId);
      if (activeTab === 1) return all.filter((m) => m.phase === 1);
      if (activeTab === 2) return all.filter((m) => m.phase === 2);
      if (activeTab === 3) {
        // 成果展示: phase 3 messages (5人各讲一个方面)
        return all.filter((m) => m.phase === 3);
      }
      if (activeTab === 4) {
        // 评委评分: phase 4 messages (评委提问+组员作答+打分)
        return all.filter((m) => m.phase === 4);
      }
      // tab 0 (分组): show all phase 0 or just a placeholder
      return all.filter((m) => m.phase === 0);
    },
    [getMessagesForGroup, activeTab],
  );

  const currentMessages = getFilteredMessages(activeGroupTab);
  const currentTyping =
    (activeTab === 1 || activeTab === 2 || activeTab === 3 || activeTab === 4)
      ? (typingAgents.get(activeGroupTab) ?? null)
      : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length, currentTyping]);

  function getUnreadCount(groupId: number): number {
    if (groupId === activeGroupTab) return 0;
    const total = getFilteredMessages(groupId).length;
    const lastSeen = lastSeenCounts[`${groupId}-${activeTab}`] ?? 0;
    return Math.max(0, total - lastSeen);
  }

  function hasGroupTyping(groupId: number): boolean {
    return groupId !== activeGroupTab && (typingAgents.get(groupId) ?? null) !== null;
  }

  function handleTabClick(groupId: number) {
    setLastSeenCounts((prev) => ({
      ...prev,
      [`${activeGroupTab}-${activeTab}`]: currentMessages.length,
    }));
    setActiveGroupTab(groupId);
  }

  // Tab 5: 结果公示
  if (activeTab === 5) {
    return (
      <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--tk-bg)' }}>
        {ranking.length > 0 ? (
          <RankingPanel ranking={ranking} simulationId={simulationId} />
        ) : results.length > 0 ? (
          <ResultPanel results={results} />
        ) : (
          <LockedPanel label={isRunning ? '正在统计结果...' : '等待评审结束...'} />
        )}
      </div>
    );
  }

  // Tab 0: 分组 — no messages, just show group info
  if (activeTab === 0) {
    return (
      <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--tk-bg)' }}>
        <LockedPanel label="分组已完成" />
      </div>
    );
  }

  // Tabs 1-4: message view
  const phaseRequired: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4 };
  const required = phaseRequired[activeTab] ?? 1;
  if (currentPhase < required) {
    const labelMap: Record<number, string> = {
      2: '等待开发阶段开始...',
      3: '等待成果展示开始...',
      4: '等待评委评分开始...',
    };
    return (
      <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--tk-bg)' }}>
        <LockedPanel label={labelMap[activeTab] ?? '等待中...'} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--tk-bg)' }}>
      {/* Group Tabs */}
      <div
        className="custom-scrollbar flex shrink-0 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--tk-cyan-15)' }}
      >
        {groupIds.length === 0 ? (
          <div
            className="flex-1 px-2 py-2.5 text-center"
            style={{
              fontFamily: 'var(--rs-font-mono)',
              fontSize: '0.75rem',
              letterSpacing: '2px',
              color: 'var(--rs-gray)',
            }}
          >
            LOADING GROUPS...
          </div>
        ) : (
          groupIds.map((groupId) => {
            const isActive = groupId === activeGroupTab;
            const unread = getUnreadCount(groupId);
            const isTypingInGroup = hasGroupTyping(groupId);
            const manyGroups = groupIds.length > 6;

            return (
              <button
                key={groupId}
                type="button"
                onClick={() => handleTabClick(groupId)}
                className="relative flex-1 cursor-pointer px-2 py-2.5 text-center transition-all duration-200"
                style={{
                  fontFamily: 'var(--rs-font-display)',
                  fontSize: manyGroups ? '0.75rem' : '1rem',
                  letterSpacing: manyGroups ? '1px' : '2px',
                  backgroundColor: 'var(--tk-bg)',
                  color: isActive ? 'var(--tk-cyan)' : 'var(--rs-gray)',
                  border: '1px solid var(--rs-gray-dark)',
                  borderColor: isActive ? 'var(--tk-cyan)' : 'var(--rs-gray-dark)',
                  borderRadius: '0px',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.borderColor = 'var(--tk-cyan-40)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.borderColor = 'var(--rs-gray-dark)';
                }}
              >
                组 {groupId}
                {isTypingInGroup && (
                  <span
                    className="absolute top-0.5 right-0.5 h-2 w-2"
                    style={{
                      backgroundColor: 'var(--tk-cyan)',
                      animation: 'pulse 1.5s ease-in-out infinite',
                      borderRadius: '0px',
                    }}
                  />
                )}
                {unread > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center text-xs"
                    style={{
                      fontFamily: 'var(--rs-font-mono)',
                      backgroundColor: 'var(--tk-pink)',
                      color: '#fff',
                      fontSize: '0.6rem',
                      borderRadius: '0px',
                      minWidth: '1.25rem',
                    }}
                  >
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Messages list */}
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {currentMessages.length === 0 && !currentTyping ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p
                className="text-lg"
                style={{
                  fontFamily: 'var(--rs-font-mono)',
                  color: 'var(--rs-gray)',
                  letterSpacing: '2px',
                }}
              >
                {activeTab === 1 ? '等待讨论开始...' :
                 activeTab === 2 ? '等待开发开始...' :
                 activeTab === 3 ? '等待成果展示...' :
                 '等待评委提问...'}
              </p>
              <div className="mt-4 flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2"
                    style={{
                      backgroundColor: 'var(--tk-cyan)',
                      opacity: 0.4,
                      animation: `blink 1.5s step-end infinite`,
                      animationDelay: `${i * 0.5}s`,
                      borderRadius: '0px',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {currentMessages
              .filter((m) => (m.type === 'message' || m.type === 'tool_call' || m.type === 'score') && m.content)
              .map((msg, idx) =>
                msg.type === 'tool_call' ? (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 text-xs"
                    style={{
                      fontFamily: 'var(--rs-font-mono)',
                      color: 'var(--rs-gray)',
                      backgroundColor: 'var(--tk-msg-bg)',
                      borderBottom: '1px solid var(--tk-cyan-10)',
                    }}
                  >
                    <span style={{ opacity: 0.7 }}>{msg.agent?.name}</span>
                    <span>{msg.content}</span>
                  </div>
                ) : (
                  <MessageItem key={idx} msg={msg} />
                ),
              )}
            {currentTyping && <TypingIndicator agent={currentTyping} />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
