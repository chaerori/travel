import { useMemo, useState } from 'react';
import './App.css';
import { AccountPanel } from './components/AccountPanel';
import { BudgetSection } from './components/BudgetSection';
import { LoginGate } from './components/LoginGate';
import { ScheduleForm } from './components/ScheduleForm';
import { ScheduleItemCard } from './components/ScheduleItemCard';
import { TripListPage } from './components/TripListPage';
import { AddIcon } from './components/icons/AddIcon';
import { CityMarkerIcon } from './components/icons/CityMarkerIcon';
import { ShareIcon } from './components/icons/ShareIcon';
import type { Budget, ScheduleItem } from './types';
import { useAuthUser, signOutUser } from './utils/auth';
import { useCloudTrip } from './utils/cloudTrip';
import { formatDateWithWeekday } from './utils/date';
import { getTripSlug } from './utils/tripId';
import { renameTripIndexEntry } from './utils/tripIndex';
import { OWNER_EMAIL } from './firebase';

type Row = {
  item: ScheduleItem;
  showDate: boolean;
  showCity: boolean;
};

function buildRows(items: ScheduleItem[]): Row[] {
  const sorted = [...items].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  let lastDate: string | null = null;
  let lastCity: string | null = null;

  return sorted.map((item) => {
    const showDate = item.date !== lastDate;
    const showCity = showDate || item.city !== lastCity;
    lastDate = item.date;
    lastCity = item.city;
    return { item, showDate, showCity };
  });
}

function TripView({ userEmail, tripId }: { userEmail: string; tripId: string }) {
  const isOwner = userEmail === OWNER_EMAIL;
  const { trip, setTrip, status, sharedEmails, addSharedEmail, removeSharedEmail } = useCloudTrip(true, tripId);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);

  const rows = useMemo(() => buildRows(trip.items), [trip.items]);

  const lastItem = trip.items[trip.items.length - 1];

  function openAddForm() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEditForm(item: ScheduleItem) {
    setEditingItem(item);
    setFormOpen(true);
  }

  function handleSave(item: ScheduleItem) {
    setTrip((prev) => {
      const exists = prev.items.some((i) => i.id === item.id);
      const items = exists
        ? prev.items.map((i) => (i.id === item.id ? item : i))
        : [...prev.items, item];
      return { ...prev, items };
    });
    setFormOpen(false);
    setEditingItem(null);
  }

  function handleUpdate(item: ScheduleItem) {
    setTrip((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === item.id ? item : i)),
    }));
  }

  function handleDelete(id: string) {
    if (!confirm('이 일정을 삭제할까요?')) return;
    setTrip((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
  }

  function commitTitle() {
    if (titleDraft !== null) {
      const nextTitle = titleDraft.trim();
      if (nextTitle) {
        setTrip((prev) => ({ ...prev, title: nextTitle }));
        if (isOwner) {
          renameTripIndexEntry(tripId, nextTitle).catch((err) => console.error('여행 목록 갱신 실패', err));
        }
      }
    }
    setTitleDraft(null);
  }

  function handleBudgetChange(budget: Budget) {
    setTrip((prev) => ({ ...prev, budget }));
  }

  if (status === 'denied') {
    return (
      <div className="login-gate">
        <p className="login-gate__title">접근 권한이 없습니다</p>
        <p className="login-gate__desc">
          {userEmail} 계정은 이 여행 일정에 초대되지 않았습니다.
        </p>
        <button type="button" className="btn btn--ghost" onClick={signOutUser}>
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app__header">
        <a className="trip-back-link" href={import.meta.env.BASE_URL}>
          ← 여행 목록
        </a>
        <div className="app__header-row">
          {titleDraft === null ? (
            <h1 className="app__title" onClick={() => setTitleDraft(trip.title)}>
              {trip.title}
            </h1>
          ) : (
            <input
              className="app__title-input"
              value={titleDraft}
              autoFocus
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => e.key === 'Enter' && commitTitle()}
            />
          )}
          <div className="app__header-actions">
            <button type="button" className="sync-btn" onClick={openAddForm} aria-label="일정 추가">
              <AddIcon />
            </button>
            <button
              type="button"
              className={status === 'ready' ? 'sync-btn' : 'sync-btn sync-btn--pending'}
              onClick={() => setAccountPanelOpen(true)}
              aria-label="계정"
            >
              <ShareIcon />
            </button>
          </div>
        </div>
        <BudgetSection budget={trip.budget} items={trip.items} onChange={handleBudgetChange} />
      </header>

      <main className="app__list">
        {rows.length === 0 && (
          <div className="empty-state">
            <p>등록된 일정이 없습니다.</p>
            <p>우측 상단 + 버튼으로 첫 일정을 추가해 보세요.</p>
          </div>
        )}

        {rows.map(({ item, showDate, showCity }, index) => (
          <div key={item.id} className="schedule-row">
            {showDate && (
              <div className={index === 0 ? 'date-city-row date-city-row--first' : 'date-city-row'}>
                <span className="date-divider">{formatDateWithWeekday(item.date)}</span>
                <span className="city-heading">
                  <CityMarkerIcon />
                  {item.city}
                </span>
              </div>
            )}
            {!showDate && showCity && (
              <div className="city-heading">
                <CityMarkerIcon />
                {item.city}
              </div>
            )}
            <ScheduleItemCard
              item={item}
              onUpdate={handleUpdate}
              onEdit={() => openEditForm(item)}
              onDelete={() => handleDelete(item.id)}
            />
          </div>
        ))}
      </main>

      {formOpen && (
        <ScheduleForm
          initial={editingItem}
          defaultDate={lastItem?.date ?? new Date().toISOString().slice(0, 10)}
          defaultCity={lastItem?.city ?? ''}
          onSave={handleSave}
          onCancel={() => {
            setFormOpen(false);
            setEditingItem(null);
          }}
        />
      )}

      {accountPanelOpen && (
        <AccountPanel
          userEmail={userEmail}
          isOwner={isOwner}
          sharedEmails={sharedEmails}
          onAddEmail={addSharedEmail}
          onRemoveEmail={removeSharedEmail}
          onClose={() => setAccountPanelOpen(false)}
        />
      )}
    </div>
  );
}

function App() {
  const user = useAuthUser();

  if (user === undefined) {
    return <div className="login-gate" />;
  }

  if (user === null || !user.email) {
    return <LoginGate />;
  }

  const tripId = getTripSlug();
  if (tripId === null) {
    return <TripListPage />;
  }

  return <TripView userEmail={user.email} tripId={tripId} />;
}

export default App;
