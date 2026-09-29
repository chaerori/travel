import type { Budget, PaymentMethod, ScheduleItem } from '../types';
import { parseWon } from '../utils/currency';
import { CardIcon } from './icons/CardIcon';
import { CashIcon } from './icons/CashIcon';

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

const VALUE_WIDTH = '7ch';

export function BudgetSection({ budget, items, onChange }: Props) {
  const cardSpent = sumExpenses(items, 'card');
  const cashSpent = sumExpenses(items, 'cash');
  const cardText = budget.cardTotal ? budget.cardTotal.toLocaleString('ko-KR') : '';
  const cashText = budget.cashTotal ? budget.cashTotal.toLocaleString('ko-KR') : '';

  return (
    <div className="budget-section">
      <div className="budget-line">
        <span className="budget-line__label">예산</span>
        <span className="budget-pair">
          <CardIcon />
          <input
            type="text"
            inputMode="numeric"
            value={cardText}
            placeholder="0"
            style={{ width: VALUE_WIDTH }}
            onChange={(e) => onChange({ ...budget, cardTotal: parseWon(e.target.value) })}
          />
          <span>원</span>
        </span>
        <span className="budget-pair">
          <CashIcon />
          <input
            type="text"
            inputMode="numeric"
            value={cashText}
            placeholder="0"
            style={{ width: VALUE_WIDTH }}
            onChange={(e) => onChange({ ...budget, cashTotal: parseWon(e.target.value) })}
          />
          <span>원</span>
        </span>
      </div>
      <div className="budget-line budget-line--dark">
        <span className="budget-line__label">잔액</span>
        <span className="budget-pair">
          <CardIcon />
          <span className="budget-pair__value" style={{ width: VALUE_WIDTH }}>
            {(budget.cardTotal - cardSpent).toLocaleString('ko-KR')}
          </span>
          <span>원</span>
        </span>
        <span className="budget-pair">
          <CashIcon />
          <span className="budget-pair__value" style={{ width: VALUE_WIDTH }}>
            {(budget.cashTotal - cashSpent).toLocaleString('ko-KR')}
          </span>
          <span>원</span>
        </span>
      </div>
    </div>
  );
}
