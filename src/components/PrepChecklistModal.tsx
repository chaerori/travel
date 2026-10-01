import { useEffect, useRef, useState } from 'react';
import type { Luggage, PrepItem } from '../types';
import { makeId } from '../utils/id';

type Props = {
  luggage: Luggage[];
  onChange: (luggage: Luggage[]) => void;
  onClose: () => void;
};

export function PrepChecklistModal({ luggage, onChange, onClose }: Props) {
  const [activeId, setActiveId] = useState<string | null>(luggage[0]?.id ?? null);
  const [addingTab, setAddingTab] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [tabNameDraft, setTabNameDraft] = useState('');
  const [label, setLabel] = useState('');
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    if (luggage.length === 0) {
      const tab: Luggage = { id: makeId(), name: '캐리어 1', items: [] };
      onChange([tab]);
      setActiveId(tab.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = luggage.find((l) => l.id === activeId) ?? null;

  function switchTab(id: string) {
    setActiveId(id);
    setAddingTab(false);
    setRenamingId(null);
  }

  function startAddTab() {
    setTabNameDraft('');
    setAddingTab(true);
    setRenamingId(null);
  }

  function commitAddTab() {
    const name = tabNameDraft.trim();
    if (name) {
      const tab: Luggage = { id: makeId(), name, items: [] };
      onChange([...luggage, tab]);
      setActiveId(tab.id);
    }
    setAddingTab(false);
  }

  function startRenameTab(l: Luggage) {
    setTabNameDraft(l.name);
    setRenamingId(l.id);
    setAddingTab(false);
  }

  function commitRenameTab() {
    const name = tabNameDraft.trim();
    if (name && renamingId) {
      onChange(luggage.map((l) => (l.id === renamingId ? { ...l, name } : l)));
    }
    setRenamingId(null);
  }

  function deleteTab() {
    if (!active) return;
    if (!confirm(`"${active.name}" 짐을 삭제할까요?`)) return;
    const next = luggage.filter((l) => l.id !== active.id);
    onChange(next);
    setActiveId(next[0]?.id ?? null);
  }

  function updateItems(items: PrepItem[]) {
    if (!active) return;
    onChange(luggage.map((l) => (l.id === active.id ? { ...l, items } : l)));
  }

  function handleDragPointerDown(e: React.PointerEvent<HTMLSpanElement>, index: number) {
    dragIndex.current = index;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDragPointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    if (dragIndex.current === null || !active) return;
    const target = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>('[data-prep-index]');
    if (!target) return;
    const targetIndex = Number(target.dataset.prepIndex);
    if (targetIndex === dragIndex.current) return;
    const fromIndex = dragIndex.current;
    const next = [...active.items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(targetIndex, 0, moved);
    updateItems(next);
    dragIndex.current = targetIndex;
  }

  function handleDragPointerUp() {
    dragIndex.current = null;
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed || !active) return;
    updateItems([...active.items, { id: makeId(), label: trimmed, checked: false }]);
    setLabel('');
  }

  function toggleItem(id: string) {
    if (!active) return;
    updateItems(active.items.map((p) => (p.id === id ? { ...p, checked: !p.checked } : p)));
  }

  function removeItem(id: string) {
    if (!active) return;
    updateItems(active.items.filter((p) => p.id !== id));
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">짐 체크리스트</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {luggage.length > 0 && (
          <div className="places-tabs">
            {luggage.map((l) =>
              l.id === activeId ? (
                <div key={l.id} className="places-tab places-tab--active prep-tab--active">
                  {l.id === renamingId ? (
                    <input
                      className="prep-tab__input"
                      autoFocus
                      value={tabNameDraft}
                      onChange={(e) => setTabNameDraft(e.target.value)}
                      onBlur={commitRenameTab}
                      onKeyDown={(e) => e.key === 'Enter' && commitRenameTab()}
                    />
                  ) : (
                    <button type="button" className="prep-tab__label" onClick={() => startRenameTab(l)}>
                      {l.name}
                    </button>
                  )}
                  <button type="button" className="icon-btn" onClick={deleteTab} aria-label="삭제">
                    ✕
                  </button>
                </div>
              ) : (
                <button key={l.id} type="button" className="places-tab" onClick={() => switchTab(l.id)}>
                  {l.name}
                </button>
              ),
            )}
            {addingTab ? (
              <div className="places-tab">
                <input
                  className="prep-tab__input"
                  autoFocus
                  placeholder="짐 이름"
                  value={tabNameDraft}
                  onChange={(e) => setTabNameDraft(e.target.value)}
                  onBlur={commitAddTab}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitAddTab();
                    if (e.key === 'Escape') setAddingTab(false);
                  }}
                />
              </div>
            ) : (
              <button type="button" className="places-tab" onClick={startAddTab}>
                + 짐 추가
              </button>
            )}
          </div>
        )}

        {active && active.items.length > 0 && (
          <ul className="prep-list">
            {active.items.map((p, index) => (
              <li key={p.id} className="checklist-row" data-prep-index={index}>
                {active.items.length > 1 && (
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

        {active && (
          <form className="link-editor__row" onSubmit={addItem}>
            <input type="text" placeholder="예: 세면도구" value={label} onChange={(e) => setLabel(e.target.value)} />
            <button type="submit" className="add-btn">
              추가
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
