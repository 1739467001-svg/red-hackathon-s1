import { Suspense } from 'react';
import ResultContent from './result-content';

function ResultFallback() {
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

export default function ResultPage() {
  return (
    <Suspense fallback={<ResultFallback />}>
      <ResultContent />
    </Suspense>
  );
}
