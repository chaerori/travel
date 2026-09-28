import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { db } from '../firebase';
import type { Trip } from '../types';

const EMPTY_TRIP: Trip = { title: '나의 여행', items: [] };

function cacheKey(syncCode: string) {
  return `travel-trip-cache-${syncCode}`;
}

export function useCloudTrip(syncCode: string) {
  const [trip, setTrip] = useState<Trip>(() => {
    try {
      const raw = localStorage.getItem(cacheKey(syncCode));
      return raw ? (JSON.parse(raw) as Trip) : EMPTY_TRIP;
    } catch {
      return EMPTY_TRIP;
    }
  });
  const [synced, setSynced] = useState(false);
  const lastJson = useRef<string | null>(null);

  useEffect(() => {
    setSynced(false);
    const ref = doc(db, 'trips', syncCode);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Trip;
          const json = JSON.stringify(data);
          lastJson.current = json;
          setTrip(data);
          localStorage.setItem(cacheKey(syncCode), json);
        }
        setSynced(true);
      },
      () => setSynced(true),
    );
    return unsubscribe;
  }, [syncCode]);

  useEffect(() => {
    const json = JSON.stringify(trip);
    if (json === lastJson.current) return;
    lastJson.current = json;
    localStorage.setItem(cacheKey(syncCode), json);
    // Firestore는 undefined 필드를 허용하지 않으므로 JSON 왕복으로 제거한다.
    setDoc(doc(db, 'trips', syncCode), JSON.parse(json)).catch((err) => {
      console.error('Firestore 저장 실패', err);
    });
  }, [trip, syncCode]);

  return [trip, setTrip, synced] as const;
}
