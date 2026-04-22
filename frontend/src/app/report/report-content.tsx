'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, Medal, Star, Printer } from 'lucide-react';
import { useSimulationStore } from '@/stores/simulation-store';
import * as api from '@/services/api';
import type { SimulationReport, ReportGroupEntry, AwardTier } from '@/types/simulation';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DIMENSION_LABELS = [
  { key: 'innovation', label: '创新性', en: 'Innovation' },
  { key: 'presentation', label: '讲述效果', en: 'Presentation' },
  { key: 'completeness', label: '完成度', en: 'Completeness' },
  { key: 'businessPotential', label: '商业潜力', en: 'Business' },
  { key: 'techDifficulty', label: '技术难度', en: 'Tech' },
];

const BP_SECTIONS = [
  { key: 'projectName', label: '项目名称' },
  { key: 'problem', label: '问题与痛点' },
  { key: 'solution', label: '解决方案' },
  { key: 'targetUsers', label: '目标用户' },
  { key: 'features', label: '核心功能' },
  { key: 'businessModel', label: '商业模式' },
  { key: 'advantage', label: '竞争优势' },
];

const TRACK_LABELS: Record<string, string> = {
  software: '软件赛道',
  hardware: '硬件赛道',
};

const AWARD_STYLES: Record<AwardTier, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  gold: {
    icon: <Trophy size={20} />,
    color: '#f50a64',
    bg: 'rgba(245,10,100,0.12)',
    label: '冠军',
  },
  silver: {
    icon: <Medal size={20} />,
    color: 'var(--tk-cyan)',
    bg: 'rgba(63,209,231,0.1)',
    label: '亚军',
  },
  bronze: {
    icon: <Star size={20} />,
    color: 'rgba(255,215,0,0.9)',
    bg: 'rgba(255,215,0,0.08)',
    label: '季军',
  },
  honorable: {
    icon: <Star size={18} />,
    color: 'var(--rs-gray-light)',
    bg: 'rgba(255,255,255,0.04)',
    label: '优秀奖',
  },
};

/* ------------------------------------------------------------------ */
/*  Score bar component                                                */
/* ------------------------------------------------------------------ */

function ScoreBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 80 ? 'var(--tk-pink)' : pct >= 60 ? 'var(--tk-cyan)' : 'var(--rs-gray)';
  return (
    <div className="flex items-center gap-2">
      <div
        style={{
          flex: 1,
          height: '4px',
          background: 'var(--tk-cyan-10)',
          borderRadius: '0px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--rs-font-mono)',
          fontSize: '11px',
          color,
          minWidth: '24px',
          textAlign: 'right',
        }}
      >
        {value.toFixed(1)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Group Report Card                                                  */
/* ------------------------------------------------------------------ */

function GroupReportCard({ group }: { group: ReportGroupEntry }) {
  const awardStyle = AWARD_STYLES[group.award.tier];
  const [expanded, setExpanded] = useState(group.rank <= 3);

  return (
    <div
      className="mb-8 overflow-hidden"
      style={{
        border: `1px solid ${awardStyle.color}`,
        backgroundColor: 'rgba(2,1,8,0.8)',
        backdropFilter: 'blur(4px)',
        boxShadow: group.rank === 1 ? `0 0 30px rgba(245,10,100,0.2)` : 'none',
      }}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-4 px-6 py-4 cursor-pointer"
        style={{ background: awardStyle.bg }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Rank badge */}
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center"
          style={{
            fontFamily: 'var(--rs-font-mono)',
            fontSize: '13px',
            fontWeight: 700,
            color: '#fff',
            backgroundColor: awardStyle.color,
            transform: 'skewX(-8deg)',
          }}
        >
          <span style={{ transform: 'skewX(8deg)' }}>#{group.rank}</span>
        </div>

        {/* Award label + project name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: awardStyle.color }}>{awardStyle.icon}</span>
            <span
              style={{
                fontFamily: 'var(--rs-font-mono)',
                fontSize: '11px',
                color: awardStyle.color,
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              {group.award.label}
            </span>
            <span
              style={{
                fontFamily: 'var(--rs-font-mono)',
                fontSize: '10px',
                color: 'var(--rs-gray)',
                letterSpacing: '1px',
              }}
            >
              · {TRACK_LABELS[group.track] || group.track}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--rs-font-display)',
              fontSize: '20px',
              color: '#fff',
              letterSpacing: '2px',
              fontWeight: 400,
            }}
          >
            {group.bpDocument.projectName || `第 ${group.groupId} 组`}
          </div>
          <div
            style={{
              fontFamily: 'var(--rs-font-mono)',
              fontSize: '11px',
              color: 'var(--rs-gray)',
              marginTop: '4px',
            }}
          >
            创意来源：{group.idea}
          </div>
        </div>

        {/* Total score */}
        <div className="flex-shrink-0 text-right">
          <div
            style={{
              fontFamily: 'var(--rs-font-mono)',
              fontSize: '32px',
              fontWeight: 700,
              color: awardStyle.color,
              lineHeight: 1,
            }}
          >
            {group.totalScore.toFixed(1)}
          </div>
          <div
            style={{
              fontFamily: 'var(--rs-font-mono)',
              fontSize: '9px',
              color: 'var(--rs-gray)',
              letterSpacing: '2px',
            }}
          >
            TOTAL
          </div>
        </div>
      </div>

      {/* Dimension averages bar chart */}
      <div
        className="px-6 py-3"
        style={{ borderTop: `1px solid ${awardStyle.color}22` }}
      >
        <div
          style={{
            fontFamily: 'var(--rs-font-mono)',
            fontSize: '10px',
            color: 'var(--rs-gray)',
            letterSpacing: '2px',
            marginBottom: '8px',
          }}
        >
          DIMENSION AVERAGES
        </div>
        <div className="grid grid-cols-5 gap-3">
          {DIMENSION_LABELS.map((dim) => (
            <div key={dim.key}>
              <div
                style={{
                  fontFamily: 'var(--rs-font-mono)',
                  fontSize: '9px',
                  color: 'var(--rs-gray)',
                  letterSpacing: '1px',
                  marginBottom: '4px',
                }}
              >
                {dim.en}
              </div>
              <ScoreBar
                value={group.dimensionAverages[dim.key as keyof typeof group.dimensionAverages]}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div
          className="px-6 py-4 space-y-6"
          style={{ borderTop: `1px solid ${awardStyle.color}22` }}
        >
          {/* BP Document */}
          <div>
            <div
              className="mb-3 flex items-center gap-2"
              style={{
                fontFamily: 'var(--rs-font-mono)',
                fontSize: '11px',
                color: 'var(--tk-cyan)',
                letterSpacing: '3px',
                textTransform: 'uppercase',
              }}
            >
              <div style={{ width: '2px', height: '12px', background: 'var(--tk-cyan)' }} />
              商业计划书 (BP)
            </div>
            <div className="space-y-2">
              {BP_SECTIONS.map((sec) => {
                const val = group.bpDocument[sec.key as keyof typeof group.bpDocument];
                if (!val) return null;
                return (
                  <div
                    key={sec.key}
                    className="flex gap-3"
                    style={{
                      borderLeft: '2px solid var(--tk-cyan-20)',
                      paddingLeft: '12px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--rs-font-mono)',
                        fontSize: '10px',
                        color: 'var(--tk-cyan)',
                        letterSpacing: '1px',
                        flexShrink: 0,
                        width: '72px',
                        paddingTop: '2px',
                      }}
                    >
                      {sec.label}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--rs-font-mono)',
                        fontSize: '12px',
                        color: 'var(--rs-gray-light)',
                        lineHeight: 1.6,
                      }}
                    >
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Judge scores */}
          <div>
            <div
              className="mb-3 flex items-center gap-2"
              style={{
                fontFamily: 'var(--rs-font-mono)',
                fontSize: '11px',
                color: 'var(--tk-cyan)',
                letterSpacing: '3px',
                textTransform: 'uppercase',
              }}
            >
              <div style={{ width: '2px', height: '12px', background: 'var(--tk-cyan)' }} />
              评委点评
            </div>
            <div className="space-y-3">
              {group.scores.map((judge) => (
                <div
                  key={judge.judgeId}
                  className="px-4 py-3"
                  style={{
                    backgroundColor: 'rgba(2,1,8,0.5)',
                    border: '1px solid var(--tk-cyan-15)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      style={{
                        fontFamily: 'var(--rs-font-display)',
                        fontSize: '13px',
                        color: '#fff',
                        letterSpacing: '1px',
                      }}
                    >
                      {judge.judgeName}
                    </span>
                    <div className="flex gap-2">
                      {DIMENSION_LABELS.map((dim) => (
                        <div key={dim.key} className="flex items-center gap-1">
                          <span
                            style={{
                              fontFamily: 'var(--rs-font-mono)',
                              fontSize: '9px',
                              color: 'var(--rs-gray)',
                            }}
                          >
                            {dim.en.slice(0, 3)}
                          </span>
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center"
                            style={{
                              fontFamily: 'var(--rs-font-mono)',
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: 'var(--tk-cyan-10)',
                              color: 'var(--tk-cyan)',
                              border: '1px solid var(--tk-cyan-20)',
                            }}
                          >
                            {judge[dim.key as keyof typeof judge] as number}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {judge.comment && (
                    <p
                      className="mb-2 text-xs leading-relaxed"
                      style={{
                        fontFamily: 'var(--rs-font-mono)',
                        color: 'var(--rs-gray-light)',
                      }}
                    >
                      {judge.comment}
                    </p>
                  )}
                  {judge.suggestion && (
                    <p
                      className="text-xs leading-relaxed"
                      style={{
                        fontFamily: 'var(--rs-font-mono)',
                        color: 'var(--rs-gray)',
                        borderLeft: '2px solid var(--tk-pink)',
                        paddingLeft: '10px',
                      }}
                    >
                      建议：{judge.suggestion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main ReportContent                                                 */
/* ------------------------------------------------------------------ */

export default function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeSimulationId = useSimulationStore((s) => s.simulationId);

  const simulationId = searchParams.get('id') || storeSimulationId;

  const [report, setReport] = useState<SimulationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    if (!simulationId) {
      router.replace('/');
      return;
    }
    hasFetched.current = true;
    setLoading(true);
    api
      .getSimulationReport(simulationId)
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch(() => {
        setError('无法加载报告数据，请确认模拟已完成');
        setLoading(false);
      });
  }, [simulationId, router]);

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ position: 'relative', zIndex: 2 }}
      >
        <p
          style={{
            fontFamily: 'var(--rs-font-mono)',
            color: 'var(--tk-cyan)',
            letterSpacing: '3px',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        >
          GENERATING REPORT...
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-6"
        style={{ position: 'relative', zIndex: 2 }}
      >
        <p
          className="text-sm"
          style={{ fontFamily: 'var(--rs-font-mono)', color: 'var(--tk-pink)' }}
        >
          {error || '报告数据不可用'}
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="tk-btn-outline cursor-pointer"
        >
          <span>返回</span>
        </button>
      </div>
    );
  }

  const createdDate = new Date(report.createdAt).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="min-h-screen px-4 py-12"
      style={{ position: 'relative', zIndex: 2 }}
    >
      <div className="mx-auto max-w-5xl">

        {/* ===== Report Header ===== */}
        <div className="mb-10 text-center">
          <div
            style={{
              fontFamily: 'var(--rs-font-mono)',
              fontSize: '11px',
              color: 'var(--tk-cyan)',
              letterSpacing: '4px',
              marginBottom: '8px',
            }}
          >
            SIMULATION REPORT
          </div>
          <h1
            style={{
              fontFamily: 'var(--rs-font-display)',
              fontWeight: 500,
              fontSize: '52px',
              letterSpacing: '10px',
              color: '#fff',
              textShadow: '0 0 40px rgba(245, 10, 100, 0.4)',
              marginBottom: '8px',
            }}
          >
            HinH
          </h1>
          <div
            style={{
              fontFamily: 'var(--rs-font-mono)',
              fontSize: '12px',
              color: 'var(--rs-gray)',
              letterSpacing: '2px',
            }}
          >
            {createdDate} · {report.totalGroups} 支队伍参赛
          </div>
        </div>

        {/* Cyan divider */}
        <div
          className="mx-auto mb-10 w-full"
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--tk-cyan-40), transparent)',
          }}
        />

        {/* ===== Ideas Summary ===== */}
        <div className="mb-10">
          <div
            className="mb-4 flex items-center gap-2"
            style={{
              fontFamily: 'var(--rs-font-mono)',
              fontSize: '11px',
              color: 'var(--tk-cyan)',
              letterSpacing: '3px',
            }}
          >
            <div style={{ width: '2px', height: '12px', background: 'var(--tk-cyan)' }} />
            本次参赛创意
          </div>
          <div className="flex flex-wrap gap-3">
            {report.ideas.map((idea, i) => (
              <div
                key={i}
                className="px-4 py-2"
                style={{
                  fontFamily: 'var(--rs-font-mono)',
                  fontSize: '12px',
                  color: '#fff',
                  border: '1px solid var(--tk-cyan-20)',
                  backgroundColor: 'var(--tk-cyan-10)',
                }}
              >
                <span style={{ color: 'var(--tk-cyan)', marginRight: '8px' }}>#{i + 1}</span>
                {idea}
              </div>
            ))}
          </div>
        </div>

        {/* ===== Winner Highlight ===== */}
        <div
          className="mb-10 px-6 py-6"
          style={{
            border: '1px solid var(--tk-pink)',
            background: 'linear-gradient(135deg, rgba(245,10,100,0.08) 0%, rgba(2,1,8,0.9) 60%)',
            boxShadow: '0 0 40px rgba(245,10,100,0.15)',
          }}
        >
          <div className="flex items-center gap-4">
            <Trophy size={40} style={{ color: 'var(--tk-pink)', flexShrink: 0 }} />
            <div>
              <div
                style={{
                  fontFamily: 'var(--rs-font-mono)',
                  fontSize: '11px',
                  color: 'var(--tk-pink)',
                  letterSpacing: '4px',
                  marginBottom: '4px',
                }}
              >
                🏆 CHAMPION · 冠军
              </div>
              <div
                style={{
                  fontFamily: 'var(--rs-font-display)',
                  fontSize: '28px',
                  color: '#fff',
                  letterSpacing: '4px',
                  fontWeight: 400,
                }}
              >
                {report.winner.projectName}
              </div>
              <div
                style={{
                  fontFamily: 'var(--rs-font-mono)',
                  fontSize: '11px',
                  color: 'var(--rs-gray)',
                  marginTop: '4px',
                }}
              >
                第 {report.winner.groupId} 组 · 总分 {report.winner.totalScore.toFixed(1)} 分
              </div>
            </div>
          </div>
        </div>

        {/* ===== Awards Summary ===== */}
        <div className="mb-10">
          <div
            className="mb-4 flex items-center gap-2"
            style={{
              fontFamily: 'var(--rs-font-mono)',
              fontSize: '11px',
              color: 'var(--tk-cyan)',
              letterSpacing: '3px',
            }}
          >
            <div style={{ width: '2px', height: '12px', background: 'var(--tk-cyan)' }} />
            获奖名单
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {report.awards.map((award) => {
              const style = AWARD_STYLES[award.tier];
              return (
                <div
                  key={award.groupId}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    border: `1px solid ${style.color}44`,
                    backgroundColor: style.bg,
                  }}
                >
                  <span style={{ color: style.color }}>{style.icon}</span>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--rs-font-mono)',
                        fontSize: '10px',
                        color: style.color,
                        letterSpacing: '2px',
                      }}
                    >
                      {award.label}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--rs-font-display)',
                        fontSize: '14px',
                        color: '#fff',
                      }}
                    >
                      {award.projectName}
                    </div>
                  </div>
                  <div
                    className="ml-auto"
                    style={{
                      fontFamily: 'var(--rs-font-mono)',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: style.color,
                    }}
                  >
                    {award.totalScore.toFixed(1)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cyan divider */}
        <div
          className="mx-auto mb-10 w-full"
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--tk-cyan-40), transparent)',
          }}
        />

        {/* ===== Detailed Group Reports ===== */}
        <div className="mb-4 flex items-center gap-2">
          <div style={{ width: '2px', height: '16px', background: 'var(--tk-pink)' }} />
          <span
            style={{
              fontFamily: 'var(--rs-font-mono)',
              fontSize: '11px',
              color: 'var(--tk-pink)',
              letterSpacing: '3px',
              textTransform: 'uppercase',
            }}
          >
            详细评审报告
          </span>
        </div>

        {report.groups.map((group) => (
          <GroupReportCard key={group.groupId} group={group} />
        ))}

        {/* Cyan divider */}
        <div
          className="mx-auto mt-4 mb-8 w-full"
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--tk-cyan-40), transparent)',
          }}
        />

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={() => window.print()}
            className="tk-btn cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Printer size={16} />
              打印 / 保存 PDF
            </span>
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="tk-btn-outline cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft size={14} />
              返回结果页
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
