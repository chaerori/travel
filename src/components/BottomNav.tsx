import { useState } from 'react';
import type { Bookmarks, ExpenseEntry, Luggage } from '../types';
import { ExpenseModal } from './ExpenseModal';
import { PlacesModal } from './PlacesModal';
import { PrepChecklistModal } from './PrepChecklistModal';
import { BillIcon } from './icons/BillIcon';
import { CityMarkerIcon } from './icons/CityMarkerIcon';
import { GpsLocationIcon } from './icons/GpsLocationIcon';
import { PurseIcon } from './icons/PurseIcon';

type Props = {
  expenses: ExpenseEntry[];
  onExpensesChange: (expenses: ExpenseEntry[]) => void;
  luggage: Luggage[];
  onLuggageChange: (luggage: Luggage[]) => void;
  bookmarks: Bookmarks;
  onBookmarksChange: (bookmarks: Bookmarks) => void;
  onOpenMap: () => void;
};

export function BottomNav({
  expenses,
  onExpensesChange,
  luggage,
  onLuggageChange,
  bookmarks,
  onBookmarksChange,
  onOpenMap,
}: Props) {
  const [prepOpen, setPrepOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);

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
        <button
          type="button"
          className="bottom-nav__item"
          onClick={onOpenMap}
          aria-label="지도, 새 탭에서 열기"
        >
          <CityMarkerIcon />
          <span className="bottom-nav__label">
            지도
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 17L17 7M17 7H8M17 7V16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
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
    </>
  );
}
