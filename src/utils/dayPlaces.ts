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
  /** 지도·목록에 표시하는 번호. 당일 선택지의 선택지들은 같은 번호를 쓴다. */
  number: number;
  /** 당일 선택지의 선택지인지. 지도에서 다른 색으로 구분한다. */
  choice: boolean;
  /** 같은 번호의 선택지 중 이미 다른 선택지가 골라진 경우 true. 흐리게 표시한다. */
  candidate: boolean;
  /** 같은 번호 안에서 경로선이 지나는 장소(선택한 선택지, 없으면 첫 선택지). */
  primary: boolean;
  /** 장소가 속한 일정의 제목(이동 경로·선택지). */
  context: string;
};

export type Coords = { lat: number; lng: number };

/** 해당 날짜 일정의 장소를 시간 순으로 모은다. 구글 지도 링크를 넣은 장소만 대상이다. */
export function getDayPlaces(items: ScheduleItem[], date: string): DayPlace[] {
  const dayItems = items.filter((i) => i.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const places: DayPlace[] = [];
  let number = 0;

  function push(
    item: ScheduleItem,
    link: LinkedText,
    extra: Pick<DayPlace, 'choice' | 'candidate' | 'primary' | 'context'>,
  ) {
    places.push({
      key: `${item.id}:${link.id}`,
      itemId: item.id,
      placeId: link.id,
      label: link.label.trim(),
      url: link.url,
      city: item.city,
      lat: link.lat,
      lng: link.lng,
      number,
      ...extra,
    });
  }

  for (const item of dayItems) {
    const content = item.content;
    if (content.type === 'fixed') {
      if (content.item.label.trim() && content.item.url?.trim()) {
        number++;
        push(item, content.item, { choice: false, candidate: false, primary: true, context: '' });
      }
    } else if (content.type === 'choices') {
      const options = content.options.filter((o) => o.label.trim() && o.url?.trim());
      if (options.length === 0) continue;
      number++;
      const selected = options.find((o) => o.id === content.selectedId);
      options.forEach((o, i) =>
        push(item, o, {
          choice: true,
          candidate: !!selected && o.id !== selected.id,
          primary: selected ? o.id === selected.id : i === 0,
          context: content.title,
        }),
      );
    } else {
      for (const stop of content.stops) {
        if (!stop.label.trim() || !stop.url?.trim()) continue;
        number++;
        push(item, stop, { choice: false, candidate: false, primary: true, context: content.title });
      }
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
export function setPlaceCoords(
  items: ScheduleItem[],
  itemId: string,
  placeId: string,
  coords: Coords,
): ScheduleItem[] {
  const patch = (l: LinkedText): LinkedText => (l.id === placeId ? { ...l, ...coords } : l);
  return items.map((item) => {
    if (item.id !== itemId) return item;
    const c = item.content;
    if (c.type === 'fixed') return { ...item, content: { ...c, item: patch(c.item) } };
    if (c.type === 'choices') return { ...item, content: { ...c, options: c.options.map(patch) } };
    return { ...item, content: { ...c, stops: c.stops.map(patch) } };
  });
}

export type PlaceBadgeInfo = {
  number: number;
  choice: boolean;
  candidate: boolean;
  /** 링크에서 위치를 읽지 못했고 아직 찍지도 않아 지도에 표시되지 않는 장소. */
  unplaced: boolean;
};

/** 일정 카드에 보여 줄 지도 번호를 `일정id:장소id`를 키로 모은다. */
export function getPlaceBadges(items: ScheduleItem[], date: string): Record<string, PlaceBadgeInfo> {
  const badges: Record<string, PlaceBadgeInfo> = {};
  for (const p of getDayPlaces(items, date)) {
    badges[p.key] = {
      number: p.number,
      choice: p.choice,
      candidate: p.candidate,
      unplaced: p.lat === undefined && !(p.url && parseCoords(p.url)),
    };
  }
  return badges;
}
