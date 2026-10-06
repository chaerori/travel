import { isNativeApp } from './nativePlatform';

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '');
}

/**
 * 현재 경로의 여행 슬러그. 목록 화면이면 null을 반환한다.
 * 네이티브 앱(Capacitor)은 정적 파일 서버라 /<slug>/ 같은 하위 경로가
 * 없으므로 쿼리스트링(?trip=<slug>)으로 구분한다.
 */
export function getTripSlug(): string | null {
  if (isNativeApp()) {
    const raw = new URLSearchParams(window.location.search).get('trip');
    if (!raw) return null;
    const sanitized = slugify(decodeURIComponent(raw));
    return sanitized || null;
  }

  const base = import.meta.env.BASE_URL;
  let path = window.location.pathname;
  if (path.startsWith(base)) path = path.slice(base.length);

  const rawSlug = path.split('/').filter(Boolean)[0];
  if (!rawSlug) return null;

  const sanitized = slugify(decodeURIComponent(rawSlug));
  return sanitized || null;
}

/** 여행 상세 화면으로 이동할 URL. 웹은 경로 기반, 네이티브는 쿼리스트링 기반. */
export function tripUrl(id: string): string {
  const base = import.meta.env.BASE_URL;
  return isNativeApp() ? `${base}?trip=${encodeURIComponent(id)}` : `${base}${id}/`;
}
