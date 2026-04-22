'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, FileText } from 'lucide-react';
import { useSimulationStore } from '@/stores/simulation-store';
import * as api from '@/services/api';
import ResultCard from '@/components/ResultCard';
import type { GroupResult } from '@/types/simulation';

/* ------------------------------------------------------------------ */
/*  Podium — top 3 award display                                       */
/* ------------------------------------------------------------------ */

const AWARD_COLORS = {
  1: { border: 'var(--tk-pink)', glow: 'var(--tk-pink-glow)', label: '冠军', badge: '#f50a64' },
  2: { border: 'var(--tk-cyan)', glow: 'var(--tk-cyan-glow)', label: '亚军', badge: 'var(--tk-cyan)' },
  3: { border: 'rgba(255,215,0,0.8)', glow: 'rgba(255,215,0,0.3)', label: '季军', badge: 'rgba(255,215,0,0.9)' },
};

function PodiumCard({ result, rank }: { result: GroupResult; rank: number }) {
  const colors = AWARD_COLORS[rank as keyof typeof AWARD_COLORS];
  const heights = { 1: 140, 2: 100, 3: 80 };
  const podiumH = heights[rank as keyof typeof heights];

  return (
    <div className="flex flex-col items-center" style={{ flex: 1, maxWidth: 260 }}>
      {/* Award card */}
      <div
        className="w-full mb-0 px-4 py-4 text-center"
        style={{
          backgroundColor: 'rgba(2,1,8,0.85)',
          border: `1px solid ${colors.border}`,
          boxShadow: `0 0 20px ${colors.glow}`,
          backdropFilter: 'blur(4px)',
        }}
      >
        {/* Trophy icon */}
        <div className="flex justify-center mb-2">
          <Trophy size={28} style={{ color: colors.badge }} />
        </div>
        {/* Award label */}
        <div
          className="mb-1"
          style={{
            fontFamily: 'var(--rs-font-display)',
            fontSize: '22px',
            fontWeight: 600,
            color: colors.badge,
            letterSpacing: '4px',
          }}
        >
          {colors.label}
        </div>
        {/* Project name */}
        <div
          style={{
            fontFamily: 'var(--rs-font-display)',
            fontSize: '14px',
            color: '#fff',
            letterSpacing: '2px',
            marginBottom: '8px',
            lineHeight: 1.3,
          }}
        >
          {result.bpDocument.projectName || `第 ${result.groupId} 组`}
        </div>
        {/* Score */}
        <div
          style={{
            fontFamily: 'var(--rs-font-mono)',
            fontSize: '24px',
            fontWeight: 700,
            color: colors.border,
          }}
        >
          {result.totalScore.toFixed(1)}
        </div>
        <div
          style={{
            fontFamily: 'var(--rs-font-mono)',
            fontSize: '10px',
            color: 'var(--rs-gray)',
            letterSpacing: '2px',
          }}
        >
          TOTAL SCORE
        </div>
      </div>

      {/* Podium base */}
      <div
        className="w-full flex items-center justify-center"
        style={{
          height: podiumH,
          background: `linear-gradient(180deg, ${colors.badge}22 0%, ${colors.badge}08 100%)`,
          border: `1px solid ${colors.border}`,
          borderTop: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--rs-font-mono)',
            fontSize: '40px',
            fontWeight: 700,
            color: colors.badge,
            opacity: 0.4,
          }}
        >
          {rank}
        </span>
      </div>
    </div>
  );
}

function Podium({ sorted }: { sorted: GroupResult[] }) {
  if (sorted.length < 1) return null;

  // Reorder for podium display: 2nd, 1st, 3rd
  const podiumOrder = [
    sorted[1] ? { result: sorted[1], rank: 2 } : null,
    sorted[0] ? { result: sorted[0], rank: 1 } : null,
    sorted[2] ? { result: sorted[2], rank: 3 } : null,
  ].filter(Boolean) as { result: GroupResult; rank: number }[];

  return (
    <div className="mb-12">
      {/* Section title */}
      <div className="mb-8 text-center">
        <div
          className="inline-block px-8 py-2"
          style={{
            background: 'linear-gradient(135deg, var(--tk-pink) 0%, rgba(245,10,100,0.6) 100%)',
            transform: 'skewX(-12deg)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--rs-font-display)',
              fontSize: '16px',
              letterSpacing: '6px',
              color: '#fff',
              display: 'block',
              transform: 'skewX(12deg)',
            }}
          >
            AWARD CEREMONY
          </span>
        </div>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-3 px-4">
        {podiumOrder.map(({ result, rank }) => (
          <PodiumCard key={result.groupId} result={result} rank={rank} />
        ))}
      </div>

      {/* Cyan divider */}
      <div
        className="mx-auto mt-10 w-full max-w-md"
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--tk-cyan-40), transparent)',
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main ResultContent                                                 */
/* ------------------------------------------------------------------ */

