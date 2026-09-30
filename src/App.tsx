import { useMemo, useState } from 'react';
import './App.css';
import { BottomNav } from './components/BottomNav';
import { BudgetSection } from './components/BudgetSection';
import { CalendarSection } from './components/CalendarSection';
import { LoginGate } from './components/LoginGate';
import { ScheduleForm } from './components/ScheduleForm';
import { ScheduleItemCard } from './components/ScheduleItemCard';
import { TripListPage } from './components/TripListPage';
import { AddIcon } from './components/icons/AddIcon';
import { EWalletIcon } from './components/icons/EWalletIcon';
import type { Bookmarks, Budget, ExpenseEntry, PrepItem, ScheduleItem } from './types';
import { useAuthUser, signOutUser } from './utils/auth';
import { useCloudTrip } from './utils/cloudTrip';
import { addHours, formatDateWithWeekday } from './utils/date';
import { getTripSlug } from './utils/tripId';
import { renameTripIndexEntry } from './utils/tripIndex';
import { hasFullAccess } from './firebase';

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
  const isOwner = hasFullAccess(userEmail);
  const { trip, setTrip, status } = useCloudTrip(true, tripId);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);

  const rows = useMemo(() => buildRows(trip.items), [trip.items]);

  const lastItem = rows[rows.length - 1]?.item;
  const defaultStartTime = lastItem
    ? lastItem.endTime || addHours(lastItem.startTime, 1)
    : '09:00';

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

  function handleExpensesChange(expenses: ExpenseEntry[]) {
    setTrip((prev) => ({ ...prev, expenses }));
  }

  function handlePrepChecklistChange(prepChecklist: PrepItem[]) {
    setTrip((prev) => ({ ...prev, prepChecklist }));
  }

  function handleBookmarksChange(bookmarks: Bookmarks) {
    setTrip((prev) => ({ ...prev, bookmarks }));
  }

  function openMap() {
    if (trip.mapUrl) {
      window.open(trip.mapUrl, '_blank', 'noreferrer');
    } else {
      alert('지도 링크가 설정되지 않았습니다. 여행 목록에서 설정할 수 있습니다.');
    }
  }

  function scrollToDate(date: string) {
    const target = document.getElementById(`date-${date}`);
    if (!target) return;
    const header = document.querySelector('.app__header');
    const offset = header instanceof HTMLElement ? header.offsetHeight : 0;
    const top = target.getBoundingClientRect().top + window.scrollY - offset - 8;
    window.scrollTo({ top, behavior: 'smooth' });
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
    <div className="app app--with-bottom-nav">
      <header className="app__header">
        <a className="trip-back-link" href={import.meta.env.BASE_URL}>
          ← 여행 목록
        </a>
        <div className="app__header-row">
          <div className="app__title-group">
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
              {trip.showBudget && (
                <button
                  type="button"
                  className="sync-btn"
                  onClick={() => setBudgetOpen((v) => !v)}
                  aria-label="예산/잔액"
                >
                  <EWalletIcon />
                </button>
              )}
            </div>
          </div>
        </div>
        {trip.showBudget && (
          <BudgetSection
            budget={trip.budget}
            items={trip.items}
            onChange={handleBudgetChange}
            expanded={budgetOpen}
          />
        )}
      </header>

      <main className="app__list">
        <CalendarSection items={trip.items} onSelectDate={scrollToDate} />

        <button type="button" className="add-btn schedule-add-btn" onClick={openAddForm}>
          + 일정 추가
        </button>

        {rows.length === 0 && (
          <div className="empty-state">
            <p>등록된 일정이 없습니다.</p>
          </div>
        )}

        {rows.map(({ item, showDate, showCity }, index) => (
          <div key={item.id} className="schedule-row">
            {showDate && (
              <div
                id={`date-${item.date}`}
                className={index === 0 ? 'date-city-row date-city-row--first' : 'date-city-row'}
              >
                <span className="date-divider">{formatDateWithWeekday(item.date)}</span>
                <span className="city-heading">{item.city}</span>
              </div>
            )}
            {!showDate && showCity && <div className="city-heading">{item.city}</div>}
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
          defaultStartTime={defaultStartTime}
          onSave={handleSave}
          onCancel={() => {
            setFormOpen(false);
            setEditingItem(null);
          }}
        />
      )}

      <BottomNav
        expenses={trip.expenses}
        onExpensesChange={handleExpensesChange}
        prepChecklist={trip.prepChecklist}
        onPrepChecklistChange={handlePrepChecklistChange}
        bookmarks={trip.bookmarks}
        onBookmarksChange={handleBookmarksChange}
        onOpenMap={openMap}
      />
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
    return <TripListPage userEmail={user.email} />;
  }

  return <TripView userEmail={user.email} tripId={tripId} />;
}

export default App;
