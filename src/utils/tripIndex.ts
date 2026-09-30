import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { OWNER_EMAIL, db, hasFullAccess } from '../firebase';
import type { TripIndexEntry } from '../types';
import { slugify } from './tripId';

const LEGACY_INDEX_REF = doc(db, 'meta', 'tripIndex');
const INDEX_COLLECTION = collection(db, 'tripIndex');

export type TripIndexStatus = 'loading' | 'ready' | 'denied';

// 단일 문서(meta/tripIndex) 구조에서 여행별 문서(tripIndex/{id}) 구조로 옮기기 위한 1회성 마이그레이션.
// 문서별 보안 규칙으로 접근 권한을 걸 수 있도록 각 여행의 ownerEmail/sharedEmails를 함께 복사한다.
async function migrateLegacyIndexIfNeeded(userEmail: string) {
  if (!hasFullAccess(userEmail)) return;
  const legacySnap = await getDoc(LEGACY_INDEX_REF);
  const legacyTrips = (legacySnap.data()?.trips as { id: string; title: string }[]) ?? [];
  if (legacyTrips.length === 0) return;

  const existingSnap = await getDocs(INDEX_COLLECTION);
  const existingIds = new Set(existingSnap.docs.map((d) => d.id));

  for (const entry of legacyTrips) {
    if (existingIds.has(entry.id)) continue;
    const tripSnap = await getDoc(doc(db, 'trips', entry.id));
    const tripData = tripSnap.data();
    await setDoc(doc(db, 'tripIndex', entry.id), {
      id: entry.id,
      title: entry.title,
      ownerEmail: tripData?.ownerEmail ?? OWNER_EMAIL,
      sharedEmails: tripData?.sharedEmails ?? [],
    });
  }
}

export function useTripIndex(userEmail: string) {
  const [trips, setTrips] = useState<TripIndexEntry[]>([]);
  const [status, setStatus] = useState<TripIndexStatus>('loading');

  useEffect(() => {
    setStatus('loading');
    migrateLegacyIndexIfNeeded(userEmail).catch((err) => console.error('여행 목록 마이그레이션 실패', err));
    const unsubscribe = onSnapshot(
      INDEX_COLLECTION,
      (snap) => {
        setTrips(snap.docs.map((d) => d.data() as TripIndexEntry));
        setStatus('ready');
      },
      (err) => {
        setStatus(err.code === 'permission-denied' ? 'denied' : 'ready');
      },
    );
    return unsubscribe;
  }, [userEmail]);

  return { trips, status };
}

export async function createTrip(title: string): Promise<string> {
  const existingSnap = await getDocs(INDEX_COLLECTION);
  const existingIds = new Set(existingSnap.docs.map((d) => d.id));

  const base = slugify(title) || 'trip';
  let id = base;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }

  await setDoc(doc(db, 'trips', id), {
    title,
    budget: { cardTotal: 0, cashTotal: 0 },
    items: [],
    mapUrl: '',
    bookmarks: { food: [], cafe: [], attraction: [] },
    showBudget: true,
    expenses: [],
    prepChecklist: [],
    ownerEmail: OWNER_EMAIL,
    sharedEmails: [],
  });
  await setDoc(doc(db, 'tripIndex', id), { id, title, ownerEmail: OWNER_EMAIL, sharedEmails: [] });

  return id;
}

export async function renameTripIndexEntry(id: string, title: string): Promise<void> {
  await updateDoc(doc(db, 'tripIndex', id), { title });
}

export async function deleteTrip(id: string): Promise<void> {
  await deleteDoc(doc(db, 'tripIndex', id));
  await deleteDoc(doc(db, 'trips', id));
}
