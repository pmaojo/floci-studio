import { useCallback, useEffect, useRef } from 'react';

type Handler = (payload: unknown) => void;

const SIDECAR_URL = import.meta.env.VITE_SIDECAR_URL ?? '/sidecar';

function buildWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const base = `${proto}//${window.location.host}`;
  return `${base}${SIDECAR_URL}/api/ws`;
}

export interface RealtimeSocket {
  subscribe: (type: string, handler: Handler) => () => void;
  connected: boolean;
}

export function useRealtimeSocket(onConnectedChange?: (connected: boolean) => void) {
  const ws = useRef<WebSocket | null>(null);
  const handlers = useRef(new Map<string, Set<Handler>>());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmounted = useRef(false);

  const connect = useCallback(() => {
    if (unmounted.current) return;
    if (ws.current?.readyState === WebSocket.CONNECTING || ws.current?.readyState === WebSocket.OPEN) return;

    try {
      const socket = new WebSocket(buildWsUrl());
      ws.current = socket;

      socket.onopen = () => {
        onConnectedChange?.(true);
      };

      socket.onmessage = (e: MessageEvent) => {
        try {
          const msg = JSON.parse(e.data as string) as { type: string; payload: unknown };
          const set = handlers.current.get(msg.type);
          if (set) set.forEach(h => h(msg.payload));
        } catch {
          // ignore malformed frames
        }
      };

      socket.onclose = () => {
        onConnectedChange?.(false);
        if (!unmounted.current) {
          reconnectTimer.current = setTimeout(connect, 4000);
        }
      };

      socket.onerror = () => socket.close();
    } catch {
      reconnectTimer.current = setTimeout(connect, 4000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    unmounted.current = false;
    connect();
    return () => {
      unmounted.current = true;
      clearTimeout(reconnectTimer.current ?? undefined);
      ws.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((type: string, handler: Handler) => {
    if (!handlers.current.has(type)) handlers.current.set(type, new Set());
    handlers.current.get(type)!.add(handler);
    return () => handlers.current.get(type)?.delete(handler);
  }, []);

  return { subscribe };
}
