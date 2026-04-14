'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { GroupResult } from '@/types/simulation';
import BPDocument from './BPDocument';

interface ResultCardProps {
  result: GroupResult;
  rank: number;
}

function getRankBorderColor(rank: number): string {
  if (rank === 1) return 'var(--tk-pink)';
  if (rank <= 3) return 'var(--tk-cyan)';
  return 'var(--tk-cyan-20)';
}

function getRankLabel(rank: number): string {
  if (rank === 1) return '1ST';
  if (rank === 2) return '2ND';
  if (rank === 3) return '3RD';
  return `${rank}TH`;
}

const DIMENSION_LABELS: { key: string; label: string }[] = [
  { key: 'innovation', label: '创新' },
  { key: 'presentation', label: '讲述' },
  { key: 'completeness', label: '完成' },
  { key: 'businessPotential', label: '商业' },
  { key: 'techDifficulty', label: '技术' },
];

export default function ResultCard({ result, rank }: ResultCardProps) {
  const [expanded, setExpanded] = useState(rank === 1);

  const borderColor = getRankBorderColor(rank);

  return (
    <div
      className="overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: 'rgba(2, 1, 8, 0.7)',
        border: `1px solid ${borderColor}`,
        borderRadius: '0px',
        boxShadow: rank === 1 ? '0 0 20px var(--tk-pink-glow)' : rank <= 3 ? '0 0 10px var(--tk-cyan-glow)' : 'none',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors duration-200"
        style={{ backgroundColor: 'transparent' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--tk-cyan-10)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {/* Rank badge — pink for 1st, cyan for others */}
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center"
          style={{
            fontFamily: 'var(--rs-font-mono)',
            fontSize: '12px',
            fontWeight: 700,
            color: '#fff',
            backgroundColor: rank === 1 ? 'var(--tk-pink)' : 'transparent',
            border: `1px solid ${borderColor}`,
            letterSpacing: '1px',
            borderRadius: '0px',
            transform: 'skewX(-8deg)',
          }}
        >
          {getRankLabel(rank)}
        </div>

        {/* Project name */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className="text-xs"
              style={{
                fontFamily: 'var(--rs-font-mono)',
                color: 'var(--tk-cyan)',
                letterSpacing: '1px',
              }}
            >
              {`第${rank}名`}
            </span>
            <span
              className="truncate text-lg"
              style={{
                fontFamily: 'var(--rs-font-display)',
                color: '#fff',
                fontWeight: 400,
              }}
            >
              {result.bpDocument.projectName || `小组 ${result.groupId}`}
            </span>
          </div>
        </div>

        {/* Total score */}
        <div
          className="flex-shrink-0 text-right"
          style={{
            fontFamily: 'var(--rs-font-mono)',
            fontSize: '16px',
            fontWeight: 700,
            color: rank === 1 ? 'var(--tk-pink)' : 'var(--tk-cyan)',
          }}
        >
          {result.totalScore.toFixed(1)}
        </div>

        {/* Expand toggle */}
        <div style={{ color: 'var(--tk-cyan)' }} className="flex-shrink-0">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Expandable content */}
      <div
        className="transition-[grid-template-rows] duration-200"
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
        }}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 px-5 py-4">
            {/* BP Document */}
            <div>
              <h3
                className="mb-2 text-xs uppercase"
                style={{
                  fontFamily: 'var(--rs-font-display)',
                  color: 'var(--tk-cyan)',
                  letterSpacing: '2px',
                }}
              >
                BP 文档
              </h3>
              <BPDocument bp={result.bpDocument} />
            </div>

            {/* Judge scores */}
            <div>
              <h3
                className="mb-3 text-xs uppercase"
                style={{
                  fontFamily: 'var(--rs-font-display)',
                  color: 'var(--tk-cyan)',
                  letterSpacing: '2px',
                }}
              >
                评委评分
              </h3>

              <div className="space-y-3">
                {result.scores.map((judge) => (
                  <div
                    key={judge.judgeId}
                    className="px-4 py-3"
                    style={{
                      backgroundColor: 'rgba(2, 1, 8, 0.5)',
                      border: '1px solid var(--tk-cyan-15)',
                      borderRadius: '0px',
                    }}
                  >
                    {/* Judge name */}
                    <div
                      className="mb-2 text-sm"
                      style={{
                        fontFamily: 'var(--rs-font-display)',
                        color: '#fff',
                        letterSpacing: '1px',
                      }}
                    >
                      {judge.judgeName}
                    </div>

                    {/* Dimension scores row */}
                    <div className="mb-3 flex flex-wrap gap-2">
                      {DIMENSION_LABELS.map((dim) => {
                        const score = judge[
                          dim.key as keyof typeof judge
                        ] as number;
                        return (
                          <div
                            key={dim.key}
                            className="flex items-center gap-1"
                          >
                            <span
                              className="text-xs"
                              style={{
                                fontFamily: 'var(--rs-font-mono)',
                                color: 'var(--rs-gray)',
                              }}
                            >
                              {dim.label}
                            </span>
                            <span
                              className="inline-flex h-6 w-6 items-center justify-center text-xs font-bold"
                              style={{
                                fontFamily: 'var(--rs-font-mono)',
                                backgroundColor: 'var(--tk-cyan-10)',
                                color: 'var(--tk-cyan)',
                                border: '1px solid var(--tk-cyan-20)',
                                borderRadius: '0px',
                              }}
                            >
                              {score}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Comment */}
                    {judge.comment && (
                      <p
                        className="mb-2 text-sm leading-relaxed whitespace-pre-wrap"
                        style={{
                          fontFamily: 'var(--rs-font-mono)',
                          color: 'var(--rs-gray-light)',
                        }}
                      >
                        {judge.comment}
                      </p>
                    )}

                    {/* Suggestion */}
                    {judge.suggestion && (
                      <p
                        className="text-sm leading-relaxed whitespace-pre-wrap"
                        style={{
                          fontFamily: 'var(--rs-font-mono)',
                          color: 'var(--rs-gray)',
                          borderLeft: '2px solid var(--tk-pink)',
                          paddingLeft: '12px',
                        }}
                      >
                        {judge.suggestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
