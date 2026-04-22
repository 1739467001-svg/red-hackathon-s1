import React, { Suspense } from 'react';
import ReportContent from './report-content';

function ReportFallback() {
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

export default function ReportPage() {
  return (
    <Suspense fallback={<ReportFallback />}>
      <ReportContent />
    </Suspense>
  );
}
