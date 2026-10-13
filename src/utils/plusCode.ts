// 구글 지도 주소의 `!20s8Q8CRJFF+GCJ`는 장소의 플러스 코드(Open Location Code)다.
// 장소 위치를 몇 m 이내로 담고 있어, 주소에 `!3d위도!4d경도`가 없을 때(국내 장소 등) 이것으로 좌표를 얻는다.

const ALPHABET = '23456789CFGHJMPQRVWX';
const PAIR_RESOLUTION = [20, 1, 0.05, 0.0025, 0.000125];

/** 앞 8자리 + `+` + 2자리 이상으로 된 전체 플러스 코드를 위도·경도(코드 영역의 중심)로 바꾼다. 형식이 맞지 않으면 null. */
export function plusCodeToLatLng(code: string): { lat: number; lng: number } | null {
  const m = code.toUpperCase().match(/^([0-9A-Z]{8})\+([0-9A-Z]{2,})$/);
  if (!m) return null;
  const digits = m[1] + m[2];
  if ([...digits].some((c) => !ALPHABET.includes(c))) return null;

  let lat = -90;
  let lng = -180;
  for (let i = 0; i < Math.min(digits.length, 10); i += 2) {
    const res = PAIR_RESOLUTION[i / 2];
    lat += ALPHABET.indexOf(digits[i]) * res;
    lng += ALPHABET.indexOf(digits[i + 1]) * res;
  }
  let latRes = PAIR_RESOLUTION[Math.min(digits.length, 10) / 2 - 1];
  let lngRes = latRes;
  // 11자리 이상은 4×5 격자로 한 단계씩 더 잘게 나눈다.
  for (let i = 10; i < digits.length; i++) {
    const d = ALPHABET.indexOf(digits[i]);
    latRes /= 5;
    lngRes /= 4;
    lat += Math.floor(d / 4) * latRes;
    lng += (d % 4) * lngRes;
  }
  lat += latRes / 2;
  lng += lngRes / 2;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : null;
}
