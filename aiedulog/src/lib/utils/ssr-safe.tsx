/**
 * SSR-safe utilities and components
 * Prevents hydration mismatches and client/server incompatibilities
 */

import React, { useEffect, useState } from 'react';

/**
 * Hook to detect if we're running on the client side
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

/**
 * Hook for SSR-safe localStorage access
 */
export function useLocalStorage<T>(
  key: string, 
  defaultValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(defaultValue);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (isClient) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

/**
 * SSR-safe window object access
 */
export function safeWindow(): Window | undefined {
  return typeof window !== 'undefined' ? window : undefined;
}

/**
 * SSR-safe document access
 */
export function safeDocument(): Document | undefined {
  return typeof document !== 'undefined' ? document : undefined;
}

/**
 * Check if code is running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * SSR-safe component wrapper
 */
export function withClientOnly<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const ClientOnlyComponent = (props: P) => {
    const isClient = useIsClient();
    
    if (!isClient) {
      return null;
    }
    
    return <Component {...props} />;
  };
  
  ClientOnlyComponent.displayName = `ClientOnly(${Component.displayName || Component.name})`;
  
  return ClientOnlyComponent;
}

/**
 * Generate stable IDs that work in SSR
 */
let idCounter = 0;
const idPrefix = typeof window !== 'undefined' 
  ? `client-${Date.now()}` 
  : `server-${Date.now()}`;

export function generateStableId(prefix: string = 'id'): string {
  return `${prefix}-${idPrefix}-${++idCounter}`;
}

/**
 * SSR-safe media query hook
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (!isBrowser()) return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Debounced effect hook for performance
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Safe event listener hook
 */
export function useEventListener(
  eventName: string,
  handler: (event: Event) => void,
  element?: HTMLElement | Window
) {
  useEffect(() => {
    if (!isBrowser()) return;

    const targetElement = element || window;
    
    const eventListener = (event: Event) => handler(event);
    
    targetElement.addEventListener(eventName, eventListener);
    
    return () => {
      targetElement.removeEventListener(eventName, eventListener);
    };
  }, [eventName, handler, element]);
}