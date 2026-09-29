import { useState } from 'react';
import { signOutUser } from '../utils/auth';

type Props = {
  userEmail: string;
  isOwner: boolean;
  sharedEmails: string[];
  onAddEmail: (email: string) => void;
  onRemoveEmail: (email: string) => void;
  mapUrl: string;
  onMapUrlChange: (mapUrl: string) => void;
  onClose: () => void;
};

export function AccountPanel({
  userEmail,
  isOwner,
  sharedEmails,
  onAddEmail,
  onRemoveEmail,
  mapUrl,
  onMapUrlChange,
  onClose,
}: Props) {
  const [input, setInput] = useState('');
  const [mapUrlDraft, setMapUrlDraft] = useState(mapUrl);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onAddEmail(input);
    setInput('');
  }

  function handleMapUrlSave(e: React.FormEvent) {
    e.preventDefault();
    onMapUrlChange(mapUrlDraft.trim());
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">계정</h2>

        <div className="form-field">
          <span>로그인 계정</span>
          <p className="account-panel__email">{userEmail}</p>
        </div>

        <div className="form-field">
          <span>구글맵 링크</span>
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

        {isOwner && (
          <div className="form-field">
            <span>함께 보는 사람 (이메일)</span>
            <div className="link-editor">
              {sharedEmails.length === 0 && (
                <p className="sync-panel__hint">아직 초대한 사람이 없습니다.</p>
              )}
              {sharedEmails.map((email) => (
                <div className="link-editor__row" key={email}>
                  <input type="text" value={email} readOnly />
                  <button type="button" className="icon-btn" onClick={() => onRemoveEmail(email)}>
                    ✕
                  </button>
                </div>
              ))}
              <form className="link-editor__row" onSubmit={handleAdd}>
                <input
                  type="email"
                  placeholder="초대할 Google 계정 이메일"
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

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={signOutUser}>
            로그아웃
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
