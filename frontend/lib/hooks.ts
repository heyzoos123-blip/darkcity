import { useEffect, useState } from 'react';
import { getSocket } from './socket';
import { useStore } from './store';
import type { Event, AgentLocation, Message } from '@/types';

/**
 * Hook to manage WebSocket connection and subscriptions
 */
export function useWebSocket(userId: string, agentId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const { addEvent, updateAgentLocation } = useStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('[useWebSocket] Connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('[useWebSocket] Disconnected');
    });

    socket.on('city:event', (event: Event) => {
      addEvent(event);
    });

    socket.on('agent:moved', (location: AgentLocation) => {
      updateAgentLocation(location.agentId, location);
    });

    // Connect
    socket.auth = { userId, agentId };
    socket.connect();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('city:event');
      socket.off('agent:moved');
      socket.disconnect();
    };
  }, [userId, agentId, addEvent, updateAgentLocation]);

  return { isConnected, socket: getSocket() };
}

/**
 * Hook to subscribe to specific zones
 */
export function useZoneSubscription(zoneIds: string[]) {
  const { isConnected, socket } = useWebSocket('user-1'); // TODO: Get real user ID

  useEffect(() => {
    if (isConnected && zoneIds.length > 0) {
      socket.emit('subscribe', { zones: zoneIds });
      console.log('[useZoneSubscription] Subscribed to zones:', zoneIds);

      return () => {
        socket.emit('unsubscribe', { zones: zoneIds });
      };
    }
  }, [isConnected, zoneIds, socket]);
}

/**
 * Hook for media queries (responsive design)
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    const listener = () => setMatches(media.matches);
    listener();

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

/**
 * Hook for mobile detection
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}

/**
 * Hook for debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for localStorage with SSR safety
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

/**
 * Hook for interval with cleanup
 */
export function useInterval(callback: () => void, delay: number | null) {
  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(callback, delay);
    return () => clearInterval(id);
  }, [callback, delay]);
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyPress(targetKey: string, callback: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [targetKey, callback]);
}

/**
 * Hook for click outside detection
 */
export function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  callback: () => void
) {
  useEffect(() => {
    const handler = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);

    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [ref, callback]);
}
