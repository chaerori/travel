import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { OWNER_EMAIL, db } from '../firebase';
import type { ScheduleItem, Trip } from '../types';
import { useSaveTracker, type SaveIssue } from './saveTracker';

const EMPTY_BOOKMARKS = { food: [], cafe: [], attraction: [] };

const EMPTY_TRIP: Trip = {
  title: '나의 여행',
  budget: { cardTotal: 0, cashTotal: 0 },
  items: [],
  mapUrl: '',
  bookmarks: EMPTY_BOOKMARKS,
  showBudget: true,
  currency: 'KRW',
  expenses: [],
  prepChecklist: [],
};

export type CloudStatus = 'loading' | 'ready' | 'denied';

/** 짧은 시간에 수정이 몰리면 한 번의 쓰기로 묶는다. */
const SAVE_DEBOUNCE_MS = 800;
/** 이 시간(1분) 동안 쓰기가 이 횟수를 넘으면 오작동으로 보고 저장을 멈춘다. 사람의 수정으로는 도달하기 어려운 수치다. */
const WRITE_WINDOW_MS = 60_000;
const WRITE_LIMIT = 40;

/** 폭주 원인을 찾을 수 있도록 직전 저장본과 달라진 부분을 알려 준다. */
function describeChange(prevJson: string | null, nextJson: string): string[] {
  if (!prevJson) return ['(이전 저장본 없음)'];
  const prev = JSON.parse(prevJson) as Record<string, unknown>;
  const next = JSON.parse(nextJson) as Record<string, unknown>;
  const changes: string[] = [];
  for (const key of Object.keys({ ...prev, ...next })) {
    if (key === 'items') continue;
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) changes.push(key);
  }
  const before = new Map((prev.items as ScheduleItem[]).map((i) => [i.id, JSON.stringify(i)]));
  const after = new Map((next.items as ScheduleItem[]).map((i) => [i.id, JSON.stringify(i)]));
  for (const [id, v] of after) if (before.get(id) !== v) changes.push(`items/${id}`);
  for (const id of before.keys()) if (!after.has(id)) changes.push(`items/${id} (삭제)`);
  return changes;
}

export function useCloudTrip(enabled: boolean, tripId: string) {
  const cacheKey = `travel-trip-cache-${tripId}`;
  const [trip, setTrip] = useState<Trip>(() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      return raw ? (JSON.parse(raw) as Trip) : EMPTY_TRIP;
    } catch {
      return EMPTY_TRIP;
    }
  });
  const [status, setStatus] = useState<CloudStatus>('loading');
  const [sharedEmails, setSharedEmails] = useState<string[]>([]);
  const lastJson = useRef<string | null>(null);
  const { issue: trackedIssue, track } = useSaveTracker();
  const [writeBlocked, setWriteBlocked] = useState(false);
  const blocked = useRef(false);
  const writeTimes = useRef<number[]>([]);
  const pendingJson = useRef<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    setStatus('loading');
    const ref = doc(db, 'trips', tripId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        if (data) {
          const tripPart: Trip = {
            title: data.title ?? EMPTY_TRIP.title,
            budget: data.budget ?? EMPTY_TRIP.budget,
            mapUrl: data.mapUrl ?? '',
            showBudget: data.showBudget ?? true,
            currency: data.currency ?? 'KRW',
            expenses: data.expenses ?? [],
            prepChecklist: Array.isArray(data.prepChecklist) && data.prepChecklist.every((l: unknown) => Array.isArray((l as { items?: unknown })?.items))
              ? data.prepChecklist
              : [],
            bookmarks: {
              food: data.bookmarks?.food ?? [],
              cafe: data.bookmarks?.cafe ?? [],
              attraction: data.bookmarks?.attraction ?? [],
            },
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
          localStorage.setItem(cacheKey, json);
        }
        setStatus('ready');
      },
      (err) => {
        setStatus(err.code === 'permission-denied' ? 'denied' : 'ready');
      },
    );
    return unsubscribe;
  }, [enabled, tripId, cacheKey]);

  // 쓰기는 이 함수 하나로만 나가며, 짧은 시간에 너무 많이 나가면 저장을 멈춘다.
  const flush = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = null;
    const json = pendingJson.current;
    pendingJson.current = null;
    if (json === null || blocked.current || json === lastJson.current) return;

    const now = Date.now();
    writeTimes.current = writeTimes.current.filter((t) => now - t < WRITE_WINDOW_MS);
    if (writeTimes.current.length >= WRITE_LIMIT) {
      blocked.current = true;
      setWriteBlocked(true);
      console.error(
        `Firestore 쓰기가 ${WRITE_WINDOW_MS / 1000}초에 ${WRITE_LIMIT}회를 넘어 저장을 중단했습니다. 마지막으로 달라진 부분:`,
        describeChange(lastJson.current, json),
      );
      return;
    }
    writeTimes.current.push(now);

    lastJson.current = json;
    localStorage.setItem(cacheKey, json);
    // Firestore는 undefined 필드를 허용하지 않으므로 JSON 왕복으로 제거하고,
    // merge로 저장해 ownerEmail/sharedEmails 필드를 덮어쓰지 않는다.
    track(setDoc(doc(db, 'trips', tripId), { ...JSON.parse(json), ownerEmail: OWNER_EMAIL }, { merge: true }));
  }, [cacheKey, tripId, track]);

  useEffect(() => {
    if (!enabled || status !== 'ready') return;
    const json = JSON.stringify(trip);
    if (json === lastJson.current) {
      // 서버에서 받은 내용으로 화면이 바뀌었다면 기다리던 저장은 더 이상 필요 없다.
      pendingJson.current = null;
      return;
    }
    if (blocked.current) return;
    pendingJson.current = json;
    localStorage.setItem(cacheKey, json);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
  }, [trip, enabled, status, cacheKey, flush]);

  // 기다리는 저장이 있는데 화면이 가려지거나 닫히면 바로 내보낸다.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  async function addSharedEmail(email: string) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || sharedEmails.includes(trimmed)) return;
    const next = [...sharedEmails, trimmed];
    setSharedEmails(next);
    await setDoc(doc(db, 'trips', tripId), { sharedEmails: next, ownerEmail: OWNER_EMAIL }, { merge: true });
    await updateDoc(doc(db, 'tripIndex', tripId), { sharedEmails: next });
  }

  async function removeSharedEmail(email: string) {
    const next = sharedEmails.filter((e) => e !== email);
    setSharedEmails(next);
    await updateDoc(doc(db, 'trips', tripId), { sharedEmails: next });
    await updateDoc(doc(db, 'tripIndex', tripId), { sharedEmails: next });
  }

  const saveIssue: SaveIssue = writeBlocked ? 'blocked' : trackedIssue;

  return { trip, setTrip, status, sharedEmails, saveIssue, addSharedEmail, removeSharedEmail } as const;
}
