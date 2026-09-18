/**
 * Safe Storage Utility for GeoRoute Pro
 * Prevents "Database not found", QuotaExceededError, or SecurityError
 * when running on Vercel, iOS Safari Private Browsing, or restricted environments.
 */

const memoryFallback: Record<string, string> = {};
const sessionMemoryFallback: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[SafeStorage] localStorage.getItem failed for "${key}", using memory fallback.`, e);
    }
    return memoryFallback[key] ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        memoryFallback[key] = value;
        return;
      }
    } catch (e) {
      console.warn(`[SafeStorage] localStorage.setItem failed for "${key}", using memory fallback.`, e);
    }
    memoryFallback[key] = value;
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[SafeStorage] localStorage.removeItem failed for "${key}".`, e);
    }
    delete memoryFallback[key];
  },
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[SafeSessionStorage] sessionStorage.getItem failed for "${key}", using memory fallback.`, e);
    }
    return sessionMemoryFallback[key] ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
        sessionMemoryFallback[key] = value;
        return;
      }
    } catch (e) {
      console.warn(`[SafeSessionStorage] sessionStorage.setItem failed for "${key}", using memory fallback.`, e);
    }
    sessionMemoryFallback[key] = value;
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[SafeSessionStorage] sessionStorage.removeItem failed for "${key}".`, e);
    }
    delete sessionMemoryFallback[key];
  },
};
