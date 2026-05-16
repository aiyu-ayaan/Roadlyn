'use client';

import { useEffect } from 'react';
import { websocketService } from '@/services/realtime/websocket-service';
import { useRealtimeStore } from '@/stores/realtime';

export function useRealtime() {
  const pushEvent = useRealtimeStore((state) => state.pushEvent);

  useEffect(() => websocketService.subscribe(pushEvent), [pushEvent]);
}
