export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '');
}

/** 현재 경로의 여행 슬러그. 루트('/travel/')면 목록 화면을 위해 null을 반환한다. */
export function getTripSlug(): string | null {
  const base = import.meta.env.BASE_URL;
  let path = window.location.pathname;
  if (path.startsWith(base)) path = path.slice(base.length);

  const rawSlug = path.split('/').filter(Boolean)[0];
  if (!rawSlug) return null;

  const sanitized = slugify(decodeURIComponent(rawSlug));
  return sanitized || null;
}
