import { useState } from 'react';
import type { BookmarkCategory, BookmarkItem, Bookmarks } from '../types';
import { makeId } from '../utils/id';
import { DeleteIcon } from './icons/DeleteIcon';
import { PencilIcon } from './icons/PencilIcon';
import { parseCoords } from '../utils/dayPlaces';
import { LinkRow } from './LinkRow';
import { StarIcon } from './icons/StarIcon';
import { useSheet } from '../utils/useSheet';

const CATEGORIES: { key: BookmarkCategory; label: string }[] = [
  { key: 'food', label: '식당' },
  { key: 'cafe', label: '카페' },
  { key: 'attraction', label: '관광지' },
];

type FormState = {
  label: string;
  location: string;
  description: string;
  url: string;
};

function emptyForm(): FormState {
  return { label: '', location: '', description: '', url: '' };
}

type Props = {
  bookmarks: Bookmarks;
  onChange: (bookmarks: Bookmarks) => void;
  onClose: () => void;
  /** 이름을 눌렀을 때 앱 안의 지도에서 해당 장소를 보여 준다. 없으면 구글맵 링크를 연다. */
  onShowOnMap?: (id: string) => void;
};

export function PlacesModal({ bookmarks, onChange, onClose, onShowOnMap }: Props) {
  const sheet = useSheet(onClose);
  const [activeCategory, setActiveCategory] = useState<BookmarkCategory>('food');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [locationFilter, setLocationFilter] = useState<string | null>(null);

  const items = bookmarks[activeCategory];
  const locations = [...new Set(items.map((i) => i.location).filter(Boolean))];
  const visibleItems = locationFilter ? items.filter((i) => i.location === locationFilter) : items;

  function switchTab(key: BookmarkCategory) {
    setActiveCategory(key);
    setEditingId(null);
    setForm(emptyForm());
    setLocationFilter(null);
  }

  function startEdit(item: BookmarkItem) {
    setEditingId(item.id);
    setForm({ label: item.label, location: item.location, description: item.description, url: item.url });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const trimmedLabel = form.label.trim();
    if (!trimmedLabel) return;
    const item: BookmarkItem = {
      id: editingId ?? makeId(),
      label: trimmedLabel,
      location: form.location.trim(),
      description: form.description.trim(),
      url: form.url.trim(),
    };
    const next = editingId
      ? bookmarks[activeCategory].map((i) => (i.id === editingId ? item : i))
      : [...bookmarks[activeCategory], item];
    onChange({ ...bookmarks, [activeCategory]: next });
    cancelEdit();
  }

  function removeItem(id: string) {
    onChange({ ...bookmarks, [activeCategory]: bookmarks[activeCategory].filter((i) => i.id !== id) });
    if (editingId === id) cancelEdit();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" ref={sheet.ref} {...sheet.dialogProps}>
        <div className="modal__header" {...sheet.handleProps}>
          <h2 className="modal__title modal__title--star" id={sheet.titleId}>
            가고 싶은 장소
            <StarIcon />
          </h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="places-tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              className={activeCategory === c.key ? 'places-tab places-tab--active' : 'places-tab'}
              onClick={() => switchTab(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {locations.length > 0 && (
          <div className="bookmark-filter">
            <button
              type="button"
              className={'bookmark-filter__chip' + (locationFilter === null ? ' bookmark-filter__chip--active' : '')}
              onClick={() => setLocationFilter(null)}
            >
              전체<span className="bookmark-card__count">{items.length}</span>
            </button>
            {locations.map((loc) => (
              <button
                key={loc}
                type="button"
                className={
                  'bookmark-filter__chip' + (locationFilter === loc ? ' bookmark-filter__chip--active' : '')
                }
                onClick={() => setLocationFilter(loc)}
              >
                {loc}
                <span className="bookmark-card__count">{items.filter((i) => i.location === loc).length}</span>
              </button>
            ))}
          </div>
        )}

        <div className="link-editor">
          {visibleItems.length === 0 && (
            <p className="sync-panel__hint">
              {items.length === 0
                ? '아직 추가한 곳이 없어요. 아래에서 이름과 구글맵 링크를 넣으면 지도에 별로 표시돼요.'
                : '이 도시에 추가한 곳이 없어요.'}
            </p>
          )}
          {visibleItems.map((item) => {
            const onMap = !!item.url && parseCoords(item.url) !== null;
            return (
              <div className="link-editor__row" key={item.id}>
                <div className="bookmark-item__body">
                  {onMap && onShowOnMap ? (
                  <button
                    type="button"
                    className="link-row link-row--button"
                    title="지도에서 보기"
                    onClick={() => onShowOnMap(item.id)}
                  >
                    {item.label}
                  </button>
                ) : (
                  <LinkRow item={item} />
                )}
                  {item.description && <div className="bookmark-item__desc">{item.description}</div>}
                </div>
                <button type="button" className="icon-action" onClick={() => startEdit(item)} aria-label="수정">
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  className="icon-action icon-action--danger"
                  onClick={() => removeItem(item.id)}
                  aria-label="삭제"
                >
                  <DeleteIcon />
                </button>
              </div>
            );
          })}
        </div>

        <form className="bookmark-add-form" onSubmit={submitForm}>
          <div className="form-row form-row--split">
            <label className="form-field">
              <span>이름</span>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="이름"
              />
            </label>
            <label className="form-field">
              <span>도시</span>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="도시 (선택)"
              />
            </label>
          </div>
          <label className="form-field">
            <span>설명</span>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="설명 (선택)"
            />
          </label>
          <label className="form-field">
            <span>링크</span>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://..."
            />
          </label>
          {editingId && (
            <button type="button" className="bookmark-edit-cancel" onClick={cancelEdit}>
              수정 취소
            </button>
          )}
          <div className="form-actions--end">
            <button type="submit" className="add-btn">
              {editingId ? '저장' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
