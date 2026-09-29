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
  const cardText = budget.cardTotal ? budget.cardTotal.toLocaleString('ko-KR') : '';
  const cashText = budget.cashTotal ? budget.cashTotal.toLocaleString('ko-KR') : '';

  return (
    <div className="budget-section">
      <div className="budget-col">
        <div className="budget-col__total">
          <span>카드</span>
          <input
            type="text"
            inputMode="numeric"
            value={cardText}
            placeholder="0"
            style={{ width: `${Math.max(cardText.length, 1)}ch` }}
            onChange={(e) => onChange({ ...budget, cardTotal: parseWon(e.target.value) })}
          />
          <span>원</span>
        </div>
        <div className="budget-col__remaining">잔액 {formatWon(budget.cardTotal - cardSpent)}</div>
      </div>
      <div className="budget-col">
        <div className="budget-col__total">
          <span>현금</span>
          <input
            type="text"
            inputMode="numeric"
            value={cashText}
            placeholder="0"
            style={{ width: `${Math.max(cashText.length, 1)}ch` }}
            onChange={(e) => onChange({ ...budget, cashTotal: parseWon(e.target.value) })}
          />
          <span>원</span>
        </div>
        <div className="budget-col__remaining">잔액 {formatWon(budget.cashTotal - cashSpent)}</div>
      </div>
    </div>
  );
}
