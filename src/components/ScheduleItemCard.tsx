import { useState } from 'react';
import type { ScheduleItem } from '../types';
import type { PlaceBadgeInfo } from '../utils/dayPlaces';
import { ChevronIcon } from './icons/ChevronIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { LinkIcon } from './icons/LinkIcon';
import { PencilIcon } from './icons/PencilIcon';
import { PlaceBadge } from './PlaceBadge';
import { SpotIcon, getSpot } from './SpotPicker';

function isUrl(value: string): boolean {
  return /^https?:\/\//.test(value);
}

type Props = {
  item: ScheduleItem;
  onUpdate: (item: ScheduleItem) => void;
  onEdit: () => void;
  onDelete: () => void;
  /** 지도 번호(`일정id:장소id` 키). 없으면 번호를 표시하지 않는다. */
  badges?: Record<string, PlaceBadgeInfo>;
  onPlaceBadge?: (key: string) => void;
};

export function ScheduleItemCard({ item, onUpdate, onEdit, onDelete, badges, onPlaceBadge }: Props) {
  const [prepOpen, setPrepOpen] = useState(false);

  function badgeFor(placeId: string) {
    const key = `${item.id}:${placeId}`;
    const info = badges?.[key];
    return info && onPlaceBadge ? <PlaceBadge info={info} onClick={() => onPlaceBadge(key)} /> : null;
  }

  function togglePrep(prepId: string) {
    onUpdate({
      ...item,
      prep: item.prep.map((p) => (p.id === prepId ? { ...p, checked: !p.checked } : p)),
    });
  }

  return (
    <div className="item-card">
      <div className="item-card__time">
        <span className="item-card__time-start">{item.startTime}</span>
        {item.endTime && item.endTime !== item.startTime && (
          <span className="item-card__time-end">- {item.endTime}</span>
        )}
      </div>

      <div className="item-card__body">
        {item.content.type === 'fixed' && (
          <div className="item-card__content">
            <div className="item-card__fixed-row">
              {badgeFor(item.content.item.id)}
              <span className="link-row link-row--plain">{item.content.item.label}</span>
              {item.content.info &&
                (isUrl(item.content.info) ? (
                  <a
                    className="icon-action"
                    href={item.content.info}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="정보"
                  >
                    <LinkIcon />
                  </a>
                ) : (
                  <span className="icon-action" title={item.content.info} aria-label="정보">
                    <LinkIcon />
                  </span>
                ))}
              {item.needsReservation && <span className="reservation-tag">예약 필요</span>}
            </div>
          </div>
        )}

        {item.content.type === 'choices' && (
          <div className="item-card__content">
            {item.content.title && (
              <div className="item-card__title">
                {item.content.title}
                {item.needsReservation && <span className="reservation-tag">예약 필요</span>}
              </div>
            )}
            <div className="item-card__content--choices">
              {item.content.options.map((opt) => (
                <div key={opt.id} className="choice-row">
                  {badgeFor(opt.id)}
                  <span className="link-row link-row--plain">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {item.content.type === 'route' &&
          (() => {
            const { title, stops } = item.content;
            return (
              <div className="item-card__content">
                {title && (
                  <div className="item-card__title">
                    {title}
                    {item.needsReservation && <span className="reservation-tag">예약 필요</span>}
                  </div>
                )}
                <div className="item-card__content--route">
                  {stops.map((stop, i) => (
                    <span key={stop.id} className="route-step">
                      <span className="route-stop">
                        {badgeFor(stop.id)}
                        <span className="link-row link-row--plain">{stop.label}</span>
                        {getSpot(stop) && (
                          <span className="route-stop__photo-icon">
                            <SpotIcon spot={getSpot(stop)!} />
                          </span>
                        )}
                      </span>
                      {i < stops.length - 1 && <span className="route-arrow">→</span>}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

        {item.memo && <div className="item-card__memo">{item.memo}</div>}

        {item.prep.length > 0 && (
          <div className="item-card__prep">
            <button type="button" className="prep-toggle" onClick={() => setPrepOpen((v) => !v)}>
              준비물
              <span className={prepOpen ? 'prep-toggle__chevron prep-toggle__chevron--open' : 'prep-toggle__chevron'}>
                <ChevronIcon />
              </span>
            </button>
            {prepOpen && (
              <ul className="prep-list">
                {item.prep.map((p) => (
                  <li key={p.id}>
                    <label className="prep-list__row">
                      <input type="checkbox" checked={p.checked} onChange={() => togglePrep(p.id)} />
                      <span className={p.checked ? 'prep-list__label prep-list__label--checked' : 'prep-list__label'}>
                        {p.label}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="item-card__actions">
        <button type="button" className="icon-action" onClick={onEdit} aria-label="수정">
          <PencilIcon />
        </button>
        <button type="button" className="icon-action icon-action--danger" onClick={onDelete} aria-label="삭제">
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
}
