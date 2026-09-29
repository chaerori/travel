import { useState } from 'react';
import { createTrip, useTripIndex } from '../utils/tripIndex';
import { AddIcon } from './icons/AddIcon';

export function TripListPage() {
  const { trips, status } = useTripIndex();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        </div>
      </header>

      <main className="app__list">
        {creating ? (
          <form className="trip-create__form" onSubmit={handleCreate}>
            <input
              type="text"
              autoFocus
              placeholder="여행 이름 (예: 호주)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              만들기
            </button>
          </form>
        ) : (
          <button type="button" className="add-btn trip-create__toggle" onClick={() => setCreating(true)}>
            <AddIcon />새 여행 만들기
          </button>
        )}

        {trips.length === 0 && status === 'ready' && (
          <div className="empty-state">
            <p>아직 만든 여행이 없습니다.</p>
          </div>
        )}

        {trips.map((t) => (
          <a key={t.id} className="trip-card" href={`${import.meta.env.BASE_URL}${t.id}/`}>
            {t.title}
          </a>
        ))}
      </main>
    </div>
  );
}
