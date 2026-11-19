import { useEffect, useRef, useState } from 'react';
import { resolveApiUrl, resolveWsUrl } from './apiBase';

export interface PortalRealtimeMessage {
  event: string;
  payload: unknown;
}

export type RealtimeTransportMode = 'websocket' | 'polling';

let cachedModePromise: Promise<RealtimeTransportMode> | null = null;

/**
 * Probes /api/health once to determine whether the server supports persistent
 * WebSockets or operates in polling mode.
 */
export function detectRealtimeMode(): Promise<RealtimeTransportMode> {
  if (typeof window === 'undefined') {
    return Promise.resolve('polling');
  }
  if (!cachedModePromise) {
    cachedModePromise = fetch(resolveApiUrl('/api/health'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) =>
        data && data.realtimeMode === 'polling' ? 'polling' : 'websocket'
      )
      .catch(() => 'websocket');
  }
  return cachedModePromise;
}

export function usePortalRealtime(params: {
  token: string;
  enabled: boolean;
  onEvent: (msg: PortalRealtimeMessage) => void;
  onReconnect?: () => void;
}) {
  const { token, enabled, onEvent, onReconnect } = params;
  const [connected, setConnected] = useState(false);
  const [onlineAccountIds, setOnlineAccountIds] = useState<string[]>([]);
  const [transportMode, setTransportMode] =
    useState<RealtimeTransportMode>('websocket');

  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);
  onEventRef.current = onEvent;
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    if (!enabled || !token || typeof window === 'undefined') {
      setConnected(false);
      return;
    }

    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let pingTimer: number | null = null;
    let pollTimer: number | null = null;
    let retryDelay = 1500;
    let hasConnectedOnce = false;
    let consecutiveFailures = 0;

    const startServerlessPolling = () => {
      if (disposed) return;
      setTransportMode('polling');
      setConnected(false);
      if (pollTimer) window.clearInterval(pollTimer);
      pollTimer = window.setInterval(() => {
        if (document.visibilityState === 'visible' && onReconnectRef.current) {
          onReconnectRef.current();
        }
      }, 8_000);
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      if (consecutiveFailures >= 3 && !hasConnectedOnce) {
        // Environment does not support WebSockets (e.g., serverless host); switch to polling cleanly
        startServerlessPolling();
        return;
      }
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(() => {
        retryDelay = Math.min(retryDelay * 1.6, 12_000);
        connect();
      }, retryDelay);
    };

    const connect = () => {
      if (disposed) return;
      const wsUrl = resolveWsUrl(
        `/ws/portal?token=${encodeURIComponent(token)}`
      );

      try {
        socket = new WebSocket(wsUrl);
      } catch {
        consecutiveFailures += 1;
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        if (disposed) return;
        consecutiveFailures = 0;
        setTransportMode('websocket');
        setConnected(true);
        retryDelay = 1500;
        if (hasConnectedOnce && onReconnectRef.current) {
          onReconnectRef.current();
        }
        hasConnectedOnce = true;

        if (pingTimer) window.clearInterval(pingTimer);
        pingTimer = window.setInterval(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            try {
              socket.send(JSON.stringify({ type: 'ping' }));
            } catch {
              // ignore
            }
          }
        }, 25_000);
      };

      socket.onmessage = (ev) => {
        if (disposed) return;
        try {
          const parsed = JSON.parse(String(ev.data)) as PortalRealtimeMessage;
          if (!parsed || typeof parsed.event !== 'string') return;

          if (
            parsed.event === 'connected' ||
            parsed.event === 'presence:update'
          ) {
            const p = parsed.payload as { onlineAccountIds?: string[] };
            if (Array.isArray(p?.onlineAccountIds)) {
              setOnlineAccountIds(p.onlineAccountIds);
            }
          }

          onEventRef.current(parsed);
        } catch {
          // Ignore malformed WS payloads
        }
      };

      socket.onclose = () => {
        if (disposed) return;
        setConnected(false);
        if (pingTimer) {
          window.clearInterval(pingTimer);
          pingTimer = null;
        }
        consecutiveFailures += 1;
        scheduleReconnect();
      };

      socket.onerror = () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };
    };

    void detectRealtimeMode().then((mode) => {
      if (disposed) return;
      if (mode === 'polling') {
        startServerlessPolling();
      } else {
        connect();
      }
    });

    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (pingTimer) window.clearInterval(pingTimer);
      if (pollTimer) window.clearInterval(pollTimer);
      if (socket) {
        try {
          socket.close();
        } catch {
          // ignore
        }
      }
    };
  }, [token, enabled]);

  return { connected, onlineAccountIds, transportMode };
}
