import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronIcon } from './icons/ChevronIcon';
import type { ScheduleItem } from '../types';
import { getDayPlaces, parseCoords, type Coords, type DayPlace } from '../utils/dayPlaces';
import { geocodePlace } from '../utils/geocode';

type Props = {
  items: ScheduleItem[];
  date: string;
  onPlaceCoords: (itemId: string, placeId: string, coords: Coords) => void;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function badgeClass(p: { choice: boolean; candidate: boolean }): string {
  return ['day-map__badge', p.choice && 'day-map__badge--choice', p.candidate && 'day-map__badge--candidate']
    .filter(Boolean)
    .join(' ');
}

export function DayMap({ items, date, onPlaceCoords }: Props) {
  const [searching, setSearching] = useState<string | null>(null);
  const [pickingKey, setPickingKey] = useState<string | null>(null);
  const [tried, setTried] = useState<Set<string>>(new Set());
  const [managing, setManaging] = useState(false);
  const [focused, setFocused] = useState(false);

  const places = useMemo(() => getDayPlaces(items, date), [items, date]);
  const located = places.filter((p) => p.lat !== undefined && p.lng !== undefined);

  const mapEl = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onCoordsRef = useRef(onPlaceCoords);
  onCoordsRef.current = onPlaceCoords;
  const placesRef = useRef(places);
  placesRef.current = places;
  const locatedRef = useRef(located);
  locatedRef.current = located;
  const pickingRef = useRef<string | null>(null);
  pickingRef.current = pickingKey;

  // 지도는 한 번만 만든다.
  useEffect(() => {
    if (!mapEl.current) return;
    const map = L.map(mapEl.current, { zoomControl: false, attributionControl: true }).setView([37.5665, 126.978], 11);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.attributionControl.setPrefix(false);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      const key = pickingRef.current;
      if (!key) return;
      const place = placesRef.current.find((p) => p.key === key);
      if (place) onCoordsRef.current(place.itemId, place.placeId, { lat: e.latlng.lat, lng: e.latlng.lng });
      setPickingKey(null);
    });
    mapRef.current = map;
    // 모달이 올라오는 애니메이션이 끝난 뒤 크기를 다시 계산한다.
    const timer = setTimeout(() => map.invalidateSize(), 350);
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 핀과 경로선을 다시 그린다.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    const route: L.LatLngTuple[] = [];
    const routeNumbers = new Set<number>();
    for (const p of located) {
      const point: L.LatLngTuple = [p.lat!, p.lng!];
      const icon = L.divIcon({
        className: 'day-map__marker',
        html: `<span class="day-map__pin${p.choice ? ' day-map__pin--choice' : ''}${p.candidate ? ' day-map__pin--candidate' : ''}">${p.number}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker(point, { icon }).bindTooltip(p.label, { direction: 'top', offset: [0, -12] }).addTo(layer);
      markersRef.current.set(p.key, marker);
    }
    // 경로선은 번호마다 한 곳(선택한 선택지 또는 첫 번째)을 지나게 이어 준다.
    for (const p of located) {
      if (routeNumbers.has(p.number)) continue;
      const pick = located.find((q) => q.number === p.number && q.primary) ?? p;
      routeNumbers.add(p.number);
      route.push([pick.lat!, pick.lng!]);
    }
    if (route.length > 1) {
      L.polyline(route, { color: '#6c5ce7', weight: 3, opacity: 0.55, dashArray: '6 8' }).addTo(layer);
    }
    fitToLocated(false);
  }, [located.map((p) => `${p.key}:${p.lat}:${p.lng}:${p.number}:${p.choice}:${p.candidate}:${p.primary}`).join('|')]);

  // 좌표가 없는 장소는 링크에서 읽거나 이름으로 검색한다(검색은 초당 1건 이하로 제한).
  useEffect(() => {
    setPickingKey(null);
    let cancelled = false;
    (async () => {
      for (const p of getDayPlaces(itemsRef.current, date)) {
        if (cancelled) return;
        if (p.lat !== undefined) continue;
        const fromUrl = p.url ? parseCoords(p.url) : null;
        if (fromUrl) {
          onCoordsRef.current(p.itemId, p.placeId, fromUrl);
          continue;
        }
        if (!p.searchable) continue;
        setSearching(p.key);
        const hit = await geocodePlace(p.city ? `${p.label}, ${p.city}` : p.label);
        if (cancelled) return;
        if (hit) onCoordsRef.current(p.itemId, p.placeId, hit);
        setTried((prev) => new Set(prev).add(p.key));
        await sleep(1100);
      }
      if (!cancelled) setSearching(null);
    })();
    return () => {
      cancelled = true;
      setSearching(null);
    };
  }, [date]);

  // 그날 장소가 모두 보이도록 지도를 맞춘다.
  function fitToLocated(animate: boolean) {
    const map = mapRef.current;
    const pts = locatedRef.current;
    if (!map || pts.length === 0) return;
    setFocused(false);
    markersRef.current.forEach((m) => m.closeTooltip());
    if (pts.length === 1) map.setView([pts[0].lat!, pts[0].lng!], 15, { animate });
    else map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat!, p.lng!] as L.LatLngTuple)), { padding: [36, 36], maxZoom: 16, animate });
  }

  // 목록에서 고른 장소로 지도를 확대한다. 위치가 없는 장소는 직접 찍도록 한다.
  function focusPlace(p: DayPlace) {
    const map = mapRef.current;
    if (!map || p.lat === undefined || p.lng === undefined) {
      startPicking(p.key);
      return;
    }
    wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    map.setView([p.lat, p.lng], 17);
    markersRef.current.get(p.key)?.openTooltip();
    setFocused(true);
  }

  function startPicking(key: string) {
    setPickingKey(key);
    wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const picking = places.find((p) => p.key === pickingKey);
  const unlocated = places.length - located.length;
  // 링크에서 읽지 못했고 이름 검색도 끝났거나 검색 대상이 아닌 장소는 직접 찍어야 한다.
  const needsPin = places.filter((p) => p.lat === undefined && (!p.searchable || tried.has(p.key)));

  return (
    <section className="day-map">
      <div className="day-map__canvas-wrap" ref={wrapRef}>
        <div className="day-map__canvas" ref={mapEl} />
        {focused && !picking && (
          <button type="button" className="day-map__fit" onClick={() => fitToLocated(true)}>
            전체 보기
          </button>
        )}
        {picking && (
          <div className="day-map__hint">
            <span>지도를 눌러 ‘{picking.label}’ 위치를 지정하세요</span>
            <button type="button" onClick={() => setPickingKey(null)}>
              취소
            </button>
          </div>
        )}
      </div>

      {needsPin.length > 0 && (
        <div className="day-map__needs-pin">
          <p>위치를 찾지 못한 장소가 있어요. 눌러서 지도에 직접 찍어 주세요.</p>
          <div className="day-map__needs-pin-chips">
            {needsPin.map((p) => (
              <button key={p.key} type="button" onClick={() => startPicking(p.key)}>
                <span className={p.choice ? 'day-map__needs-pin-number day-map__needs-pin-number--choice' : 'day-map__needs-pin-number'}>
                  {p.number}
                </span>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {places.some((p) => p.choice) && (
        <div className="day-map__legend">
          <span>
            <i className="day-map__legend-dot" />
            일정
          </span>
          <span>
            <i className="day-map__legend-dot day-map__legend-dot--choice" />
            선택지
          </span>
        </div>
      )}

      <button type="button" className="day-map__manage" aria-expanded={managing} onClick={() => setManaging((v) => !v)}>
        <span>
          장소 {places.length}곳{unlocated > 0 && searching === null ? ` · 위치를 찾지 못한 곳 ${unlocated}곳` : ''}
          {searching !== null ? ' · 위치 찾는 중…' : ''}
        </span>
        <span className={managing ? 'day-map__chevron day-map__chevron--open' : 'day-map__chevron'}>
          <ChevronIcon />
        </span>
      </button>

      {managing && (
        <ol className="day-map__list">
          {places.map((p) => {
            return (
              <li key={p.key} className="day-map__row">
                <button type="button" className="day-map__row-main" onClick={() => focusPlace(p)}>
                  <span className={badgeClass(p)}>{p.number}</span>
                  <span className="day-map__row-text">
                    <span className="day-map__row-label">{p.label}</span>
                    {p.context && <span className="day-map__row-context">{p.context}</span>}
                  </span>
                </button>
                {searching === p.key ? (
                  <span className="day-map__status">찾는 중…</span>
                ) : (
                  <button
                    type="button"
                    className="day-map__locate"
                    onClick={() => startPicking(p.key)}
                  >
                    {p.lat !== undefined ? '위치 수정' : '위치 지정'}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
