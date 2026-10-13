// 구글 지도 주소의 장소 식별자(`!1s0x…:0x…`)에서 앞의 16자리 16진수는 S2 셀 ID로, 장소 위치를 담고 있다.
// 주소에 `!3d위도!4d경도`가 없을 때(국내 장소 등) 이 값을 풀어서 좌표를 얻는다.

/** Hilbert 곡선 위치(0~3)를 셀 안의 (i, j) 비트로 바꾸는 표. 방향(orientation)마다 다르다. */
const POS_TO_IJ = [
  [0, 1, 3, 2],
  [0, 2, 3, 1],
  [3, 2, 0, 1],
  [3, 1, 0, 2],
];
const POS_TO_ORIENTATION = [1, 0, 0, 3];

/** S2의 구면 투영(2차 변환): 면 위의 [0, 1] 좌표를 [-1, 1] 좌표로. */
function stToUv(s: number): number {
  return s >= 0.5 ? (4 * s * s - 1) / 3 : (1 - 4 * (1 - s) * (1 - s)) / 3;
}

/** 16자리 16진수 S2 셀 ID(레벨 30 기준)를 위도·경도로 바꾼다. 형식이 맞지 않으면 null. */
export function s2CellToLatLng(hex: string): { lat: number; lng: number } | null {
  if (!/^[0-9a-f]{16}$/i.test(hex)) return null;
  const id = BigInt(`0x${hex}`);
  const face = Number(id >> 61n);
  if (face > 5) return null;

  let orientation = face & 1;
  let i = 0;
  let j = 0;
  for (let level = 1; level <= 30; level++) {
    const pos = Number((id >> BigInt(61 - 2 * level)) & 3n);
    const ij = POS_TO_IJ[orientation][pos];
    i = i * 2 + (ij >> 1);
    j = j * 2 + (ij & 1);
    orientation ^= POS_TO_ORIENTATION[pos];
  }

  const u = stToUv((i + 0.5) / 2 ** 30);
  const v = stToUv((j + 0.5) / 2 ** 30);
  const [x, y, z] = [
    [1, u, v],
    [-u, 1, v],
    [-u, -v, 1],
    [-1, -v, -u],
    [v, -1, -u],
    [v, u, -1],
  ][face];
  const lat = (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI;
  const lng = (Math.atan2(y, x) * 180) / Math.PI;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}
