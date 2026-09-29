import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { OWNER_EMAIL, db } from '../firebase';
import type { ScheduleItem, Trip } from '../types';

const EMPTY_TRIP: Trip = { title: '나의 여행', budget: { cardTotal: 0, cashTotal: 0 }, items: [] };
const CACHE_KEY = 'travel-trip-cache';
const TRIP_DOC_ID = 'main';

export type CloudStatus = 'loading' | 'ready' | 'denied';

export function useCloudTrip(enabled: boolean) {
  const [trip, setTrip] = useState<Trip>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? (JSON.parse(raw) as Trip) : EMPTY_TRIP;
    } catch {
      return EMPTY_TRIP;
    }
  });
  const [status, setStatus] = useState<CloudStatus>('loading');
  const [sharedEmails, setSharedEmails] = useState<string[]>([]);
  const lastJson = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    setStatus('loading');
    const ref = doc(db, 'trips', TRIP_DOC_ID);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        if (data) {
          const tripPart: Trip = {
            title: data.title ?? EMPTY_TRIP.title,
            budget: data.budget ?? EMPTY_TRIP.budget,
            items: (data.items ?? []).map((item: ScheduleItem) => ({
              ...item,
              expense: item.expense ?? null,
              needsReservation: item.needsReservation ?? false,
            })),
          };
          const json = JSON.stringify(tripPart);
          lastJson.current = json;
          setTrip(tripPart);
          setSharedEmails((data.sharedEmails as string[]) ?? []);
          localStorage.setItem(CACHE_KEY, json);
        }
        setStatus('ready');
      },
      (err) => {
        setStatus(err.code === 'permission-denied' ? 'denied' : 'ready');
      },
    );
    return unsubscribe;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || status !== 'ready') return;
    const json = JSON.stringify(trip);
    if (json === lastJson.current) return;
    lastJson.current = json;
    localStorage.setItem(CACHE_KEY, json);
    // Firestore는 undefined 필드를 허용하지 않으므로 JSON 왕복으로 제거하고,
    // merge로 저장해 ownerEmail/sharedEmails 필드를 덮어쓰지 않는다.
    setDoc(
      doc(db, 'trips', TRIP_DOC_ID),
      { ...JSON.parse(json), ownerEmail: OWNER_EMAIL },
      { merge: true },
    ).catch((err) => {
      console.error('Firestore 저장 실패', err);
    });
  }, [trip, enabled, status]);

  async function addSharedEmail(email: string) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || sharedEmails.includes(trimmed)) return;
    const next = [...sharedEmails, trimmed];
    setSharedEmails(next);
    await setDoc(doc(db, 'trips', TRIP_DOC_ID), { sharedEmails: next, ownerEmail: OWNER_EMAIL }, { merge: true });
  }

  async function removeSharedEmail(email: string) {
    const next = sharedEmails.filter((e) => e !== email);
    setSharedEmails(next);
    await updateDoc(doc(db, 'trips', TRIP_DOC_ID), { sharedEmails: next });
  }

  return { trip, setTrip, status, sharedEmails, addSharedEmail, removeSharedEmail } as const;
}
