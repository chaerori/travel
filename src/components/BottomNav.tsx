import { useState } from 'react';
import type { Bookmarks, ExpenseEntry, PrepItem } from '../types';
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
  prepChecklist: PrepItem[];
  onPrepChecklistChange: (prep: PrepItem[]) => void;
  bookmarks: Bookmarks;
  onBookmarksChange: (bookmarks: Bookmarks) => void;
  onOpenMap: () => void;
};

export function BottomNav({
  expenses,
  onExpensesChange,
  prepChecklist,
  onPrepChecklistChange,
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
          <span>준비물</span>
        </button>
        <button type="button" className="bottom-nav__item" onClick={() => setExpenseOpen(true)}>
          <BillIcon />
          <span>비용</span>
        </button>
        <button type="button" className="bottom-nav__item" onClick={() => setPlacesOpen(true)}>
          <GpsLocationIcon />
          <span>가고 싶은 장소</span>
        </button>
        <button type="button" className="bottom-nav__item" onClick={onOpenMap}>
          <CityMarkerIcon />
          <span>지도</span>
        </button>
      </nav>

      {prepOpen && (
        <PrepChecklistModal prep={prepChecklist} onChange={onPrepChecklistChange} onClose={() => setPrepOpen(false)} />
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
