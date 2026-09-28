import { useMemo, useState } from 'react';
import './App.css';
import { ScheduleForm } from './components/ScheduleForm';
import { ScheduleItemCard } from './components/ScheduleItemCard';
import { SyncPanel } from './components/SyncPanel';
import { CityMarkerIcon } from './components/icons/CityMarkerIcon';
import type { ScheduleItem } from './types';
import { useCloudTrip } from './utils/cloudTrip';
import { formatDateWithWeekday } from './utils/date';
import { useSyncCode } from './utils/syncCode';

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

function App() {
  const [syncCode, setSyncCode] = useSyncCode();
  const [trip, setTrip, synced] = useCloudTrip(syncCode);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);

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
      setTrip((prev) => ({ ...prev, title: titleDraft.trim() || prev.title }));
    }
    setTitleDraft(null);
  }

  return (
    <div className="app">
      <header className="app__header">
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
          <button
            type="button"
            className="sync-btn"
            onClick={() => setSyncPanelOpen(true)}
            aria-label="기기 간 동기화"
          >
            {synced ? '🔗' : '🔗…'}
          </button>
        </div>
      </header>

      <main className="app__list">
        {rows.length === 0 && (
          <div className="empty-state">
            <p>등록된 일정이 없습니다.</p>
            <p>아래 + 버튼으로 첫 일정을 추가해 보세요.</p>
          </div>
        )}

        {rows.map(({ item, showDate, showCity }) => (
          <div key={item.id} className="schedule-row">
            {showDate && <div className="date-divider">{formatDateWithWeekday(item.date)}</div>}
            {showCity && (
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

      <button type="button" className="fab" onClick={openAddForm} aria-label="일정 추가">
        +
      </button>

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

      {syncPanelOpen && (
        <SyncPanel code={syncCode} onJoin={setSyncCode} onClose={() => setSyncPanelOpen(false)} />
      )}
    </div>
  );
}

export default App;
