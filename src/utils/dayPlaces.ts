import type { LinkedText, ScheduleItem } from '../types';

export type DayPlace = {
  key: string;
  itemId: string;
  placeId: string;
  label: string;
  url?: string;
  city: string;
  lat?: number;
  lng?: number;
  /** 지도에서 순서 번호를 붙일지 여부. 선택하지 않은 선택지 후보는 번호 없이 표시한다. */
  numbered: boolean;
  /** 이름으로 좌표를 검색해도 되는 장소인지. 확정된 일정의 이름은 활동명일 수 있어 제외한다. */
  searchable: boolean;
  /** 장소가 속한 일정의 제목(이동 경로·선택지). */
  context: string;
};

export type Coords = { lat: number; lng: number };

/** 해당 날짜 일정의 장소를 시간 순으로 모은다. */
export function getDayPlaces(items: ScheduleItem[], date: string): DayPlace[] {
  const dayItems = items.filter((i) => i.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const places: DayPlace[] = [];

  function push(item: ScheduleItem, link: LinkedText, numbered: boolean, searchable: boolean, context: string) {
    if (!link.label.trim()) return;
    places.push({
      key: `${item.id}:${link.id}`,
      itemId: item.id,
      placeId: link.id,
      label: link.label.trim(),
      url: link.url,
      city: item.city,
      lat: link.lat,
      lng: link.lng,
      numbered,
      searchable,
      context,
    });
  }

  for (const item of dayItems) {
    const content = item.content;
    if (content.type === 'fixed') {
      if (content.item.url || content.item.lat !== undefined) push(item, content.item, true, false, '');
    } else if (content.type === 'choices') {
      const selected = content.options.find((o) => o.id === content.selectedId);
      if (selected) push(item, selected, true, true, content.title);
      else content.options.forEach((o) => push(item, o, false, true, content.title));
    } else {
      content.stops.forEach((s) => push(item, s, true, true, content.title));
    }
  }
  return places;
}

/** 구글 지도 전체 주소에 들어 있는 좌표를 읽는다. 짧은 링크(maps.app.goo.gl)는 읽을 수 없다. */
export function parseCoords(url: string): Coords | null {
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll|query|destination)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

/** 일정 안의 특정 장소에 좌표를 기록한다. */
export function setPlaceCoords(items: ScheduleItem[], itemId: string, placeId: string, coords: Coords): ScheduleItem[] {
  const patch = (l: LinkedText): LinkedText => (l.id === placeId ? { ...l, ...coords } : l);
  return items.map((item) => {
    if (item.id !== itemId) return item;
    const c = item.content;
    if (c.type === 'fixed') return { ...item, content: { ...c, item: patch(c.item) } };
    if (c.type === 'choices') return { ...item, content: { ...c, options: c.options.map(patch) } };
    return { ...item, content: { ...c, stops: c.stops.map(patch) } };
  });
}
