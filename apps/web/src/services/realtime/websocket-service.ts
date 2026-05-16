import { appConfig } from '@/config/app';
import { tokenStorage } from '@/services/auth/token-storage';
import { RealtimeEvent } from '@/types';

type Listener = (event: RealtimeEvent) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();

  connect() {
    if (typeof window === 'undefined' || this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    const token = tokenStorage.getAccessToken();
    const url = new URL('/ws', appConfig.wsUrl);

    if (token) {
      url.searchParams.set('token', token);
    }

    this.socket = new WebSocket(url);
    this.socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data as string) as RealtimeEvent;
        this.listeners.forEach((listener) => listener(event));
      } catch {
        this.listeners.forEach((listener) =>
          listener({
            type: 'notification',
            payload: { message: String(message.data) },
          }),
        );
      }
    };
    this.socket.onclose = () => {
      this.socket = null;
    };
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    this.connect();

    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const websocketService = new WebSocketService();
