const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDateWithWeekday(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = WEEKDAYS[d.getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

export function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + m + hours * 60 + 24 * 60) % (24 * 60);
  const nextH = Math.floor(total / 60);
  const nextM = total % 60;
  return `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
}
