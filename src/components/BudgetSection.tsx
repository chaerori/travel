import type { Budget, PaymentMethod, ScheduleItem } from '../types';
import { formatWon, parseWon } from '../utils/currency';

type Props = {
  budget: Budget;
  items: ScheduleItem[];
  onChange: (budget: Budget) => void;
};

function sumExpenses(items: ScheduleItem[], method: PaymentMethod): number {
  return items.reduce((sum, item) => {
    if (item.expense && item.expense.method === method) return sum + item.expense.amount;
    return sum;
  }, 0);
}

export function BudgetSection({ budget, items, onChange }: Props) {
  const cardSpent = sumExpenses(items, 'card');
  const cashSpent = sumExpenses(items, 'cash');

  return (
    <div className="budget-section">
      <div className="budget-card">
        <span className="budget-card__label">카드</span>
        <input
          className="budget-card__input"
          type="text"
          inputMode="numeric"
          value={budget.cardTotal ? budget.cardTotal.toLocaleString('ko-KR') : ''}
          placeholder="0"
          onChange={(e) => onChange({ ...budget, cardTotal: parseWon(e.target.value) })}
        />
        <span className="budget-card__remaining">잔액 {formatWon(budget.cardTotal - cardSpent)}</span>
      </div>
      <div className="budget-card">
        <span className="budget-card__label">현금</span>
        <input
          className="budget-card__input"
          type="text"
          inputMode="numeric"
          value={budget.cashTotal ? budget.cashTotal.toLocaleString('ko-KR') : ''}
          placeholder="0"
          onChange={(e) => onChange({ ...budget, cashTotal: parseWon(e.target.value) })}
        />
        <span className="budget-card__remaining">잔액 {formatWon(budget.cashTotal - cashSpent)}</span>
      </div>
    </div>
  );
}
