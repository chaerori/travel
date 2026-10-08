import { useRef, useState } from 'react';
import type { LinkedText, PaymentMethod, PrepItem, ScheduleContent, ScheduleItem } from '../types';
import { parseWon } from '../utils/currency';
import { makeId } from '../utils/id';
import { SpotPicker, getSpot } from './SpotPicker';
import { TimeSelect } from './TimeSelect';

type ContentType = ScheduleContent['type'];

const SHORT_LINK_HINT =
  '짧은 링크(maps.app.goo.gl)는 지도에 위치를 표시할 수 없어요. 구글 지도 웹에서 주소창의 전체 링크를 붙여넣으면 정확하게 표시됩니다.';

function isShortMapLink(url?: string): boolean {
  return !!url && /(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(url);
}

type Props = {
  initial: ScheduleItem | null;
  defaultDate: string;
  defaultCity: string;
  defaultStartTime: string;
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

export function ScheduleForm({ initial, defaultDate, defaultCity, defaultStartTime, onSave, onCancel }: Props) {
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [city, setCity] = useState(initial?.city ?? defaultCity);
  const [startTime, setStartTime] = useState(initial?.startTime ?? defaultStartTime);
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');
  const [contentType, setContentType] = useState<ContentType>(initial?.content.type ?? 'fixed');
  const [links, setLinks] = useState<LinkedText[]>(
    initial ? toLinkedList(initial.content) : [emptyLinked()],
  );
  const [contentTitle, setContentTitle] = useState(
    initial?.content.type === 'route' || initial?.content.type === 'choices' ? initial.content.title : '',
  );
  const [info, setInfo] = useState(initial?.content.type === 'fixed' ? initial.content.info ?? '' : '');
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [prep, setPrep] = useState<PrepItem[]>(initial?.prep ?? []);
  const [expenseAmount, setExpenseAmount] = useState(
    initial?.expense ? initial.expense.amount.toLocaleString('ko-KR') : '',
  );
  const [expenseMethod, setExpenseMethod] = useState<PaymentMethod>(initial?.expense?.method ?? 'card');
  const [needsReservation, setNeedsReservation] = useState(initial?.needsReservation ?? false);

  function updateLink(id: string, patch: Partial<LinkedText>) {
    setLinks((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        // 링크가 바뀌거나 지워지면 이전 링크로 정해진 지도 좌표는 더 이상 맞지 않는다.
        if ('url' in patch && (patch.url ?? '') !== (l.url ?? '')) {
          next.lat = undefined;
          next.lng = undefined;
        }
        return next;
      }),
    );
  }

  function handleContentTypeChange(next: ContentType) {
    const currentName = contentType === 'fixed' ? links[0]?.label ?? '' : contentTitle;
    if (next === 'fixed') {
      updateLink(links[0].id, { label: currentName });
    } else {
      setContentTitle(currentName);
    }
    setContentType(next);
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
      content = { type: 'fixed', item: cleanLinks[0], info: info.trim() || undefined };
    } else if (contentType === 'choices') {
      content = { type: 'choices', title: contentTitle.trim(), options: cleanLinks };
    } else {
      content = { type: 'route', title: contentTitle.trim(), stops: cleanLinks };
    }

    const cleanPrep = prep.map((p) => ({ ...p, label: p.label.trim() })).filter((p) => p.label);

    const amount = parseWon(expenseAmount);
    const expense = amount > 0 ? { amount, method: expenseMethod } : null;

    onSave({
      id: initial?.id ?? makeId(),
      date,
      city: city.trim(),
      startTime,
      endTime,
      content,
      memo: memo.trim(),
      prep: cleanPrep,
      expense,
      needsReservation,
    });
  }

  const linksLabel = contentType === 'choices' ? '선택지' : '경로 (순서대로)';

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal__header">
          <h2 className="modal__title">{initial ? '일정 수정' : '일정 추가'}</h2>
          <button type="button" className="modal__close" onClick={onCancel} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="form-row form-row--split">
          <label className="form-field">
            <span>
              날짜<span className="required-mark">*</span>
            </span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="form-field">
            <span>도시</span>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="예: 도쿄"
            />
          </label>
        </div>

        <div className="form-row form-row--split">
          <label className="form-field">
            <span>
              시작 시간<span className="required-mark">*</span>
            </span>
            <TimeSelect value={startTime} onChange={setStartTime} required />
          </label>
          <label className="form-field">
            <span>종료 시간</span>
            <TimeSelect value={endTime} onChange={setEndTime} />
          </label>
        </div>

        <label className="form-field">
          <span>일정 유형</span>
          <select value={contentType} onChange={(e) => handleContentTypeChange(e.target.value as ContentType)}>
            <option value="fixed">확정된 일정</option>
            <option value="choices">당일 선택지</option>
            <option value="route">이동 경로</option>
          </select>
        </label>

        {contentType === 'fixed' && (
          <>
            <label className="form-field">
              <span>
                일정 이름<span className="required-mark">*</span>
              </span>
              <input
                type="text"
                placeholder="예: 일일투어"
                value={links[0].label}
                onChange={(e) => updateLink(links[0].id, { label: e.target.value })}
              />
            </label>
            <div className="form-row form-row--split">
              <label className="form-field">
                <input
                  type="url"
                  placeholder="위치 링크"
                  value={links[0].url ?? ''}
                  onChange={(e) => updateLink(links[0].id, { url: e.target.value })}
                />
              </label>
              <label className="form-field">
                <input
                  type="text"
                  placeholder="정보 링크"
                  value={info}
                  onChange={(e) => setInfo(e.target.value)}
                />
              </label>
            </div>
            {isShortMapLink(links[0].url) && <p className="form-hint">{SHORT_LINK_HINT}</p>}
          </>
        )}

        {contentType !== 'fixed' && (
          <>
            <label className="form-field">
              <span>일정 이름</span>
              <input
                type="text"
                placeholder={contentType === 'route' ? '예: 호텔로 이동' : '예: 점심 식사'}
                value={contentTitle}
                onChange={(e) => setContentTitle(e.target.value)}
              />
            </label>

            <div className="form-field">
              <span>
                {linksLabel}
                <span className="required-mark">*</span>
              </span>
              <div className="link-editor">
                {links.map((l, index) => (
                  <div className="link-editor__row" key={l.id} data-link-index={index}>
                    {links.length > 1 && (
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
                      placeholder="장소"
                      value={l.label}
                      onChange={(e) => updateLink(l.id, { label: e.target.value })}
                    />
                    <input
                      type="url"
                      placeholder="링크"
                      value={l.url ?? ''}
                      onChange={(e) => updateLink(l.id, { url: e.target.value })}
                    />
                    {contentType === 'route' && (
                      <SpotPicker
                        value={getSpot(l)}
                        onChange={(spot) => updateLink(l.id, { spot, photoSpot: undefined })}
                      />
                    )}
                    {links.length > 1 && (
                      <button type="button" className="icon-btn" onClick={() => removeLink(l.id)}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {links.some((l) => isShortMapLink(l.url)) && <p className="form-hint">{SHORT_LINK_HINT}</p>}
                <button type="button" className="add-btn" onClick={addLink}>
                  + 항목 추가
                </button>
              </div>
            </div>
          </>
        )}

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={needsReservation}
            onChange={(e) => setNeedsReservation(e.target.checked)}
          />
          <span>예약 필요</span>
        </label>

        <label className="form-field">
          <span>메모</span>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} />
        </label>

        <div className="form-row form-row--split">
          <label className="form-field">
            <span>지출 금액</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </label>
          <label className="form-field">
            <span>결제 수단</span>
            <select value={expenseMethod} onChange={(e) => setExpenseMethod(e.target.value as PaymentMethod)}>
              <option value="card">카드</option>
              <option value="cash">현금</option>
            </select>
          </label>
        </div>

        <div className="form-field">
          <span>준비물</span>
          <div className="link-editor">
            {prep.map((p) => (
              <div className="link-editor__row" key={p.id}>
                <input
                  type="text"
                  placeholder="예: 모자"
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

        <div className="form-actions--end">
          <button type="submit" className="add-btn">
            저장
          </button>
        </div>
      </form>
    </div>
  );
}
