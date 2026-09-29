export type LinkedText = {
  id: string;
  label: string;
  url?: string;
};

export type PrepItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type ScheduleContent =
  | { type: 'fixed'; item: LinkedText }
  | { type: 'choices'; title: string; options: LinkedText[]; selectedId: string | null }
  | { type: 'route'; title: string; stops: LinkedText[] };

export type PaymentMethod = 'card' | 'cash';

export type Expense = {
  amount: number;
  method: PaymentMethod;
};

export type ScheduleItem = {
  id: string;
  date: string; // YYYY-MM-DD
  city: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm, '' if none
  content: ScheduleContent;
  memo: string;
  prep: PrepItem[];
  expense: Expense | null;
  needsReservation: boolean;
};

export type Budget = {
  cardTotal: number;
  cashTotal: number;
};

export type BookmarkItem = {
  id: string;
  label: string;
  location: string;
  description: string;
  url: string;
};

export type BookmarkCategory = 'food' | 'cafe' | 'attraction';

export type Bookmarks = Record<BookmarkCategory, BookmarkItem[]>;

export type Trip = {
  title: string;
  budget: Budget;
  items: ScheduleItem[];
  mapUrl: string;
  bookmarks: Bookmarks;
};

export type TripIndexEntry = {
  id: string;
  title: string;
};
