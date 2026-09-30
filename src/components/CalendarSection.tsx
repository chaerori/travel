import type { ScheduleItem } from '../types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

type Props = {
  items: ScheduleItem[];
  onSelectDate: (date: string) => void;
};

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(d: Date): Date {
  return addDays(d, -d.getDay());
}

export function CalendarSection({ items, onSelectDate }: Props) {
  if (items.length === 0) {
    return (
      <div className="calendar">
        <div className="calendar__weekdays">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="calendar__grid">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <span key={n} className="calendar__day calendar__day--empty">
              {n}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const itemDates = new Set(items.map((i) => i.date));
  const sortedDates = [...itemDates].sort();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDate = sortedDates.length > 0 ? new Date(`${sortedDates[0]}T00:00:00`) : today;
  const lastDate =
    sortedDates.length > 0 ? new Date(`${sortedDates[sortedDates.length - 1]}T00:00:00`) : today;

  const gridStart = startOfWeek(firstDate);
  const gridEnd = addDays(startOfWeek(lastDate), 6);
  const dayCount = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86400000) + 1;
  const days = Array.from({ length: dayCount }, (_, i) => addDays(gridStart, i));

  return (
    <div className="calendar">
      <div className="calendar__weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="calendar__grid">
        {days.map((d, index) => {
          const dateStr = toDateStr(d);
          const hasSchedule = itemDates.has(dateStr);
          if (!hasSchedule) {
            return (
              <span key={dateStr} className="calendar__day calendar__day--empty">
                {d.getDate()}
              </span>
            );
          }

          const col = index % 7;
          const prevScheduled = col > 0 && itemDates.has(toDateStr(days[index - 1]));
          const nextScheduled = col < 6 && itemDates.has(toDateStr(days[index + 1]));
          const variant = !prevScheduled && !nextScheduled
            ? 'solo'
            : !prevScheduled && nextScheduled
              ? 'start'
              : prevScheduled && !nextScheduled
                ? 'end'
                : 'middle';

          return (
            <button
              key={dateStr}
              type="button"
              className={`calendar__day calendar__day--${variant}`}
              onClick={() => onSelectDate(dateStr)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
