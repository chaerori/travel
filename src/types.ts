export type LinkedText = {
  id: string;
  label: string;
  url?: string;
  /** 이동 경로 장소 옆에 표시할 아이콘 종류. 예전 데이터는 photoSpot(사진 스폿)만 가진다. */
  spot?: Spot;
  photoSpot?: boolean;
  /** 지도에 표시할 좌표. 링크에서 읽거나 이름 검색, 직접 지정으로 채운다. */
  lat?: number;
  lng?: number;
};

export type Spot = 'photo' | 'bike' | 'tram' | 'bus';

export type PrepItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type Luggage = {
  id: string;
  name: string;
  items: PrepItem[];
};

export type ScheduleContent =
  | { type: 'fixed'; item: LinkedText; info?: string }
  | { type: 'choices'; title: string; options: LinkedText[] }
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

export type CurrencyCode = 'KRW' | 'USD' | 'JPY' | 'EUR' | 'AUD';

export type BookmarkItem = {
  id: string;
  label: string;
  location: string;
  description: string;
  url: string;
};

export type BookmarkCategory = 'food' | 'cafe' | 'attraction';

export type Bookmarks = Record<BookmarkCategory, BookmarkItem[]>;

export type ExpenseEntry = {
  id: string;
  label: string;
  payer: string;
  amount: number;
  note: string;
};

export type Trip = {
  title: string;
  budget: Budget;
  items: ScheduleItem[];
  mapUrl: string;
  bookmarks: Bookmarks;
  showBudget: boolean;
  currency: CurrencyCode;
  expenses: ExpenseEntry[];
  prepChecklist: Luggage[];
};

export type TripIndexEntry = {
  id: string;
  title: string;
  ownerEmail: string;
  sharedEmails: string[];
};
