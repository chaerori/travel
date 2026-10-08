import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronIcon } from './icons/ChevronIcon';
import type { ScheduleItem } from '../types';
import { getDayPlaces, parseCoords, type Coords, type DayPlace } from '../utils/dayPlaces';

type Props = {
  items: ScheduleItem[];
  date: string;
  onPlaceCoords: (itemId: string, placeId: string, coords: Coords) => void;
};

/** 장소에 넣어 둔 구글 지도 링크. 링크가 없으면 지도에 표시된 좌표를 구글 지도에서 연다. */
function mapsLinkFor(p: DayPlace): string {
  if (p.url && /^https?:\/\//i.test(p.url)) return p.url;
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}

/** 겹친 핀을 눌렀을 때 어느 장소의 구글 지도 링크를 열지 고르는 작은 목록. */
function openChooser(map: L.Map, at: L.LatLngTuple, members: DayPlace[], size: number) {
  const box = document.createElement('div');
  box.className = 'day-map__chooser';
  for (const m of members) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'day-map__chooser-item';
    const badge = document.createElement('span');
    badge.className = badgeClass(m);
    badge.textContent = String(m.number);
    const name = document.createElement('span');
    name.textContent = m.label;
    item.append(badge, name);
    item.addEventListener('click', () => {
      map.closePopup();
      window.open(mapsLinkFor(m), '_blank', 'noreferrer');
    });
    box.append(item);
  }
  L.popup({ closeButton: false, className: 'day-map__popup', offset: [0, -size / 2], minWidth: 150 })
    .setLatLng(at)
    .setContent(box)
    .openOn(map);
}

function badgeClass(p: { choice: boolean; candidate: boolean }): string {
  return ['day-map__badge', p.choice && 'day-map__badge--choice', p.candidate && 'day-map__badge--candidate']
    .filter(Boolean)
    .join(' ');
}

export function DayMap({ items, date, onPlaceCoords }: Props) {
  const [pickingKey, setPickingKey] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [focused, setFocused] = useState(false);

  const places = useMemo(() => getDayPlaces(items, date), [items, date]);
  const located = places.filter((p) => p.lat !== undefined && p.lng !== undefined);

  const mapEl = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const drawRef = useRef<(() => void) | null>(null);
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
    map.on('zoomend', () => drawRef.current?.());
    mapRef.current = map;
    // 모달이 올라오는 애니메이션이 끝난 뒤 크기를 다시 계산한다.
    const timer = setTimeout(() => map.invalidateSize(), 350);
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 핀과 경로선을 다시 그린다. 확대·축소하면 겹침 여부가 달라지므로 줌이 바뀔 때도 다시 그린다.
  function drawMarkers() {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    const pts = locatedRef.current;
    const zoom = map.getZoom();
    const px = pts.map((p) => map.project([p.lat!, p.lng!], zoom));

    // 핀은 항상 실제 좌표에 그린다. 축소해서 서로 거의 가려지는 핀(중심이 20px 안)은 한 묶음으로 보고,
    // 묶음의 핀을 누르면 목록에서 고르게 한다. 확대하면 핀이 자연스럽게 떨어져 묶음이 풀린다.
    const size = zoom >= 15 ? 28 : zoom >= 13 ? 24 : 20;
    const groups: number[][] = [];
    pts.forEach((_, i) => {
      const g = groups.find((members) => members.some((j) => px[i].distanceTo(px[j]) < 20));
      if (g) g.push(i);
      else groups.push([i]);
    });
    for (const g of groups) {
      const members = g.map((i) => pts[i]).sort((a, b) => a.number - b.number);
      members.forEach((p, k) => {
        const stackBadge = k === 0 && members.length > 1 ? `<i class="day-map__stack">${members.length}</i>` : '';
        const icon = L.divIcon({
          className: 'day-map__marker',
          html: `<span class="day-map__pin${p.choice ? ' day-map__pin--choice' : ''}${p.candidate ? ' day-map__pin--candidate' : ''}" style="width:${size}px;height:${size}px;line-height:${size - 4}px;font-size:${size >= 28 ? 13 : 11}px">${p.number}</span>${stackBadge}`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        const marker = L.marker([p.lat!, p.lng!], { icon, zIndexOffset: -p.number })
          .bindTooltip(p.label, { direction: 'top', offset: [0, -size / 2] })
          .addTo(layer);
        marker.on('click', () => {
          // 위치를 찍는 중에는 핀을 눌러도 링크를 열지 않는다.
          if (pickingRef.current) return;
          if (members.length > 1) openChooser(map, [p.lat!, p.lng!], members, size);
          else window.open(mapsLinkFor(p), '_blank', 'noreferrer');
        });
        markersRef.current.set(p.key, marker);
      });
    }

    // 경로선은 번호마다 한 곳(선택한 선택지 또는 첫 번째)을 지나게 이어 준다.
    const route: L.LatLngTuple[] = [];
    const routeNumbers = new Set<number>();
    for (const p of pts) {
      if (routeNumbers.has(p.number)) continue;
      const pick = pts.find((q) => q.number === p.number && q.primary) ?? p;
      routeNumbers.add(p.number);
      route.push([pick.lat!, pick.lng!]);
    }
    if (route.length > 1) {
      L.polyline(route, { color: '#6c5ce7', weight: 3, opacity: 0.55, dashArray: '6 8' }).addTo(layer);
    }
  }
  drawRef.current = drawMarkers;

  useEffect(() => {
    drawMarkers();
    fitToLocated(false);
  }, [located.map((p) => `${p.key}:${p.lat}:${p.lng}:${p.number}:${p.choice}:${p.candidate}:${p.primary}`).join('|')]);

  // 링크에 좌표가 있으면 읽어서 저장한다. 짧은 링크처럼 읽을 수 없는 장소는 직접 찍는다.
  useEffect(() => {
    for (const p of places) {
      if (p.lat !== undefined) continue;
      const fromUrl = p.url ? parseCoords(p.url) : null;
      if (fromUrl) onCoordsRef.current(p.itemId, p.placeId, fromUrl);
    }
  }, [places]);

  useEffect(() => {
    setPickingKey(null);
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
  // 링크에서 위치를 읽을 수 없고 아직 찍지 않은 장소는 직접 찍어야 한다.
  const needsPin = places.filter((p) => p.lat === undefined && !(p.url && parseCoords(p.url)));

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
          <p>링크에서 위치를 읽지 못한 장소예요. 눌러서 지도에 직접 찍어 주세요.</p>
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
          장소 {places.length}곳{needsPin.length > 0 ? ` · 위치를 찍어야 하는 곳 ${needsPin.length}곳` : ''}
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
                <button type="button" className="day-map__locate" onClick={() => startPicking(p.key)}>
                  {p.lat !== undefined ? '위치 수정' : '위치 지정'}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
