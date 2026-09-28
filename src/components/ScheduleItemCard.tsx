import { useState } from 'react';
import type { ScheduleItem } from '../types';
import { formatTimeRange } from '../utils/date';
import { DeleteIcon } from './icons/DeleteIcon';
import { PencilIcon } from './icons/PencilIcon';
import { LinkRow } from './LinkRow';

type Props = {
  item: ScheduleItem;
  onUpdate: (item: ScheduleItem) => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function ScheduleItemCard({ item, onUpdate, onEdit, onDelete }: Props) {
  const [prepOpen, setPrepOpen] = useState(false);

  function toggleChoice(optionId: string) {
    if (item.content.type !== 'choices') return;
    const selectedId = item.content.selectedId === optionId ? null : optionId;
    onUpdate({ ...item, content: { ...item.content, selectedId } });
  }

  function togglePrep(prepId: string) {
    onUpdate({
      ...item,
      prep: item.prep.map((p) => (p.id === prepId ? { ...p, checked: !p.checked } : p)),
    });
  }

  return (
    <div className="item-card">
      <div className="item-card__time">{formatTimeRange(item.startTime, item.endTime)}</div>

      <div className="item-card__body">
        {item.content.type === 'fixed' && (
          <div className="item-card__content">
            <LinkRow item={item.content.item} />
          </div>
        )}

        {item.content.type === 'choices' && (
          <div className="item-card__content item-card__content--choices">
            {item.content.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={
                  'choice-row' + (item.content.type === 'choices' && item.content.selectedId === opt.id ? ' choice-row--selected' : '')
                }
                onClick={() => toggleChoice(opt.id)}
              >
                <span className="choice-row__dot" />
                <LinkRow item={opt} />
              </button>
            ))}
          </div>
        )}

        {item.content.type === 'route' &&
          (() => {
            const stops = item.content.stops;
            return (
              <div className="item-card__content item-card__content--route">
                {stops.map((stop, i) => (
                  <span key={stop.id} className="route-stop">
                    <LinkRow item={stop} />
                    {i < stops.length - 1 && <span className="route-arrow">→</span>}
                  </span>
                ))}
              </div>
            );
          })()}

        {item.memo && <div className="item-card__memo">{item.memo}</div>}

        {item.prep.length > 0 && (
          <div className="item-card__prep">
            <button type="button" className="prep-toggle" onClick={() => setPrepOpen((v) => !v)}>
              준비물 {prepOpen ? '▾' : '▸'}
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
