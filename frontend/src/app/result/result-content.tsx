'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useSimulationStore } from '@/stores/simulation-store';
import * as api from '@/services/api';
import ResultCard from '@/components/ResultCard';
import type { GroupResult } from '@/types/simulation';

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
        {/* Title — Tekken 8 skewed pink banner */}
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

        {/* Subtitle in pink */}
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

        {/* Results list */}
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
          <div className="space-y-4">
            {sortedResults.map((result, index) => (
              <ResultCard
                key={result.groupId}
                result={result}
                rank={index + 1}
              />
            ))}
          </div>
        )}

        {/* Cyan divider */}
        <div
          className="mx-auto mt-10 mb-8 w-full max-w-md"
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--tk-cyan-40), transparent)',
          }}
        />

        {/* Back button */}
        <div className="flex justify-center">
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
