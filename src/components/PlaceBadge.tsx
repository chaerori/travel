import type { PlaceBadgeInfo } from '../utils/dayPlaces';

type Props = {
  info: PlaceBadgeInfo;
  onClick: () => void;
};

/** 일정 카드 안에서 지도 핀과 같은 번호를 보여 주는 배지. 누르면 지도가 그 장소로 이동한다. */
export function PlaceBadge({ info, onClick }: Props) {
  const className = [
    'place-badge',
    info.choice && 'place-badge--choice',
    info.candidate && 'place-badge--candidate',
    info.unplaced && 'place-badge--unplaced',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <span
      role="button"
      tabIndex={0}
      className={className}
      aria-label={info.unplaced ? `${info.number}번 위치 지정하기` : `지도에서 ${info.number}번 보기`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
    >
      {info.number}
    </span>
  );
}
