const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** true면 비움 선택지 없이 항상 값을 갖는다. */
  required?: boolean;
};

/** 분을 5분 단위로만 고르는 시간 선택. 값은 'HH:MM' 문자열이며 비어 있으면 ''. */
export function TimeSelect({ value, onChange, required }: Props) {
  const [hour = '', minute = ''] = value ? value.split(':') : [];
  // 기존 일정의 5분 단위가 아닌 분도 그대로 보여 주기 위해 선택지에 포함한다.
  const minutes = MINUTES.includes(minute) || !minute ? MINUTES : [...MINUTES, minute].sort();

  function handleHour(next: string) {
    onChange(next ? `${next}:${minute || '00'}` : '');
  }

  function handleMinute(next: string) {
    onChange(`${hour || '00'}:${next}`);
  }

  return (
    <div className="time-select">
      <select value={hour} onChange={(e) => handleHour(e.target.value)} required={required} aria-label="시">
        {!required && <option value="">--</option>}
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span aria-hidden="true">:</span>
      <select
        value={hour ? minute : ''}
        onChange={(e) => handleMinute(e.target.value)}
        disabled={!hour}
        aria-label="분"
      >
        {!hour && <option value="">--</option>}
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
