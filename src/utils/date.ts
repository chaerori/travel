const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDateWithWeekday(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = WEEKDAYS[d.getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  if (!endTime || endTime === startTime) return startTime;
  return `${startTime} - ${endTime}`;
}
