import { useState } from 'react';
import { hasFullAccess } from '../firebase';
import { signOutUser } from '../utils/auth';
import { createTrip, deleteTrip, useTripIndex } from '../utils/tripIndex';
import { TripSettingsPanel } from './TripSettingsPanel';
import { DeleteIcon } from './icons/DeleteIcon';
import { FaceIdUserIcon } from './icons/FaceIdUserIcon';
import { SettingsIcon } from './icons/SettingsIcon';

export function TripListPage({ userEmail }: { userEmail: string }) {
  const isOwner = hasFullAccess(userEmail);
  const { trips, status } = useTripIndex(userEmail);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [settingsTripId, setSettingsTripId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const id = await createTrip(trimmed);
      window.location.href = `${import.meta.env.BASE_URL}${id}/`;
    } catch (err) {
      console.error('여행 생성 실패', err);
      setSubmitting(false);
    }
  }

  function handleCancelCreate() {
    setCreating(false);
    setTitle('');
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 여행을 삭제할까요? 삭제하면 되돌릴 수 없습니다.`)) return;
    try {
      await deleteTrip(id);
    } catch (err) {
      console.error('여행 삭제 실패', err);
    }
  }

  if (status === 'denied') {
    return (
      <div className="login-gate">
        <p className="login-gate__title">접근 권한이 없습니다</p>
        <p className="login-gate__desc">공유받은 여행 링크로 접속해주세요.</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-row">
          <h1 className="app__title">나의 여행</h1>
          <div className="app__header-actions">
            <button type="button" className="sync-btn" onClick={() => setAccountOpen((v) => !v)} aria-label="계정">
              <FaceIdUserIcon />
            </button>
            {accountOpen && (
              <>
                <div className="popover-backdrop" onClick={() => setAccountOpen(false)} />
                <div className="account-popover">
                  <p className="account-panel__email">{userEmail}</p>
                  <button type="button" className="add-btn" onClick={signOutUser}>
                    로그아웃
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="app__list">
        {isOwner &&
          (creating ? (
            <form className="trip-create__form" onSubmit={handleCreate}>
              <input
                type="text"
                autoFocus
                placeholder="여행 이름"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                만들기
              </button>
              <button type="button" className="icon-btn" onClick={handleCancelCreate} aria-label="취소">
                ✕
              </button>
            </form>
          ) : (
            <button type="button" className="add-btn trip-create__toggle" onClick={() => setCreating(true)}>
              + 새 여행 만들기
            </button>
          ))}

        {trips.length === 0 && status === 'ready' && (
          <div className="empty-state">
            <p>아직 만든 여행이 없습니다.</p>
          </div>
        )}

        {trips.map((t) => (
          <div key={t.id} className="trip-card">
            <a className="trip-card__link" href={`${import.meta.env.BASE_URL}${t.id}/`}>
              {t.title}
            </a>
            <button
              type="button"
              className="icon-action"
              onClick={() => setSettingsTripId(t.id)}
              aria-label="설정"
            >
              <SettingsIcon />
            </button>
            {isOwner && (
              <button
                type="button"
                className="icon-action icon-action--danger"
                onClick={() => handleDelete(t.id, t.title)}
                aria-label="삭제"
              >
                <DeleteIcon />
              </button>
            )}
          </div>
        ))}

        <p className="attribution">
          Font: Nanum Font by NAVER (Open Font License)
          <br />
          Icons: Streamline (https://streamlinehq.com)
        </p>
      </main>

      {settingsTripId && (
        <TripSettingsPanel
          tripId={settingsTripId}
          isOwner={isOwner}
          onClose={() => setSettingsTripId(null)}
        />
      )}
    </div>
  );
}
