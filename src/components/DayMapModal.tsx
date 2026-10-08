import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ScheduleItem } from '../types';
import { formatDateWithWeekday } from '../utils/date';
import { getDayPlaces, parseCoords, type Coords } from '../utils/dayPlaces';
import { geocodePlace } from '../utils/geocode';

type Props = {
  items: ScheduleItem[];
  mapUrl: string;
  onPlaceCoords: (itemId: string, placeId: string, coords: Coords) => void;
  onClose: () => void;
};

function todayString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function DayMapModal({ items, mapUrl, onPlaceCoords, onClose }: Props) {
  const dates = useMemo(
    () => [...new Set(items.map((i) => i.date))].filter((d) => getDayPlaces(items, d).length > 0).sort(),
    [items],
  );
  const [date, setDate] = useState(() => {
    const today = todayString();
    return dates.includes(today) ? today : (dates[0] ?? '');
  });
  const [searching, setSearching] = useState<string | null>(null);
  const [pickingKey, setPickingKey] = useState<string | null>(null);

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
  let number = 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">지도</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {dates.length === 0 ? (
          <p className="day-map__empty">지도에 표시할 장소가 없습니다. 이동 경로나 선택지에 장소를 추가하면 여기에 나타납니다.</p>
        ) : (
          <>
            <div className="day-map__days" role="tablist">
              {dates.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={d === date}
                  className={d === date ? 'day-map__day day-map__day--active' : 'day-map__day'}
                  onClick={() => {
                    setPickingKey(null);
                    setDate(d);
                  }}
                >
                  {formatDateWithWeekday(d)}
                </button>
              ))}
            </div>

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

            <ol className="day-map__list">
              {places.map((p) => {
                const hasCoords = p.lat !== undefined;
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
                        {hasCoords ? '위치 수정' : '위치 지정'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
            {located.length === 0 && searching === null && (
              <p className="day-map__empty">장소의 위치를 찾지 못했습니다. ‘위치 지정’을 눌러 지도에서 직접 찍어 주세요.</p>
            )}
          </>
        )}

        {mapUrl && (
          <a className="day-map__external" href={mapUrl} target="_blank" rel="noreferrer">
            내 지도 열기 ↗
          </a>
        )}
      </div>
    </div>
  );
}
