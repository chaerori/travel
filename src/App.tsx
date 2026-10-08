import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
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
import type { Bookmarks, Budget, ExpenseEntry, Luggage, ScheduleItem } from './types';
import { useAuthUser, signOutUser } from './utils/auth';
import { useCloudTrip } from './utils/cloudTrip';
import { getDayPlaces, getPlaceBadges, setPlaceCoords, type Coords } from './utils/dayPlaces';
import { addHours, formatDateWithWeekday, todayString } from './utils/date';
import { getTripSlug } from './utils/tripId';
import { renameTripIndexEntry } from './utils/tripIndex';
import { hasFullAccess } from './firebase';

// 지도 라이브러리는 용량이 커서 지도가 필요할 때만 불러온다.
const DayMap = lazy(() => import('./components/DayMap').then((m) => ({ default: m.DayMap })));

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
  const { trip, setTrip, status, saveIssue } = useCloudTrip(true, tripId);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ key: string; n: number } | null>(null);

  // 헤더가 고정되어 내용과 겹치기 시작하면 경계를 표시한다.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const rows = useMemo(() => buildRows(trip.items), [trip.items]);

  // 일정이 있는 날짜 중 보고 있는 날. 고른 날이 없어졌거나 아직 고르지 않았으면 오늘, 오늘이 없으면 첫째 날.
  const scheduledDates = useMemo(() => [...new Set(trip.items.map((i) => i.date))].sort(), [trip.items]);
  const today = todayString();
  const activeDate =
    selectedDate && scheduledDates.includes(selectedDate)
      ? selectedDate
      : scheduledDates.includes(today)
        ? today
        : (scheduledDates[0] ?? null);
  const dayRows = useMemo(() => rows.filter((r) => r.item.date === activeDate), [rows, activeDate]);
  const placeBadges = useMemo(
    () => (activeDate ? getPlaceBadges(trip.items, activeDate) : {}),
    [trip.items, activeDate],
  );
  const hasPlaces = useMemo(
    () => activeDate !== null && getDayPlaces(trip.items, activeDate).length > 0,
    [trip.items, activeDate],
  );

  const lastItem = rows[rows.length - 1]?.item;
  const dayLastItem = dayRows[dayRows.length - 1]?.item;
  const defaultStartTime = dayLastItem
    ? dayLastItem.endTime || addHours(dayLastItem.startTime, 0.5)
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
    setSelectedDate(item.date);
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

  function handleLuggageChange(prepChecklist: Luggage[]) {
    setTrip((prev) => ({ ...prev, prepChecklist }));
  }

  function handleBookmarksChange(bookmarks: Bookmarks) {
    setTrip((prev) => ({ ...prev, bookmarks }));
  }

  function handlePlaceCoords(itemId: string, placeId: string, coords: Coords) {
    setTrip((prev) => ({ ...prev, items: setPlaceCoords(prev.items, itemId, placeId, coords) }));
  }

  function openMap() {
    if (trip.mapUrl) {
      window.open(trip.mapUrl, '_blank', 'noreferrer');
    } else {
      alert('지도 링크가 설정되지 않았습니다. 여행 목록에서 설정할 수 있습니다.');
    }
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
      <div className="trip-back">
        <a className="trip-back-link" href={import.meta.env.BASE_URL}>
          ← 여행 목록
        </a>
      </div>
      <header className={scrolled ? 'app__header app__header--trip app__header--scrolled' : 'app__header app__header--trip'}>
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
            currency={trip.currency}
          />
        )}
      </header>

      <main className="app__list">
        <CalendarSection items={trip.items} selectedDate={activeDate} onSelectDate={setSelectedDate} />

        <button type="button" className="add-btn schedule-add-btn" onClick={openAddForm}>
          + 일정 추가
        </button>

        {rows.length === 0 && (
          <div className="empty-state">
            <p>등록된 일정이 없습니다.</p>
          </div>
        )}

        {activeDate && dayRows.length > 0 && (
          <div className="date-city-row date-city-row--first">
            <span className="date-divider">{formatDateWithWeekday(activeDate)}</span>
            <span className="city-heading">{dayRows[0].item.city}</span>
          </div>
        )}

        {activeDate && hasPlaces && (
          <Suspense fallback={<div className="day-map__placeholder" />}>
            <DayMap
              items={trip.items}
              date={activeDate}
              onPlaceCoords={handlePlaceCoords}
              focusRequest={focusRequest}
            />
          </Suspense>
        )}

        {dayRows.map(({ item, showCity }, index) => (
          <div key={item.id} className="schedule-row">
            {index > 0 && showCity && <div className="city-heading">{item.city}</div>}
            <ScheduleItemCard
              item={item}
              onUpdate={handleUpdate}
              onEdit={() => openEditForm(item)}
              onDelete={() => handleDelete(item.id)}
              badges={placeBadges}
              onPlaceBadge={(key) => setFocusRequest((prev) => ({ key, n: (prev?.n ?? 0) + 1 }))}
            />
          </div>
        ))}
      </main>

      {formOpen && (
        <ScheduleForm
          initial={editingItem}
          defaultDate={activeDate ?? today}
          defaultCity={dayLastItem?.city ?? lastItem?.city ?? ''}
          defaultStartTime={defaultStartTime}
          onSave={handleSave}
          onCancel={() => {
            setFormOpen(false);
            setEditingItem(null);
          }}
        />
      )}

      {saveIssue && (
        <div className="save-banner" role="alert">
          {saveIssue === 'stuck'
            ? '서버에 저장하지 못하고 있어요. 연결이나 서버 사용량 한도 문제일 수 있어요. 이 화면을 닫거나 새로고침하면 방금 한 수정이 사라질 수 있습니다.'
            : '저장에 실패했어요. 권한이나 연결 문제일 수 있어요. 새로고침하면 방금 한 수정이 사라질 수 있습니다.'}
        </div>
      )}

      <BottomNav
        expenses={trip.expenses}
        onExpensesChange={handleExpensesChange}
        luggage={trip.prepChecklist}
        onLuggageChange={handleLuggageChange}
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
