export type DateRange = { start: string; end: string };

/** 일정 날짜들 중 가장 이른 날과 가장 늦은 날. 일정이 없으면 null. */
export function tripDateRange(items: { date: string }[]): DateRange | null {
  const dates = items.map((i) => i.date).filter(Boolean).sort();
  return dates.length > 0 ? { start: dates[0], end: dates[dates.length - 1] } : null;
}

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000);
}

export type DDay = {
  /** 화면에 보여 줄 글자: D-12, D-Day, 여행 중, 종료. 일정이 없으면 null. */
  label: string | null;
  /** 정렬용 그룹: 0 진행 중·오늘, 1 다가오는 여행, 2 날짜 없음, 3 지난 여행 */
  group: 0 | 1 | 2 | 3;
  /** 그룹 안에서의 순서(작을수록 앞). 다가오는 여행은 남은 날수, 지난 여행은 끝난 지 오래된 정도. */
  order: number;
};

export function dDay(range: DateRange | null, today: string): DDay {
  if (!range) return { label: null, group: 2, order: 0 };
  if (today < range.start) {
    const left = daysBetween(today, range.start);
    return { label: `D-${left}`, group: 1, order: left };
  }
  if (today <= range.end) {
    return { label: today === range.start ? 'D-Day' : '여행 중', group: 0, order: daysBetween(range.start, today) };
  }
  return { label: '종료', group: 3, order: daysBetween(range.end, today) };
}

/** 여행 목록 정렬: 진행 중 → 디데이가 가까운 순 → 날짜 없는 여행 → 지난 여행(최근에 끝난 순). */
export function compareDDay(a: DDay, b: DDay): number {
  return a.group - b.group || a.order - b.order;
}
