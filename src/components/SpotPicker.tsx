import { useEffect, useRef, useState } from 'react';
import type { LinkedText, Spot } from '../types';
import { BikeIcon } from './icons/BikeIcon';
import { BusIcon } from './icons/BusIcon';
import { CameraIcon } from './icons/CameraIcon';
import { ChevronIcon } from './icons/ChevronIcon';
import { TramIcon } from './icons/TramIcon';

/** 예전 데이터(photoSpot)도 사진 스폿으로 취급한다. */
export function getSpot(link: LinkedText): Spot | undefined {
  return link.spot ?? (link.photoSpot ? 'photo' : undefined);
}

export function SpotIcon({ spot }: { spot: Spot }) {
  switch (spot) {
    case 'bike':
      return <BikeIcon />;
    case 'tram':
      return <TramIcon />;
    case 'bus':
      return <BusIcon />;
    default:
      return <CameraIcon />;
  }
}

const OPTIONS: { value: Spot | undefined; label: string }[] = [
  { value: undefined, label: '없음' },
  { value: 'photo', label: '포토 스팟' },
  { value: 'bike', label: '자전거' },
  { value: 'tram', label: '트램' },
  { value: 'bus', label: '버스' },
];

type Props = {
  value: Spot | undefined;
  onChange: (value: Spot | undefined) => void;
};

/** 이동 경로 장소 옆에 표시할 아이콘(카메라/자전거/트램/버스)을 고르는 드롭다운. */
export function SpotPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOutside(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  return (
    <div className="spot-picker" ref={ref}>
      <button
        type="button"
        className={value ? 'icon-action icon-action--active spot-picker__btn' : 'icon-action spot-picker__btn'}
        onClick={() => setOpen((v) => !v)}
        aria-label="장소 아이콘"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value ? <SpotIcon spot={value} /> : <span className="spot-picker__none">—</span>}
        <span className="spot-picker__chevron">
          <ChevronIcon />
        </span>
      </button>
      {open && (
        <ul className="spot-picker__menu" role="listbox">
          {OPTIONS.map((o) => (
            <li key={o.label} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={o.value === value ? 'spot-picker__option spot-picker__option--selected' : 'spot-picker__option'}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <span className="spot-picker__option-icon">{o.value ? <SpotIcon spot={o.value} /> : null}</span>
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
