'use client';

const PHASE_LABELS: Record<number, string> = {
  0: '阶段 0 — 分组中...',
  1: '阶段 1 — 自由讨论',
  2: '阶段 2 — 创造产品',
  3: '阶段 3 — 评审答辩',
};

const PHASE_TOOLTIPS: Record<number, string> = {
  0: '分组',
  1: '讨论',
  2: '创造',
  3: '答辩',
};

interface PhaseIndicatorProps {
  currentPhase: number;
}

export function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  const label = PHASE_LABELS[currentPhase] ?? `阶段 ${currentPhase}`;

  return (
    <div
      className="relative w-full overflow-hidden border-b-2"
      style={{
        backgroundColor: '#0F0F23',
        borderColor: '#7C3AED',
        boxShadow: '0 2px 12px rgba(124, 58, 237, 0.3)',
      }}
    >
      {/* Scanline animation overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(124, 58, 237, 0.04) 2px, rgba(124, 58, 237, 0.04) 4px)',
        }}
      />

      <div className="relative flex items-center gap-4 px-6 py-3">
        {/* Pulsing dot */}
        <span className="relative flex h-3 w-3">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ backgroundColor: '#7C3AED' }}
          />
          <span
            className="relative inline-flex h-3 w-3 rounded-full"
            style={{ backgroundColor: '#A78BFA' }}
          />
        </span>

        {/* Phase number */}
        <span
          className="neon-glow-purple text-sm"
          style={{
            fontFamily: 'var(--font-pixel-display)',
            color: '#A78BFA',
          }}
        >
          {currentPhase}
        </span>

        {/* Phase label */}
        <span
          className="text-xl tracking-wide"
          style={{
            fontFamily: 'var(--font-pixel-body)',
            color: '#E2E8F0',
          }}
        >
          {label}
        </span>

        {/* Phase progress dots — right side, with tooltip */}
        <div className="ml-auto flex items-center gap-2">
          <span
            className="text-xs"
            style={{
              fontFamily: 'var(--font-pixel-body)',
              color: '#64748B',
              fontSize: '0.65rem',
            }}
          >
            进度
          </span>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => {
              const isDone = i < currentPhase;
              const isCurrent = i === currentPhase;
              return (
                <div
                  key={i}
                  title={PHASE_TOOLTIPS[i]}
                  className="relative h-2.5 w-2.5 cursor-default transition-all duration-300"
                  style={{
                    backgroundColor: isDone
                      ? '#A78BFA'
                      : isCurrent
                      ? '#7C3AED'
                      : '#1E1E3A',
                    outline: isCurrent ? '1px solid #7C3AED' : 'none',
                    outlineOffset: '2px',
                  }}
                >
                  {/* Tooltip on hover */}
                  <span
                    className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-xs opacity-0 transition-opacity hover:opacity-100 pointer-events-none"
                    style={{
                      backgroundColor: '#1A1A35',
                      color: '#E2E8F0',
                      fontFamily: 'var(--font-pixel-body)',
                      fontSize: '0.6rem',
                      border: '1px solid rgba(124,58,237,0.3)',
                    }}
                  >
                    {PHASE_TOOLTIPS[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
