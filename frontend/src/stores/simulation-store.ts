import { create } from 'zustand';
import type {
  SimulationMessage,
  GroupInfo,
  GroupResult,
} from '@/types/simulation';
import * as api from '@/services/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SimulationState {
  simulationId: string | null;
  currentPhase: number;
  groups: GroupInfo[];
  messages: Map<number, SimulationMessage[]>;
  results: GroupResult[];
  activeGroupTab: number;
  isRunning: boolean;
  eventSource: EventSource | null;

  startSimulation: (ideas: string[]) => Promise<void>;
  addMessage: (msg: SimulationMessage) => void;
  setPhase: (phase: number) => void;
  setResults: (results: GroupResult[]) => void;
  setActiveGroupTab: (tab: number) => void;
  connectSSE: (simulationId: string) => void;
  disconnect: () => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  simulationId: null,
  currentPhase: 0,
  groups: [],
  messages: new Map(),
  results: [],
  activeGroupTab: 0,
  isRunning: false,
  eventSource: null,

  startSimulation: async (ideas: string[]) => {
    const { simulationId } = await api.startSimulation(ideas);
    set({ simulationId, isRunning: true, messages: new Map(), results: [], currentPhase: 1 });
    get().connectSSE(simulationId);
  },

  addMessage: (msg: SimulationMessage) => {
    const groupId = msg.groupId ?? 0;
    set((state) => {
      const newMessages = new Map(state.messages);
      const existing = newMessages.get(groupId) ?? [];
      newMessages.set(groupId, [...existing, msg]);
      return { messages: newMessages };
    });
  },

  setPhase: (phase: number) => {
    set({ currentPhase: phase });
  },

  setResults: (results: GroupResult[]) => {
    set({ results });
  },

  setActiveGroupTab: (tab: number) => {
    set({ activeGroupTab: tab });
  },

  connectSSE: (simulationId: string) => {
    const existing = get().eventSource;
    if (existing) {
      existing.close();
    }

    const es = new EventSource(`${API_URL}/api/simulation/${simulationId}/stream`);

    es.onmessage = (event) => {
      try {
        const msg: SimulationMessage = JSON.parse(event.data);

        switch (msg.type) {
          case 'message':
            get().addMessage(msg);
            break;
          case 'phase_change':
            if (msg.phase !== undefined) {
              get().setPhase(msg.phase);
            }
            break;
          case 'complete':
            api.getSimulationResult(simulationId).then((result) => {
              get().setResults(result.results);
              set({ isRunning: false });
            });
            get().disconnect();
            break;
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      get().disconnect();
      set({ isRunning: false });
    };

    set({ eventSource: es });
  },

  disconnect: () => {
    const es = get().eventSource;
    if (es) {
      es.close();
      set({ eventSource: null });
    }
  },

  reset: () => {
    get().disconnect();
    set({
      simulationId: null,
      currentPhase: 0,
      groups: [],
      messages: new Map(),
      results: [],
      activeGroupTab: 0,
      isRunning: false,
      eventSource: null,
    });
  },
}));
