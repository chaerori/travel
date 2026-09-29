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
  | { type: 'choices'; options: LinkedText[]; selectedId: string | null }
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
};

export type Budget = {
  cardTotal: number;
  cashTotal: number;
};

export type Trip = {
  title: string;
  budget: Budget;
  items: ScheduleItem[];
};
