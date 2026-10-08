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
  /** 같은 번호 안에서 경로선이 지나는 장소(선택지는 첫 번째). */
  primary: boolean;
  /** 장소가 속한 일정의 제목(이동 경로·선택지). */
  context: string;
};

export type Coords = { lat: number; lng: number };

/** 지도 화면의 중심(`@위도,경도`). 장소 위치가 아니다. */
function viewportCenter(url: string): Coords | null {
  const m = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
}

/**
 * 저장된 좌표. 예전 방식으로 주소의 지도 화면 중심을 장소 위치로 저장해 둔 경우는 틀린 값이라 버린다
 * (장소의 정확한 좌표를 읽을 수 없는 주소인데 저장된 값이 화면 중심과 같을 때).
 */
function savedCoords(link: LinkedText): { lat?: number; lng?: number } {
  if (link.lat === undefined || link.lng === undefined) return {};
  // 예전에는 주소의 첫 번째 쌍을 썼다. 마지막 쌍이 아닌 다른 쌍과 같은 값이면 그때 잘못 저장된 좌표다.
  if (link.url) {
    const pairs = dataPairs(link.url);
    const wrong = pairs
      .slice(0, -1)
      .some((c) => Math.abs(c.lat - link.lat!) < 1e-6 && Math.abs(c.lng - link.lng!) < 1e-6);
    if (wrong) return {};
  }
  if (link.url && !parseCoords(link.url)) {
    const center = viewportCenter(link.url);
    if (center && Math.abs(center.lat - link.lat) < 1e-6 && Math.abs(center.lng - link.lng) < 1e-6) return {};
  }
  return { lat: link.lat, lng: link.lng };
}

/** 해당 날짜 일정의 장소를 시간 순으로 모은다. 구글 지도 링크를 넣은 장소만 대상이다. */
export function getDayPlaces(items: ScheduleItem[], date: string): DayPlace[] {
  const dayItems = items.filter((i) => i.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const places: DayPlace[] = [];
  let number = 0;

  function push(
    item: ScheduleItem,
    link: LinkedText,
    extra: Pick<DayPlace, 'choice' | 'primary' | 'context'>,
  ) {
    places.push({
      key: `${item.id}:${link.id}`,
      itemId: item.id,
      placeId: link.id,
      label: link.label.trim(),
      url: link.url,
      city: item.city,
      ...savedCoords(link),
      number,
      ...extra,
    });
  }

  for (const item of dayItems) {
    const content = item.content;
    if (content.type === 'fixed') {
      if (content.item.label.trim() && content.item.url?.trim()) {
        number++;
        push(item, content.item, { choice: false, primary: true, context: '' });
      }
    } else if (content.type === 'choices') {
      const options = content.options.filter((o) => o.label.trim() && o.url?.trim());
      if (options.length === 0) continue;
      number++;
      options.forEach((o, i) =>
        push(item, o, {
          choice: true,
          primary: i === 0,
          context: content.title,
        }),
      );
    } else {
      for (const stop of content.stops) {
        if (!stop.label.trim() || !stop.url?.trim()) continue;
        number++;
        push(item, stop, { choice: false, primary: true, context: content.title });
      }
    }
  }
  return places;
}

/** 주소 안의 `!3d위도!4d경도` 쌍을 나온 순서대로 모두 찾는다. */
function dataPairs(url: string): Coords[] {
  const pairs: Coords[] = [];
  for (const m of url.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g)) {
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) pairs.push({ lat, lng });
  }
  return pairs;
}

/**
 * 구글 지도 주소에서 장소의 정확한 좌표(!3d…!4d…, q=·ll=·query= 값)를 읽는다.
 * `!3d…!4d…` 쌍은 주소에 여러 개 들어 있을 수 있다(앞에 보던 다른 장소가 함께 실리는 경우). 열린 장소는
 * 맨 마지막 쌍이므로 마지막 것을 쓴다.
 * 주소의 `@위도,경도`는 장소가 아니라 지도 화면의 중심이라 쓰지 않는다. 지도를 움직이지 않고 여러 장소의
 * 주소를 복사하면 모두 같은 값이 들어 있어, 쓰면 전부 한 곳에 찍힌다. 짧은 링크(maps.app.goo.gl)도 읽을 수 없다.
 */
export function parseCoords(url: string): Coords | null {
  const pairs = dataPairs(url);
  if (pairs.length > 0) return pairs[pairs.length - 1];
  const m = url.match(/[?&](?:q|ll|query|destination)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (m) {
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
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
      unplaced: p.lat === undefined && !(p.url && parseCoords(p.url)),
    };
  }
  return badges;
}
