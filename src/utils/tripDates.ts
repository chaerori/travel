import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { tripDateRange, type DateRange } from './tripDday';

/** 이 기기에 저장해 둔 여행 캐시에서 날짜 범위를 읽는다(목록을 바로 보여 주기 위한 초기값). */
function cachedRange(tripId: string): DateRange | null {
  try {
    const raw = localStorage.getItem(`travel-trip-cache-${tripId}`);
    const items = raw ? (JSON.parse(raw) as { items?: { date: string }[] }).items : null;
    return Array.isArray(items) ? tripDateRange(items) : null;
  } catch {
    return null;
  }
}

/** 여행별 날짜 범위. 기기 캐시로 먼저 채우고, 서버에서 읽어 오면 갱신한다. */
export function useTripDateRanges(tripIds: string[]): Record<string, DateRange | null> {
  const key = tripIds.join('|');
  const [ranges, setRanges] = useState<Record<string, DateRange | null>>({});

  useEffect(() => {
    let cancelled = false;
    setRanges((prev) => {
      const next = { ...prev };
      for (const id of tripIds) if (!(id in next)) next[id] = cachedRange(id);
      return next;
    });
    for (const id of tripIds) {
      getDoc(doc(db, 'trips', id))
        .then((snap) => {
          if (cancelled) return;
          const items = snap.data()?.items as { date: string }[] | undefined;
          setRanges((prev) => ({ ...prev, [id]: Array.isArray(items) ? tripDateRange(items) : null }));
        })
        .catch(() => {
          // 읽지 못해도 캐시 값이나 "날짜 없음"으로 보여 준다.
        });
    }
    return () => {
      cancelled = true;
    };
  }, [key]);

  return ranges;
}
