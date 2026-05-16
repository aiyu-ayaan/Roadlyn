import { create } from 'zustand';
import { RealtimeEvent } from '@/types';

interface RealtimeState {
  events: RealtimeEvent[];
  latest?: RealtimeEvent;
  pushEvent: (event: RealtimeEvent) => void;
  clearEvents: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  events: [],
  latest: undefined,
  pushEvent: (event) =>
    set((state) => ({
      latest: event,
      events: [event, ...state.events].slice(0, 50),
    })),
  clearEvents: () => set({ events: [], latest: undefined }),
}));
