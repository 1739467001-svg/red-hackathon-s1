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
 *   grouping   → DOM switches to grouped layout; per-group cards appear,
 *                 each group independently transitions to marquee scrolling
 *                 once its glow finishes (no unified marquee stage)
 */
type DisplayStage = 'revealing' | 'revealed' | 'grouping';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STAGGER_MS = 60;
const ANIMATION_MS = 800;
const PAUSE_AFTER_REVEAL_MS = 1200;

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
/*  Hover overlay                                                      */
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
/*  Per-group row — handles its own grouping → marquee transition      */
/* ------------------------------------------------------------------ */

const GLOW_DURATION_MS = 1600; // glow animation lasts 0.8s × 2 repeats

interface GroupRowProps {
  groupId: number;
  members: CellData[];
  isActive: boolean;
  speakingAgentId: string | null;
  /** Number of cards in this group that should be visible (0..members.length) */
  visibleCount: number;
  /** Whether this group's cards are all loaded and glow has been triggered */
  isGlowing: boolean;
  setCellRef: (id: string) => (el: HTMLDivElement | null) => void;
}

function GroupRow({ groupId, members, isActive, speakingAgentId, visibleCount, isGlowing, setCellRef }: GroupRowProps) {
  const allVisible = visibleCount >= members.length;
  const [scrolling, setScrolling] = useState(false);

  // Start scrolling independently after this group's glow finishes
  useEffect(() => {
    if (!isGlowing || !allVisible) return;
    const timer = setTimeout(() => setScrolling(true), GLOW_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isGlowing, allVisible]);

  const marqueeDuration = `${members.length * 8}s`;
  const duplicated = scrolling ? [...members, ...members] : members;

  return (
    <div
      className={isGlowing && !scrolling ? 'group-container glow' : 'group-container'}
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

      <div className="group-marquee" style={{ height: 340 }}>
        <div
          className={scrolling ? 'marquee-track' : ''}
          style={scrolling ? { '--marquee-duration': marqueeDuration } as React.CSSProperties : { display: 'flex', gap: 10, padding: '10px 0' }}
        >
          {duplicated.map((cell, i) => {
            const isOriginal = i < members.length;
            const cardIdx = isOriginal ? i : i; // for duplicated, still use index
            const isVisible = scrolling || cardIdx < visibleCount;
            const isSpeaking = speakingAgentId === cell.characterId;
            const cardClass = ['marquee-card', isSpeaking ? 'focus' : ''].filter(Boolean).join(' ');

            return (
              <div
                key={`${cell.characterId}-${i}`}
                ref={isOriginal ? setCellRef(cell.characterId) : undefined}
                className={cardClass}
                style={scrolling ? undefined : {
                  opacity: isVisible ? 1 : 0,
                  transition: 'opacity 0.4s ease',
                }}
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
  void currentPhase;

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

  /* ------ Display stage state machine ------ */
  const [displayStage, setDisplayStage] = useState<DisplayStage>('revealing');
  const cellRefs = useRef(new Map<string, HTMLDivElement>());

  const totalRevealMs = cells.length * STAGGER_MS + ANIMATION_MS;

  // Stage 1→2
  useEffect(() => {
    if (cells.length === 0 || displayStage !== 'revealing') return;
    const timer = setTimeout(() => setDisplayStage('revealed'), totalRevealMs);
    return () => clearTimeout(timer);
  }, [cells.length, displayStage, totalRevealMs]);

  // Stage 2→3
  useEffect(() => {
    if (displayStage !== 'revealed') return;
    const timer = setTimeout(() => setDisplayStage('grouping'), PAUSE_AFTER_REVEAL_MS);
    return () => clearTimeout(timer);
  }, [displayStage]);

  // Grouping: cards appear one by one, each group glows independently when filled
  const [groupingProgress, setGroupingProgress] = useState(0);
  const [glowingGroups, setGlowingGroups] = useState<Set<number>>(new Set());
  const groupEntries = useMemo(() => Array.from(groupedMap.entries()), [groupedMap]);
  const totalGroupingCards = cells.length;
  const GROUPING_CARD_DELAY = 80;

  useEffect(() => {
    if (displayStage !== 'grouping') return;
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      setGroupingProgress(count);

      // Check if a group just got filled — trigger glow for THAT group
      let runningTotal = 0;
      for (const [groupId, members] of groupEntries) {
        runningTotal += members.length;
        if (count === runningTotal) {
          setGlowingGroups(prev => new Set(prev).add(groupId));
        }
      }

      if (count >= totalGroupingCards) {
        clearInterval(timer);
      }
    }, GROUPING_CARD_DELAY);
    return () => clearInterval(timer);
  }, [displayStage, totalGroupingCards, groupEntries]);

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
    const isFadingOut = displayStage === 'revealed';
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
            opacity: isFadingOut ? 0 : 1,
            transition: `opacity ${PAUSE_AFTER_REVEAL_MS * 0.8}ms ease`,
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

  /* ------ Stage: grouping — each group independently transitions to scrolling ------ */
  let globalCardIndex = 0;
  return (
    <div className="custom-scrollbar h-full w-full overflow-y-auto overflow-x-hidden" style={{ background: 'var(--tk-bg)' }}>
      <div style={{ padding: '20px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {groupEntries.map(([groupId, members]) => {
          const startIdx = globalCardIndex;
          globalCardIndex += members.length;
          const visibleCount = Math.max(0, Math.min(members.length, groupingProgress - startIdx));

          return (
            <GroupRow
              key={groupId}
              groupId={groupId}
              members={members}
              isActive={activeGroupId === groupId}
              speakingAgentId={speakingAgentId}
              visibleCount={visibleCount}
              isGlowing={glowingGroups.has(groupId)}
              setCellRef={setCellRef}
            />
          );
        })}
      </div>
    </div>
  );
}
