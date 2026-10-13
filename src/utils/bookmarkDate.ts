import type { Trip } from '../types';
import { pickNearestDate } from './date';

/**
 * 가고 싶은 장소를 보여 줄 날짜. 장소의 위치와 같은 도시의 일정이 있는 날 중
 * 오늘이거나 오늘과 가장 가까운 미래 날짜. 위치가 비어 있거나 같은 도시의 날이 없으면 null.
 */
export function pickBookmarkDate(trip: Pick<Trip, 'bookmarks' | 'items'>, id: string, today: string): string | null {
  const city = Object.values(trip.bookmarks)
    .flat()
    .find((b) => b.id === id)
    ?.location.trim()
    .toLowerCase();
  if (!city) return null;
  const dates = [...new Set(trip.items.filter((i) => i.city.trim().toLowerCase() === city).map((i) => i.date))];
  return pickNearestDate(dates, today);
}
