import { useRef, useState } from 'react';
import type { LinkedText, PrepItem, ScheduleContent, ScheduleItem } from '../types';
import { makeId } from '../utils/id';

type ContentType = ScheduleContent['type'];

type Props = {
  initial: ScheduleItem | null;
  defaultDate: string;
  defaultCity: string;
  onSave: (item: ScheduleItem) => void;
  onCancel: () => void;
};

function emptyLinked(): LinkedText {
  return { id: makeId(), label: '', url: '' };
}

function toLinkedList(content: ScheduleContent): LinkedText[] {
  if (content.type === 'fixed') return [content.item];
  if (content.type === 'choices') return content.options;
  return content.stops;
}

export function ScheduleForm({ initial, defaultDate, defaultCity, onSave, onCancel }: Props) {
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [city, setCity] = useState(initial?.city ?? defaultCity);
  const [startTime, setStartTime] = useState(initial?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');
  const [contentType, setContentType] = useState<ContentType>(initial?.content.type ?? 'fixed');
  const [links, setLinks] = useState<LinkedText[]>(
    initial ? toLinkedList(initial.content) : [emptyLinked()],
  );
  const [routeTitle, setRouteTitle] = useState(
    initial?.content.type === 'route' ? initial.content.title : '',
  );
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [prep, setPrep] = useState<PrepItem[]>(initial?.prep ?? []);

  function updateLink(id: string, patch: Partial<LinkedText>) {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLink() {
    setLinks((prev) => [...prev, emptyLinked()]);
  }

  function removeLink(id: string) {
    setLinks((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  const dragIndex = useRef<number | null>(null);

  function handleDragPointerDown(e: React.PointerEvent<HTMLSpanElement>, index: number) {
    dragIndex.current = index;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDragPointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    if (dragIndex.current === null) return;
    const target = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>('[data-link-index]');
    if (!target) return;
    const targetIndex = Number(target.dataset.linkIndex);
    if (targetIndex === dragIndex.current) return;
    const fromIndex = dragIndex.current;
    setLinks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    dragIndex.current = targetIndex;
  }

  function handleDragPointerUp() {
    dragIndex.current = null;
  }

  function addPrep() {
    setPrep((prev) => [...prev, { id: makeId(), label: '', checked: false }]);
  }

  function updatePrep(id: string, label: string) {
    setPrep((prev) => prev.map((p) => (p.id === id ? { ...p, label } : p)));
  }

  function removePrep(id: string) {
    setPrep((prev) => prev.filter((p) => p.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanLinks = links
      .map((l) => ({ ...l, label: l.label.trim(), url: l.url?.trim() || undefined }))
      .filter((l) => l.label);
    if (cleanLinks.length === 0) return;

    let content: ScheduleContent;
    if (contentType === 'fixed') {
      content = { type: 'fixed', item: cleanLinks[0] };
    } else if (contentType === 'choices') {
      const prevSelected = initial?.content.type === 'choices' ? initial.content.selectedId : null;
      const selectedId = cleanLinks.some((l) => l.id === prevSelected) ? prevSelected : null;
      content = { type: 'choices', options: cleanLinks, selectedId };
    } else {
      content = { type: 'route', title: routeTitle.trim(), stops: cleanLinks };
    }

    const cleanPrep = prep.map((p) => ({ ...p, label: p.label.trim() })).filter((p) => p.label);

    onSave({
      id: initial?.id ?? makeId(),
      date,
      city: city.trim(),
      startTime,
      endTime,
      content,
      memo: memo.trim(),
      prep: cleanPrep,
    });
  }

  const linksLabel =
    contentType === 'fixed' ? '일정' : contentType === 'choices' ? '선택지' : '경로 (순서대로)';

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal__title">{initial ? '일정 수정' : '일정 추가'}</h2>

        <div className="form-row form-row--split">
          <label className="form-field">
            <span>날짜</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="form-field">
            <span>도시</span>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="예: 도쿄"
              required
            />
          </label>
        </div>

        <div className="form-row form-row--split">
          <label className="form-field">
            <span>시작 시간</span>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </label>
          <label className="form-field">
            <span>종료 시간 (선택)</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>

        <label className="form-field">
          <span>일정 유형</span>
          <select value={contentType} onChange={(e) => setContentType(e.target.value as ContentType)}>
            <option value="fixed">확정된 일정</option>
            <option value="choices">당일 선택지</option>
            <option value="route">이동 경로</option>
          </select>
        </label>

        {contentType === 'route' && (
          <label className="form-field">
            <span>대표 이름</span>
            <input
              type="text"
              placeholder="예: 공항 이동"
              value={routeTitle}
              onChange={(e) => setRouteTitle(e.target.value)}
            />
          </label>
        )}

        <div className="form-field">
          <span>{linksLabel}</span>
          <div className="link-editor">
            {links.map((l, index) => (
              <div className="link-editor__row" key={l.id} data-link-index={index}>
                {contentType === 'route' && links.length > 1 && (
                  <span
                    className="drag-handle"
                    onPointerDown={(e) => handleDragPointerDown(e, index)}
                    onPointerMove={handleDragPointerMove}
                    onPointerUp={handleDragPointerUp}
                    onPointerCancel={handleDragPointerUp}
                  >
                    ⠿
                  </span>
                )}
                <input
                  type="text"
                  placeholder="이름"
                  value={l.label}
                  onChange={(e) => updateLink(l.id, { label: e.target.value })}
                />
                <input
                  type="url"
                  placeholder="링크 (선택)"
                  value={l.url ?? ''}
                  onChange={(e) => updateLink(l.id, { url: e.target.value })}
                />
                {links.length > 1 && (
                  <button type="button" className="icon-btn" onClick={() => removeLink(l.id)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            {(contentType === 'choices' || contentType === 'route') && (
              <button type="button" className="add-btn" onClick={addLink}>
                + 항목 추가
              </button>
            )}
          </div>
        </div>

        <label className="form-field">
          <span>메모</span>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} />
        </label>

        <div className="form-field">
          <span>준비물 (선택)</span>
          <div className="link-editor">
            {prep.map((p) => (
              <div className="link-editor__row" key={p.id}>
                <input
                  type="text"
                  placeholder="예: 여권"
                  value={p.label}
                  onChange={(e) => updatePrep(p.id, e.target.value)}
                />
                <button type="button" className="icon-btn" onClick={() => removePrep(p.id)}>
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="add-btn" onClick={addPrep}>
              + 준비물 추가
            </button>
          </div>
        </div>

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            취소
          </button>
          <button type="submit" className="btn btn--primary">
            저장
          </button>
        </div>
      </form>
    </div>
  );
}
