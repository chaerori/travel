import type { Coords } from './dayPlaces';

/** OpenStreetMap Nominatim으로 장소 이름을 검색해 첫 결과의 좌표를 돌려준다. 못 찾으면 null. */
export async function geocodePlace(query: string): Promise<Coords | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ko&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data.length) return null;
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  } catch {
    return null;
  }
}
