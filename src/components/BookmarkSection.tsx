import { useState } from 'react';
import type { BookmarkCategory, BookmarkItem, Bookmarks } from '../types';
import { makeId } from '../utils/id';
import { CityMarkerIcon } from './icons/CityMarkerIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { PencilIcon } from './icons/PencilIcon';
import { LinkRow } from './LinkRow';

type Props = {
  bookmarks: Bookmarks;
  onChange: (bookmarks: Bookmarks) => void;
  onOpenMap: () => void;
};

const CATEGORIES: { key: BookmarkCategory; label: string }[] = [
  { key: 'food', label: '맛집' },
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

export function BookmarkSection({ bookmarks, onChange, onOpenMap }: Props) {
  const [openCategory, setOpenCategory] = useState<BookmarkCategory | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [locationFilter, setLocationFilter] = useState<string | null>(null);

  const items = openCategory ? bookmarks[openCategory] : [];
  const locations = [...new Set(items.map((i) => i.location).filter(Boolean))];
  const visibleItems = locationFilter ? items.filter((i) => i.location === locationFilter) : items;

  function openCategoryModal(key: BookmarkCategory) {
    setOpenCategory(key);
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
    if (!openCategory) return;
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
      ? bookmarks[openCategory].map((i) => (i.id === editingId ? item : i))
      : [...bookmarks[openCategory], item];
    onChange({ ...bookmarks, [openCategory]: next });
    cancelEdit();
  }

  function removeItem(id: string) {
    if (!openCategory) return;
    onChange({ ...bookmarks, [openCategory]: bookmarks[openCategory].filter((i) => i.id !== id) });
    if (editingId === id) cancelEdit();
  }

  function closeModal() {
    setOpenCategory(null);
    cancelEdit();
    setLocationFilter(null);
  }

  return (
    <>
      <div className="bookmark-row">
        <button type="button" className="bookmark-card bookmark-card--icon" onClick={onOpenMap} aria-label="지도">
          <CityMarkerIcon />
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.key} type="button" className="bookmark-card" onClick={() => openCategoryModal(c.key)}>
            <span>{c.label}</span>
            <span className="bookmark-card__count">{bookmarks[c.key].length}</span>
          </button>
        ))}
      </div>

      {openCategory && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{CATEGORIES.find((c) => c.key === openCategory)?.label}</h2>
              <button type="button" className="modal__close" onClick={closeModal} aria-label="닫기">
                ✕
              </button>
            </div>

            {locations.length > 0 && (
              <div className="bookmark-filter">
                <button
                  type="button"
                  className={
                    'bookmark-filter__chip' + (locationFilter === null ? ' bookmark-filter__chip--active' : '')
                  }
                  onClick={() => setLocationFilter(null)}
                >
                  전체
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
                  </button>
                ))}
              </div>
            )}

            <div className="link-editor">
              {visibleItems.length === 0 && (
                <p className="sync-panel__hint">
                  {items.length === 0 ? '아직 추가한 항목이 없습니다.' : '해당 위치의 항목이 없습니다.'}
                </p>
              )}
              {visibleItems.map((item) => (
                <div className="link-editor__row" key={item.id}>
                  <div className="bookmark-item__body">
                    <LinkRow item={item} />
                    {item.location && <span className="bookmark-item__location">{item.location}</span>}
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
              ))}
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
                  <span>위치</span>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="위치 (선택)"
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
      )}
    </>
  );
}
