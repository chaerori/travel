import { useMemo, useState } from 'react';
import { hasFullAccess } from '../firebase';
import { signOutUser } from '../utils/auth';
import { todayString } from '../utils/date';
import { createTrip, deleteTrip, useTripIndex } from '../utils/tripIndex';
import { compareDDay, dDay } from '../utils/tripDday';
import { useTripDateRanges } from '../utils/tripDates';
import { tripUrl } from '../utils/tripId';
import { TripSettingsPanel } from './TripSettingsPanel';
import { DeleteIcon } from './icons/DeleteIcon';
import { FaceIdUserIcon } from './icons/FaceIdUserIcon';
import { SettingsIcon } from './icons/SettingsIcon';

export function TripListPage({ userEmail }: { userEmail: string }) {
  const isOwner = hasFullAccess(userEmail);
  const { trips, status } = useTripIndex(userEmail);
  const ranges = useTripDateRanges(trips.map((t) => t.id));
  // 진행 중이거나 디데이가 가까운 여행이 위로 오게 정렬한다.
  const sortedTrips = useMemo(() => {
    const today = todayString();
    return trips
      .map((t) => ({ trip: t, dday: dDay(ranges[t.id] ?? null, today) }))
      .sort((a, b) => compareDDay(a.dday, b.dday) || a.trip.title.localeCompare(b.trip.title, 'ko'));
  }, [trips, ranges]);
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
      window.location.href = tripUrl(id);
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

      <main className="app__list app__list--fill">
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
            {isOwner ? (
              <>
                <p className="empty-state__title">첫 여행을 만들어 보세요</p>
                <p>일정과 비용, 짐 목록을 한곳에서 관리할 수 있어요.</p>
              </>
            ) : (
              <>
                <p className="empty-state__title">공유받은 여행이 아직 없어요</p>
                <p>여행을 만든 사람이 초대하면 여기에 나타나요.</p>
              </>
            )}
          </div>
        )}

        {sortedTrips.map(({ trip: t, dday }) => (
          <div key={t.id} className="trip-card">
            <a className="trip-card__link" href={tripUrl(t.id)}>
              <span className="trip-card__title">{t.title}</span>
              {dday.label && (
                <span className={dday.group === 3 ? 'dday dday--past' : 'dday'}>{dday.label}</span>
              )}
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
          Font: Pretendard (SIL Open Font License)
          <br />
          Icons: Iconoir (https://iconoir.com)
          <br />
          © 2026 Chaeyoon Lee. All rights reserved.
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
