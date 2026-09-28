import { useState } from 'react';

const KEY = 'travel-sync-code';

export function useSyncCode() {
  const [code, setCode] = useState(() => {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(KEY, fresh);
    return fresh;
  });

  function updateCode(next: string) {
    const trimmed = next.trim();
    if (!trimmed) return;
    localStorage.setItem(KEY, trimmed);
    setCode(trimmed);
  }

  return [code, updateCode] as const;
}
