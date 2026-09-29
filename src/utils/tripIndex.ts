import { deleteDoc, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { OWNER_EMAIL, db } from '../firebase';
import type { TripIndexEntry } from '../types';
import { slugify } from './tripId';

const INDEX_REF = doc(db, 'meta', 'tripIndex');

export type TripIndexStatus = 'loading' | 'ready' | 'denied';

async function migrateMainTripIfNeeded() {
  const mainSnap = await getDoc(doc(db, 'trips', 'main'));
  const mainData = mainSnap.data();
  if (!mainData) return;
  const hasContent = !!mainData.title || (mainData.items ?? []).length > 0;
  if (!hasContent) return;
  await setDoc(
    INDEX_REF,
    { trips: [{ id: 'main', title: mainData.title ?? '나의 여행' }] },
    { merge: true },
  );
}

export function useTripIndex() {
  const [trips, setTrips] = useState<TripIndexEntry[]>([]);
  const [status, setStatus] = useState<TripIndexStatus>('loading');

  useEffect(() => {
    setStatus('loading');
    const unsubscribe = onSnapshot(
      INDEX_REF,
      (snap) => {
        const data = snap.data();
        if (!data) {
          migrateMainTripIfNeeded().catch((err) => console.error('여행 목록 마이그레이션 실패', err));
          return;
        }
        setTrips((data.trips as TripIndexEntry[]) ?? []);
        setStatus('ready');
      },
      (err) => {
        setStatus(err.code === 'permission-denied' ? 'denied' : 'ready');
      },
    );
    return unsubscribe;
  }, []);

  return { trips, status };
}

export async function createTrip(title: string): Promise<string> {
  const indexSnap = await getDoc(INDEX_REF);
  const existing = (indexSnap.data()?.trips as TripIndexEntry[]) ?? [];
  const existingIds = new Set(existing.map((t) => t.id));

  const base = slugify(title) || 'trip';
  let id = base;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }

  await setDoc(
    doc(db, 'trips', id),
    { title, budget: { cardTotal: 0, cashTotal: 0 }, items: [], mapUrl: '', ownerEmail: OWNER_EMAIL },
    { merge: true },
  );
  await setDoc(INDEX_REF, { trips: [...existing, { id, title }] }, { merge: true });

  return id;
}

export async function renameTripIndexEntry(id: string, title: string): Promise<void> {
  const indexSnap = await getDoc(INDEX_REF);
  const existing = (indexSnap.data()?.trips as TripIndexEntry[]) ?? [];
  const next = existing.some((t) => t.id === id)
    ? existing.map((t) => (t.id === id ? { ...t, title } : t))
    : [...existing, { id, title }];
  await setDoc(INDEX_REF, { trips: next }, { merge: true });
}

export async function deleteTrip(id: string): Promise<void> {
  const indexSnap = await getDoc(INDEX_REF);
  const existing = (indexSnap.data()?.trips as TripIndexEntry[]) ?? [];
  const next = existing.filter((t) => t.id !== id);
  await setDoc(INDEX_REF, { trips: next }, { merge: true });
  await deleteDoc(doc(db, 'trips', id));
}
