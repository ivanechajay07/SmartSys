import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';

interface NotificacionEvent {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  fecha: string;
}

export function notifyBadgeRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('smartsys:notifications-refresh'));
  }
}

export function useNotifications() {
  const token = useAuth((state) => state.token);
  const [unread, setUnread] = useState(0);
  const [lastEvent, setLastEvent] = useState<NotificacionEvent | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;

    const load = () => {
      api
        .get<{ count: number }>('/notifications/unread-count')
        .then(({ data }) => {
          if (active) setUnread(data.count);
        })
        .catch(() => undefined);
    };

    load();
    const interval = window.setInterval(load, 30_000);
    window.addEventListener('smartsys:notifications-refresh', load);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('smartsys:notifications-refresh', load);
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const client = new Client({
      brokerURL: `${protocol}://${window.location.host}/ws`,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 15_000,
      debug: () => undefined,
      onConnect: () => {
        client.subscribe('/topic/notifications', (message) => {
          try {
            const payload = JSON.parse(message.body) as NotificacionEvent;
            setLastEvent(payload);
            setUnread((value) => value + 1);
          } catch {
            // Ignorar mensajes que no sean JSON.
          }
        });
      },
      onStompError: () => undefined,
      onWebSocketError: () => undefined,
    });
    client.activate();
    return () => {
      void client.deactivate();
    };
  }, [token]);

  return { unread, lastEvent, setUnread };
}
