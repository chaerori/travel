import { useRef, useState } from 'react';
import type { PrepItem } from '../types';
import { makeId } from '../utils/id';

type Props = {
  prep: PrepItem[];
  onChange: (prep: PrepItem[]) => void;
  onClose: () => void;
};

export function PrepChecklistModal({ prep, onChange, onClose }: Props) {
  const [label, setLabel] = useState('');
  const dragIndex = useRef<number | null>(null);

  function handleDragPointerDown(e: React.PointerEvent<HTMLSpanElement>, index: number) {
    dragIndex.current = index;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDragPointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    if (dragIndex.current === null) return;
    const target = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>('[data-prep-index]');
    if (!target) return;
    const targetIndex = Number(target.dataset.prepIndex);
    if (targetIndex === dragIndex.current) return;
    const fromIndex = dragIndex.current;
    const next = [...prep];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
    dragIndex.current = targetIndex;
  }

  function handleDragPointerUp() {
    dragIndex.current = null;
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    onChange([...prep, { id: makeId(), label: trimmed, checked: false }]);
    setLabel('');
  }

  function toggleItem(id: string) {
    onChange(prep.map((p) => (p.id === id ? { ...p, checked: !p.checked } : p)));
  }

  function removeItem(id: string) {
    onChange(prep.filter((p) => p.id !== id));
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">준비물</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {prep.length > 0 && (
          <ul className="prep-list">
            {prep.map((p, index) => (
              <li key={p.id} className="checklist-row" data-prep-index={index}>
                {prep.length > 1 && (
                  <span
                    className="drag-handle"
                    onPointerDown={(ev) => handleDragPointerDown(ev, index)}
                    onPointerMove={handleDragPointerMove}
                    onPointerUp={handleDragPointerUp}
                    onPointerCancel={handleDragPointerUp}
                  >
                    ⠿
                  </span>
                )}
                <label className="prep-list__row">
                  <input type="checkbox" checked={p.checked} onChange={() => toggleItem(p.id)} />
                  <span className={p.checked ? 'prep-list__label prep-list__label--checked' : 'prep-list__label'}>
                    {p.label}
                  </span>
                </label>
                <button type="button" className="icon-btn" onClick={() => removeItem(p.id)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="link-editor__row" onSubmit={addItem}>
          <input type="text" placeholder="준비물 이름" value={label} onChange={(e) => setLabel(e.target.value)} />
          <button type="submit" className="add-btn">
            추가
          </button>
        </form>
      </div>
    </div>
  );
}
