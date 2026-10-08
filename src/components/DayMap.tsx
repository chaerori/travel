import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronIcon } from './icons/ChevronIcon';
import type { ScheduleItem } from '../types';
import { getDayPlaces, parseCoords, type Coords } from '../utils/dayPlaces';
import { geocodePlace } from '../utils/geocode';

type Props = {
  items: ScheduleItem[];
  date: string;
  onPlaceCoords: (itemId: string, placeId: string, coords: Coords) => void;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function DayMap({ items, date, onPlaceCoords }: Props) {
  const [searching, setSearching] = useState<string | null>(null);
  const [pickingKey, setPickingKey] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);

  const places = useMemo(() => getDayPlaces(items, date), [items, date]);
  const located = places.filter((p) => p.lat !== undefined && p.lng !== undefined);

  const mapEl = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onCoordsRef = useRef(onPlaceCoords);
  onCoordsRef.current = onPlaceCoords;
  const placesRef = useRef(places);
  placesRef.current = places;
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
    let n = 0;
    const route: L.LatLngTuple[] = [];
    for (const p of located) {
      const point: L.LatLngTuple = [p.lat!, p.lng!];
      const label = p.numbered ? String(++n) : '?';
      const icon = L.divIcon({
        className: 'day-map__marker',
        html: `<span class="day-map__pin${p.numbered ? '' : ' day-map__pin--candidate'}">${label}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker(point, { icon }).bindTooltip(p.label, { direction: 'top', offset: [0, -12] }).addTo(layer);
      if (p.numbered) route.push(point);
    }
    if (route.length > 1) {
      L.polyline(route, { color: '#6c5ce7', weight: 3, opacity: 0.55, dashArray: '6 8' }).addTo(layer);
    }
    if (located.length === 1) map.setView([located[0].lat!, located[0].lng!], 15, { animate: false });
    else if (located.length > 1) map.fitBounds(L.latLngBounds(located.map((p) => [p.lat!, p.lng!] as L.LatLngTuple)), { padding: [36, 36], maxZoom: 16, animate: false });
  }, [located.map((p) => `${p.key}:${p.lat}:${p.lng}:${p.numbered}`).join('|')]);

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
        await sleep(1100);
      }
      if (!cancelled) setSearching(null);
    })();
    return () => {
      cancelled = true;
      setSearching(null);
    };
  }, [date]);

  const picking = places.find((p) => p.key === pickingKey);
  const unlocated = places.length - located.length;
  let number = 0;

  return (
    <section className="day-map">
      <div className="day-map__canvas-wrap" ref={wrapRef}>
        <div className="day-map__canvas" ref={mapEl} />
        {picking && (
          <div className="day-map__hint">
            <span>지도를 눌러 ‘{picking.label}’ 위치를 지정하세요</span>
            <button type="button" onClick={() => setPickingKey(null)}>
              취소
            </button>
          </div>
        )}
      </div>

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
            const badge = p.numbered ? String(++number) : '?';
            return (
              <li key={p.key} className="day-map__row">
                <span className={p.numbered ? 'day-map__badge' : 'day-map__badge day-map__badge--candidate'}>{badge}</span>
                <span className="day-map__row-text">
                  <span className="day-map__row-label">{p.label}</span>
                  {p.context && <span className="day-map__row-context">{p.context}</span>}
                </span>
                {searching === p.key ? (
                  <span className="day-map__status">찾는 중…</span>
                ) : (
                  <button
                    type="button"
                    className="day-map__locate"
                    onClick={() => {
                      setPickingKey(p.key);
                      wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
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
