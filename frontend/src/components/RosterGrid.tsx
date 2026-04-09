'use client';

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import type { GroupInfo, Track } from '@/types/simulation';
import { getAvatarUrl } from '@/lib/avatar';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RosterGridProps {
  groups: GroupInfo[];
  currentPhase: number;
  activeGroupId: number | null;
  speakingAgentId: string | null;
  agentNames?: Map<string, string>;
}

interface CellData {
  characterId: string;
  name: string;
  role: string;
  groupId: number;
  groupName: string;
  track: Track;
  isLeader: boolean;
  avatarUrl: string;
}

/*
 * Visual display stage — decoupled from backend currentPhase.
 *
 *   revealing  → flat grid, cards fade in via pure CSS animation-delay
 *   revealed   → all visible, brief pause, capture FLIP positions
 *   grouping   → DOM switches to grouped layout, FLIP animates cards
 *   marquee    → final: horizontal scrolling per group
 */
type DisplayStage = 'revealing' | 'revealed' | 'grouping' | 'marquee';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STAGGER_MS = 60;         // delay between each card's CSS animation
const ANIMATION_MS = 800;      // tekkenReveal animation duration
const PAUSE_AFTER_REVEAL_MS = 1200;
const FLIP_DURATION_MS = 1200;

const TRACK_LABELS: Record<Track, string> = {
  software: '软件赛道',
  hardware: '硬件赛道',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Hover overlay (rendered inside every card, CSS :hover controls)    */
/* ------------------------------------------------------------------ */

function HoverOverlay({ cell, speakingAgentId }: { cell: CellData; speakingAgentId: string | null }) {
  const isSpeaking = speakingAgentId === cell.characterId;
  return (
    <div className="hover-info-overlay">
      <div style={{ transform: 'skewX(28deg)' }}>
        <p className="font-display font-bold" style={{ fontSize: 13, color: '#fff', marginBottom: 4, lineHeight: 1.2 }}>
          {cell.name}
        </p>
        <p style={{ fontSize: 10, color: 'var(--tk-cyan)', marginBottom: 2 }}>
          {cell.role}{cell.isLeader ? ' · 队长' : ''}
        </p>
        <p style={{ fontSize: 9, color: 'var(--rs-gray-light)' }}>
          {cell.groupName} · {TRACK_LABELS[cell.track]}
        </p>
        {isSpeaking && (
          <p className="font-mono uppercase" style={{ fontSize: 8, color: 'var(--tk-cyan)', letterSpacing: 2, marginTop: 4 }}>
            ● 发言中
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RosterGrid({
  groups,
  currentPhase,
  activeGroupId,
  speakingAgentId,
  agentNames,
}: RosterGridProps) {
  void currentPhase; // visual layout driven by displayStage, not backend phase

  /* ------ derived cell data ------ */
  const cells = useMemo<CellData[]>(() => {
    if (!groups.length) return [];
    const all: CellData[] = [];
    groups.forEach((g) => {
      g.members.forEach((m) => {
        const displayName = agentNames?.get(m.characterId) ?? m.characterId;
        all.push({
          characterId: m.characterId,
          name: displayName,
          role: m.role,
          groupId: g.groupId,
          groupName: `组${g.groupId}`,
          track: g.track,
          isLeader: m.isLeader,
          avatarUrl: getAvatarUrl(m.characterId),
        });
      });
    });
    return all;
  }, [groups, agentNames]);

  const randomCells = useMemo(() => seededShuffle(cells, 42), [cells]);

  const groupedMap = useMemo(() => {
    const byGroup = new Map<number, CellData[]>();
    cells.forEach((c) => {
      const arr = byGroup.get(c.groupId) ?? [];
      arr.push(c);
      byGroup.set(c.groupId, arr);
    });
    return byGroup;
  }, [cells]);

  /* ------ Display stage state machine (pure CSS stagger, no state-driven re-renders) ------ */
  const [displayStage, setDisplayStage] = useState<DisplayStage>('revealing');
  const cellRefs = useRef(new Map<string, HTMLDivElement>());
  const prevPositions = useRef(new Map<string, DOMRect>());

  // Total time for all cards to finish their staggered entrance
  const totalRevealMs = cells.length * STAGGER_MS + ANIMATION_MS;

  // Stage 1→2: After all CSS animations complete, move to 'revealed'
  useEffect(() => {
    if (cells.length === 0 || displayStage !== 'revealing') return;
    const timer = setTimeout(() => {
      setDisplayStage('revealed');
    }, totalRevealMs);
    return () => clearTimeout(timer);
  }, [cells.length, displayStage, totalRevealMs]);

  // Stage 2→3: In 'revealed', capture FLIP positions, pause, then switch to 'grouping'
  useEffect(() => {
    if (displayStage !== 'revealed') return;
    // Capture current flat-grid positions for FLIP
    const positions = new Map<string, DOMRect>();
    cellRefs.current.forEach((el, id) => {
      positions.set(id, el.getBoundingClientRect());
    });
    prevPositions.current = positions;

    const timer = setTimeout(() => {
      setDisplayStage('grouping');
    }, PAUSE_AFTER_REVEAL_MS);
    return () => clearTimeout(timer);
  }, [displayStage]);

  // Stage 3: When 'grouping' renders, run FLIP animation
  const flipRan = useRef(false);
  useEffect(() => {
    if (displayStage !== 'grouping' || flipRan.current) return;
    flipRan.current = true;

    // After one rAF the grouped DOM has painted — measure new positions
    requestAnimationFrame(() => {
      const prev = prevPositions.current;
      cellRefs.current.forEach((el, id) => {
        const oldRect = prev.get(id);
        if (!oldRect) return;
        const newRect = el.getBoundingClientRect();
        const dx = oldRect.left - newRect.left;
        const dy = oldRect.top - newRect.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

        el.style.transition = 'none';
        el.style.transform = `translate(${dx}px, ${dy}px) skewX(-28deg)`;
        el.getBoundingClientRect(); // force reflow

        el.style.transition = `transform ${FLIP_DURATION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
        el.style.transform = 'skewX(-28deg)';
      });
    });

    const timer = setTimeout(() => {
      cellRefs.current.forEach((el) => {
        el.style.transition = '';
        el.style.transform = '';
      });
      setDisplayStage('marquee');
    }, FLIP_DURATION_MS + 200);

    return () => clearTimeout(timer);
  }, [displayStage]);

  /* ------ ref setter ------ */
  const setCellRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) cellRefs.current.set(id, el);
      else cellRefs.current.delete(id);
    },
    [],
  );

  /* ------ empty state ------ */
  if (cells.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="font-mono uppercase" style={{ fontSize: 11, color: 'var(--rs-gray)', letterSpacing: 3 }}>
          Awaiting roster data...
        </span>
      </div>
    );
  }

  /* ------ Stage: revealing / revealed — flat parallelogram grid ------ */
  if (displayStage === 'revealing' || displayStage === 'revealed') {
    return (
      <div className="custom-scrollbar h-full w-full overflow-y-auto overflow-x-hidden" style={{ background: 'var(--tk-bg)' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: 1200,
            margin: '0 auto',
            padding: '20px 40px',
          }}
        >
          {randomCells.map((cell, index) => {
            const isSpeaking = speakingAgentId === cell.characterId;
            const classNames = ['grid-cell', 'active', isSpeaking ? 'focus' : ''].filter(Boolean).join(' ');

            return (
              <div
                key={cell.characterId}
                ref={setCellRef(cell.characterId)}
                className={classNames}
                style={{
                  animation: `tekkenReveal ${ANIMATION_MS}ms ease ${index * STAGGER_MS}ms both`,
                }}
              >
                <div className="grid-cell-inner">
                  <img src={cell.avatarUrl} alt={cell.name} loading="lazy" />
                  <HoverOverlay cell={cell} speakingAgentId={speakingAgentId} />
                </div>
                <div className="name-label"><span>{cell.name}</span></div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ------ Stage: grouping — grouped grid with FLIP animation ------ */
  if (displayStage === 'grouping') {
    return (
      <div className="custom-scrollbar h-full w-full overflow-y-auto overflow-x-hidden" style={{ background: 'var(--tk-bg)' }}>
        <div style={{ padding: '20px 40px' }}>
          {Array.from(groupedMap.entries()).map(([groupId, members]) => {
            const isActive = activeGroupId === groupId;
            return (
              <div key={groupId} style={{ marginBottom: 24 }}>
                <div className="font-mono mb-2 uppercase" style={{ fontSize: 11, letterSpacing: 2, color: isActive ? 'var(--tk-cyan)' : 'var(--rs-gray)' }}>
                  组 {groupId}
                  <span style={{ marginLeft: 12, fontSize: 9, color: 'var(--rs-gray-light)', letterSpacing: 1 }}>
                    {TRACK_LABELS[members[0]?.track ?? 'software']}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {members.map((cell) => {
                    const isSpeaking = speakingAgentId === cell.characterId;
                    const classNames = ['grid-cell', 'active', isSpeaking ? 'focus' : ''].filter(Boolean).join(' ');
                    return (
                      <div
                        key={cell.characterId}
                        ref={setCellRef(cell.characterId)}
                        className={classNames}
                        style={{ width: 120, height: 160, margin: '10px 5px 0' }}
                      >
                        <div className="grid-cell-inner">
                          <img src={cell.avatarUrl} alt={cell.name} loading="lazy" />
                          <HoverOverlay cell={cell} speakingAgentId={speakingAgentId} />
                        </div>
                        <div className="name-label"><span>{cell.name}</span></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ------ Stage: marquee — final horizontal scrolling per group ------ */
  return (
    <div className="custom-scrollbar h-full w-full overflow-y-auto overflow-x-hidden" style={{ background: 'var(--tk-bg)' }}>
      <div style={{ padding: '20px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Array.from(groupedMap.entries()).map(([groupId, members]) => {
          const isActive = activeGroupId === groupId;
          const marqueeDuration = `${members.length * 8}s`;
          const duplicated = [...members, ...members];

          return (
            <div
              key={groupId}
              style={{
                border: isActive ? '1px solid var(--tk-cyan)' : '1px solid var(--rs-gray-dark)',
                boxShadow: isActive ? '0 0 15px var(--tk-cyan-glow)' : 'none',
                padding: '12px 16px',
                transition: 'border-color 0.3s, box-shadow 0.3s',
              }}
            >
              <div className="font-mono mb-2 uppercase" style={{ fontSize: 11, letterSpacing: 2, color: isActive ? 'var(--tk-cyan)' : 'var(--rs-gray)' }}>
                组 {groupId}
                <span style={{ marginLeft: 12, fontSize: 9, color: 'var(--rs-gray-light)', letterSpacing: 1 }}>
                  {TRACK_LABELS[members[0]?.track ?? 'software']}
                </span>
              </div>

              <div className="group-marquee" style={{ height: 176 }}>
                <div className="marquee-track" style={{ '--marquee-duration': marqueeDuration } as React.CSSProperties}>
                  {duplicated.map((cell, i) => {
                    const isSpeaking = speakingAgentId === cell.characterId;
                    const cardClass = ['marquee-card', isSpeaking ? 'focus' : ''].filter(Boolean).join(' ');
                    return (
                      <div
                        key={`${cell.characterId}-${i}`}
                        ref={i < members.length ? setCellRef(cell.characterId) : undefined}
                        className={cardClass}
                      >
                        <div className="marquee-card-inner">
                          <img src={cell.avatarUrl} alt={cell.name} loading="lazy" />
                          <HoverOverlay cell={cell} speakingAgentId={speakingAgentId} />
                        </div>
                        <div className="name-label"><span>{cell.name}</span></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
