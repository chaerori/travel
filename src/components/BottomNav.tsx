import { lazy, Suspense, useState } from 'react';
import type { Bookmarks, ExpenseEntry, Luggage, ScheduleItem } from '../types';
import type { Coords } from '../utils/dayPlaces';
import { ExpenseModal } from './ExpenseModal';
import { PlacesModal } from './PlacesModal';
import { PrepChecklistModal } from './PrepChecklistModal';
import { BillIcon } from './icons/BillIcon';
import { CityMarkerIcon } from './icons/CityMarkerIcon';
import { GpsLocationIcon } from './icons/GpsLocationIcon';
import { PurseIcon } from './icons/PurseIcon';

// 지도 라이브러리는 용량이 커서 지도를 처음 열 때만 불러온다.
const DayMapModal = lazy(() => import('./DayMapModal').then((m) => ({ default: m.DayMapModal })));

type Props = {
  expenses: ExpenseEntry[];
  onExpensesChange: (expenses: ExpenseEntry[]) => void;
  luggage: Luggage[];
  onLuggageChange: (luggage: Luggage[]) => void;
  bookmarks: Bookmarks;
  onBookmarksChange: (bookmarks: Bookmarks) => void;
  items: ScheduleItem[];
  mapUrl: string;
  onPlaceCoords: (itemId: string, placeId: string, coords: Coords) => void;
};

export function BottomNav({
  expenses,
  onExpensesChange,
  luggage,
  onLuggageChange,
  bookmarks,
  onBookmarksChange,
  items,
  mapUrl,
  onPlaceCoords,
}: Props) {
  const [prepOpen, setPrepOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <>
      <nav className="bottom-nav">
        <button type="button" className="bottom-nav__item" onClick={() => setPrepOpen(true)}>
          <PurseIcon />
          <span>짐 체크리스트</span>
        </button>
        <button type="button" className="bottom-nav__item" onClick={() => setExpenseOpen(true)}>
          <BillIcon />
          <span>비용</span>
        </button>
        <button type="button" className="bottom-nav__item" onClick={() => setPlacesOpen(true)}>
          <GpsLocationIcon />
          <span>가고 싶은 장소</span>
        </button>
        <button type="button" className="bottom-nav__item" onClick={() => setMapOpen(true)}>
          <CityMarkerIcon />
          <span>지도</span>
        </button>
      </nav>

      {prepOpen && (
        <PrepChecklistModal luggage={luggage} onChange={onLuggageChange} onClose={() => setPrepOpen(false)} />
      )}

      {expenseOpen && (
        <ExpenseModal expenses={expenses} onChange={onExpensesChange} onClose={() => setExpenseOpen(false)} />
      )}

      {placesOpen && (
        <PlacesModal bookmarks={bookmarks} onChange={onBookmarksChange} onClose={() => setPlacesOpen(false)} />
      )}

      {mapOpen && (
        <Suspense fallback={null}>
          <DayMapModal items={items} mapUrl={mapUrl} onPlaceCoords={onPlaceCoords} onClose={() => setMapOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
