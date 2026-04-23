'use client';

export const PHASE_TABS = [
  { id: 0, short: '分组',   full: '队伍分配',   phase: 0 },
  { id: 1, short: '讨论',   full: '自由讨论',   phase: 1 },
  { id: 2, short: '开发',   full: '开发阶段',   phase: 2 },
  { id: 3, short: '成果',   full: '成果展示',   phase: 3 },
  { id: 4, short: '评分',   full: '评委评分',   phase: 4 },
  { id: 5, short: '公示',   full: '结果公示',   phase: 5 },
] as const;

export type PhaseTabId = (typeof PHASE_TABS)[number]['id'];

interface PhaseIndicatorProps {
  currentPhase: number;
  activeTab: PhaseTabId;
  onTabChange: (tab: PhaseTabId) => void;
}

export function PhaseIndicator({ currentPhase, activeTab, onTabChange }: PhaseIndicatorProps) {
  return (
    <div
      className="w-full shrink-0"
      style={{
        backgroundColor: 'var(--tk-bg)',
        borderBottom: '1px solid var(--tk-cyan-15)',
      }}
    >
      <div className="flex items-stretch overflow-x-auto custom-scrollbar">
        {PHASE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          // A tab is unlocked if the simulation has reached its phase
          const isUnlocked = currentPhase >= tab.phase;
          // Tab 3/4/5 all require phase 3
          const isReached = currentPhase >= tab.phase;
          // Currently running indicator: the phase is exactly at this tab's phase
          const isRunning = currentPhase === tab.phase;

          return (
            <button
              key={tab.id}
              type="button"
              disabled={!isReached}
              onClick={() => isReached && onTabChange(tab.id)}
              className="relative flex flex-col items-start justify-center gap-0.5 px-5 py-3 transition-all duration-200 shrink-0"
              style={{
                fontFamily: 'var(--rs-font-display)',
                borderRight: '1px solid var(--tk-cyan-10)',
                backgroundColor: isActive
                  ? 'rgba(0, 230, 255, 0.06)'
                  : 'transparent',
                cursor: isReached ? 'pointer' : 'not-allowed',
                opacity: isReached ? 1 : 0.35,
                borderBottom: isActive
                  ? '2px solid var(--tk-cyan)'
                  : '2px solid transparent',
                minWidth: '90px',
              }}
              onMouseEnter={(e) => {
                if (isReached && !isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(0,230,255,0.03)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Running pulse dot */}
              {isRunning && (
                <span
                  className="absolute top-2 right-2 h-1.5 w-1.5"
                  style={{
                    backgroundColor: 'var(--tk-cyan)',
                    animation: 'pulse 2s ease-in-out infinite',
                    borderRadius: '0px',
                  }}
                />
              )}

              {/* Short label */}
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                  color: isActive
                    ? 'var(--tk-cyan)'
                    : isReached
                    ? 'var(--rs-white)'
                    : 'var(--rs-gray)',
                }}
              >
                {tab.short}
              </span>

              {/* Full description */}
              <span
                style={{
                  fontFamily: 'var(--rs-font-mono)',
                  fontSize: '0.65rem',
                  letterSpacing: '1px',
                  color: isActive ? 'var(--tk-cyan)' : 'var(--rs-gray)',
                  opacity: 0.8,
                }}
              >
                {isReached ? tab.full : '未开始'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