export default function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const storeResults = useSimulationStore((s) => s.results);
  const storeSimulationId = useSimulationStore((s) => s.simulationId);
  const setResults = useSimulationStore((s) => s.setResults);
  const reset = useSimulationStore((s) => s.reset);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulationId = searchParams.get('id') || storeSimulationId;

  const hasFetched = useRef(false);
  useEffect(() => {
    if (storeResults.length > 0 || hasFetched.current) return;
    if (!simulationId) {
      router.replace('/');
      return;
    }
    hasFetched.current = true;
    let cancelled = false;
    api
      .getSimulationResult(simulationId)
      .then((data) => {
        if (!cancelled) setResults(data.results);
      })
      .catch(() => {
        if (!cancelled) setError('无法加载结果数据');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [simulationId, storeResults.length, setResults, router]);

  const sortedResults: GroupResult[] = useMemo(
    () => [...storeResults].sort((a, b) => b.totalScore - a.totalScore),
    [storeResults],
  );

  function handleBackHome() {
    reset();
    router.push('/');
  }

  function handleViewReport() {
    if (simulationId) {
      router.push(`/report?id=${simulationId}`);
    }
  }

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
          LOADING...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-6"
        style={{ position: 'relative', zIndex: 2 }}
      >
        <p
          className="text-sm"
          style={{
            fontFamily: 'var(--rs-font-mono)',
            color: 'var(--tk-pink)',
          }}
        >
          {error}
        </p>
        <button
          type="button"
          onClick={handleBackHome}
          className="tk-btn-outline cursor-pointer"
        >
          <span>返回首页</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-12"
      style={{ position: 'relative', zIndex: 2 }}
    >
      <div className="mx-auto max-w-5xl">
        {/* Title */}
        <div className="mb-2 text-center">
          <h1
            style={{
              fontFamily: 'var(--rs-font-display)',
              fontWeight: 500,
              fontSize: '48px',
              letterSpacing: '8px',
              color: '#fff',
              textShadow: '0 0 30px rgba(245, 10, 100, 0.3)',
            }}
          >
            HinH
          </h1>
        </div>
        <div className="mb-8 flex justify-center">
          <div
            style={{
              display: 'inline-block',
              padding: '4px 24px 6px',
              background: 'var(--tk-pink)',
              transform: 'skewX(-12deg)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--rs-font-display)',
                fontSize: '14px',
                letterSpacing: '4px',
                textTransform: 'uppercase',
                color: '#fff',
                display: 'block',
                transform: 'skewX(12deg)',
              }}
            >
              最终排名
            </span>
          </div>
        </div>

        {/* Cyan divider */}
        <div
          className="mx-auto mb-10 w-full max-w-md"
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--tk-cyan-40), transparent)',
          }}
        />

        {sortedResults.length === 0 ? (
          <p
            className="text-center text-sm"
            style={{
              fontFamily: 'var(--rs-font-mono)',
              color: 'var(--rs-gray)',
            }}
          >
            暂无结果数据
          </p>
        ) : (
          <>
            {/* Podium — top 3 */}
            <Podium sorted={sortedResults} />

            {/* Full ranking list */}
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-3">
                <div
                  style={{
                    width: '3px',
                    height: '16px',
                    background: 'var(--tk-cyan)',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--rs-font-mono)',
                    fontSize: '11px',
                    letterSpacing: '3px',
                    color: 'var(--tk-cyan)',
                    textTransform: 'uppercase',
                  }}
                >
                  完整排名
                </span>
              </div>
              <div className="space-y-4">
                {sortedResults.map((result, index) => (
                  <ResultCard
                    key={result.groupId}
                    result={result}
                    rank={index + 1}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Cyan divider */}
        <div
          className="mx-auto mt-10 mb-8 w-full max-w-md"
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--tk-cyan-40), transparent)',
          }}
        />

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          {simulationId && sortedResults.length > 0 && (
            <button
              type="button"
              onClick={handleViewReport}
              className="tk-btn cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileText size={16} />
                查看完整报告
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={handleBackHome}
            className="tk-btn-outline cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft size={14} />
              返回首页
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
