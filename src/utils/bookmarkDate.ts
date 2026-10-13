import type { Trip } from '../types';
import { linkCoords, parseCoords, type Coords } from './dayPlaces';
import { pickNearestDate } from './date';

/** 거의 같은 거리로 보는 오차(미터). 이 안에서 겹치면 오늘과 가까운 날짜를 고른다. */
const TIE_M = 300;

/** 두 좌표 사이의 거리(미터, 구면 근사). */
function distanceM(a: Coords, b: Coords): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/**
 * 가고 싶은 장소를 보여 줄 날짜: 그 장소와 가장 가까운 "확정된 일정"(장소 위치를 아는 것)이 있는 날.
 * 거리가 거의 같은 날이 여럿이면 오늘이거나 오늘과 가장 가까운 미래 날짜. 장소의 위치를 읽을 수 없거나
 * 위치를 아는 확정된 일정이 없으면 null.
 */
export function pickBookmarkDate(trip: Pick<Trip, 'bookmarks' | 'items'>, id: string, today: string): string | null {
  const bookmark = Object.values(trip.bookmarks)
    .flat()
    .find((b) => b.id === id);
  const at = bookmark?.url ? parseCoords(bookmark.url) : null;
  if (!at) return null;

  const nearestByDate = new Map<string, number>();
  for (const item of trip.items) {
    if (item.content.type !== 'fixed') continue;
    const place = linkCoords(item.content.item);
    if (!place) continue;
    const d = distanceM(at, place);
    nearestByDate.set(item.date, Math.min(nearestByDate.get(item.date) ?? Infinity, d));
  }
  if (nearestByDate.size === 0) return null;

  const closest = Math.min(...nearestByDate.values());
  const candidates = [...nearestByDate].filter(([, d]) => d <= closest + TIE_M).map(([date]) => date);
  return pickNearestDate(candidates, today);
}
