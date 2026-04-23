'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSimulationStore } from '@/stores/simulation-store';
import { PhaseIndicator } from '@/components/PhaseIndicator';
import type { PhaseTabId } from '@/components/PhaseIndicator';
import { ChatSidebar } from '@/components/ChatSidebar';
import { RosterGrid } from '@/components/RosterGrid';

/* ------------------------------------------------------------------ */
/*  Phase labels                                                       */
/* ------------------------------------------------------------------ */

const PHASE_LABELS: Record<number, string> = {
  0: 'GROUPING',
  1: 'DISCUSSION',
  2: 'DEVELOPMENT',
  3: 'PRESENTATION',
  4: 'JUDGING',
  5: 'RESULTS',
};

/* ------------------------------------------------------------------ */
/*  Status Bar                                                         */
/* ------------------------------------------------------------------ */

function StatusBar({
  currentPhase,
  agentCount,
}: {
  currentPhase: number;
  agentCount: number;
}) {
  const phaseLabel = PHASE_LABELS[currentPhase] ?? `PHASE ${currentPhase}`;
  const statusText = agentCount > 0 ? 'ALL AGENTS ONLINE' : 'AWAITING AGENTS';

  return (
    <div className="status-bar justify-between">
      <span>{phaseLabel}</span>
      <span>{agentCount} AGENTS</span>
      <span>{statusText}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Simulation Page                                                    */
/* ------------------------------------------------------------------ */

export default function SimulationPage() {
  const router = useRouter();
  const simulationId = useSimulationStore((s) => s.simulationId);
  const currentPhase = useSimulationStore((s) => s.currentPhase);
  const activeGroupTab = useSimulationStore((s) => s.activeGroupTab);
  const results = useSimulationStore((s) => s.results);
  const groups = useSimulationStore((s) => s.groups);
  const typingAgents = useSimulationStore((s) => s.typingAgents);
  const messages = useSimulationStore((s) => s.messages);
  const connectSSE = useSimulationStore((s) => s.connectSSE);
  const disconnect = useSimulationStore((s) => s.disconnect);

  // Active phase tab — auto-follows currentPhase on every phase advance
  const [activeTab, setActiveTab] = useState<PhaseTabId>(0);

  // Track the last phase we auto-switched to, so we can detect genuine phase advances
  const lastAutoPhaseRef = useRef<number>(-1);

  // Auto-advance tab whenever currentPhase increases (phase_change event)
  // This always fires on a new phase, regardless of whether user manually clicked a tab
  useEffect(() => {
    if (currentPhase !== lastAutoPhaseRef.current) {
      lastAutoPhaseRef.current = currentPhase;
      // Map backend phase number directly to tab id (they are 1:1)
      const tabId = Math.min(currentPhase, 5) as PhaseTabId;
      setActiveTab(tabId);
    }
  }, [currentPhase]);

  // Build agent name map from messages
  const agentNames = useMemo(() => {
    const map = new Map<string, string>();
    messages.forEach((msgs) => {
      msgs.forEach((msg) => {
        if (msg.agent?.id && msg.agent?.name) {
          map.set(msg.agent.id, msg.agent.name);
        }
      });
    });
    return map;
  }, [messages]);

  // Redirect to home if no simulation is active
  useEffect(() => {
    if (!simulationId) {
      router.replace('/');
    }
  }, [simulationId, router]);

  // Connect SSE on mount
  useEffect(() => {
    if (simulationId) {
      connectSSE(simulationId);
    }
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationId]);

  // Handle user manually clicking a tab (allow browsing history)
  // When user clicks, we update activeTab but do NOT update lastAutoPhaseRef,
  // so the next phase_change will still force-switch to the new phase.
  const handleTabChange = (tab: PhaseTabId) => {
    setActiveTab(tab);
  };

  const typingAgent = typingAgents.get(activeGroupTab) ?? null;
  const speakingAgentId = typingAgent?.agentId ?? null;
  const totalMembers = groups.reduce((acc, g) => acc + g.members.length, 0);

  if (!simulationId) return null;

  if (groups.length === 0) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ position: 'relative', zIndex: 2 }}
      >
        <span
          className="font-mono uppercase"
          style={{ fontSize: 13, letterSpacing: 4, color: 'var(--tk-cyan)' }}
        >
          INITIALIZING...
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen flex-col"
      style={{ position: 'relative', zIndex: 2 }}
    >
      {/* Status bar */}
      <StatusBar currentPhase={currentPhase} agentCount={totalMembers} />

      {/* Phase indicator — clickable tabs */}
      <PhaseIndicator
        currentPhase={currentPhase}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Main content: roster + chat */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Roster Grid (~65%) */}
        <div className="w-[65%] overflow-hidden">
          <RosterGrid
            groups={groups}
            currentPhase={currentPhase}
            activeGroupId={activeGroupTab}
            speakingAgentId={speakingAgentId}
            agentNames={agentNames}
          />
        </div>

        {/* Right panel: Chat Sidebar (~35%) */}
        <div
          className="w-[35%] border-l flex flex-col"
          style={{ borderColor: 'var(--rs-gray-dark)' }}
        >
          <ChatSidebar activeTab={activeTab} />
        </div>
      </div>
    </div>
  );
}
