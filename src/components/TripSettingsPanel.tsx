import { useEffect, useState } from 'react';
import { useCloudTrip } from '../utils/cloudTrip';
import { renameTripIndexEntry } from '../utils/tripIndex';

type Props = {
  tripId: string;
  isOwner: boolean;
  onClose: () => void;
};

export function TripSettingsPanel({ tripId, isOwner, onClose }: Props) {
  const { trip, setTrip, status, sharedEmails, addSharedEmail, removeSharedEmail } = useCloudTrip(true, tripId);
  const [input, setInput] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [mapUrlDraft, setMapUrlDraft] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    if (!draftLoaded && status === 'ready') {
      setTitleDraft(trip.title);
      setMapUrlDraft(trip.mapUrl);
      setDraftLoaded(true);
    }
  }, [status, trip.title, trip.mapUrl, draftLoaded]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    addSharedEmail(input);
    setInput('');
  }

  function handleTitleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = titleDraft.trim();
    if (!trimmed) return;
    setTrip((prev) => ({ ...prev, title: trimmed }));
    if (isOwner) {
      renameTripIndexEntry(tripId, trimmed).catch((err) => console.error('여행 목록 갱신 실패', err));
    }
  }

  function handleMapUrlSave(e: React.FormEvent) {
    e.preventDefault();
    setTrip((prev) => ({ ...prev, mapUrl: mapUrlDraft.trim() }));
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">여행 설정</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="form-field">
          <span>여행 이름</span>
          <form className="link-editor__row" onSubmit={handleTitleSave}>
            <input
              type="text"
              placeholder="여행 이름"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
            />
            <button type="submit" className="add-btn">
              저장
            </button>
          </form>
        </div>

        {isOwner && (
          <div className="form-field">
            <span>액세스 권한이 있는 사용자</span>
            <div className="link-editor">
              {sharedEmails.length === 0 && (
                <p className="sync-panel__hint">아직 초대한 사람이 없습니다.</p>
              )}
              {sharedEmails.map((email) => (
                <div className="link-editor__row" key={email}>
                  <input type="text" value={email} readOnly />
                  <button type="button" className="icon-btn" onClick={() => removeSharedEmail(email)}>
                    ✕
                  </button>
                </div>
              ))}
              <form className="link-editor__row" onSubmit={handleAdd}>
                <input
                  type="email"
                  placeholder="Google 계정 이메일"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit" className="add-btn">
                  추가
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="form-field">
          <span>지도 링크</span>
          <form className="link-editor__row" onSubmit={handleMapUrlSave}>
            <input
              type="url"
              placeholder="https://maps.app.goo.gl/..."
              value={mapUrlDraft}
              onChange={(e) => setMapUrlDraft(e.target.value)}
            />
            <button type="submit" className="add-btn">
              저장
            </button>
          </form>
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={trip.showBudget}
            onChange={(e) => setTrip((prev) => ({ ...prev, showBudget: e.target.checked }))}
          />
          <span>예산/잔액 섹션 표시</span>
        </label>
      </div>
    </div>
  );
}
