import { useState } from 'react';
import type { Budget, ExpenseEntry, PaymentMethod, PrepItem, ScheduleItem } from '../types';
import { formatWon, parseWon } from '../utils/currency';
import { makeId } from '../utils/id';
import { BillIcon } from './icons/BillIcon';
import { BulletsIcon } from './icons/BulletsIcon';
import { CardIcon } from './icons/CardIcon';
import { CashIcon } from './icons/CashIcon';
import { DeleteIcon } from './icons/DeleteIcon';

type Props = {
  budget: Budget;
  items: ScheduleItem[];
  onBudgetChange: (budget: Budget) => void;
  expenses: ExpenseEntry[];
  onExpensesChange: (expenses: ExpenseEntry[]) => void;
  prepChecklist: PrepItem[];
  onPrepChecklistChange: (prep: PrepItem[]) => void;
};

function sumExpenses(items: ScheduleItem[], method: PaymentMethod): number {
  return items.reduce((sum, item) => {
    if (item.expense && item.expense.method === method) return sum + item.expense.amount;
    return sum;
  }, 0);
}

const VALUE_WIDTH = '11ch';

export function BudgetSection({
  budget,
  items,
  onBudgetChange,
  expenses,
  onExpensesChange,
  prepChecklist,
  onPrepChecklistChange,
}: Props) {
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [prepOpen, setPrepOpen] = useState(false);

  const cardSpent = sumExpenses(items, 'card');
  const cashSpent = sumExpenses(items, 'cash');
  const cardText = budget.cardTotal ? budget.cardTotal.toLocaleString('ko-KR') : '';
  const cashText = budget.cashTotal ? budget.cashTotal.toLocaleString('ko-KR') : '';

  return (
    <>
      <div className="budget-area">
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
                onChange={(e) => onBudgetChange({ ...budget, cardTotal: parseWon(e.target.value) })}
              />
            </span>
            <span className="budget-pair">
              <CashIcon />
              <input
                type="text"
                inputMode="numeric"
                value={cashText}
                placeholder="0"
                style={{ width: VALUE_WIDTH }}
                onChange={(e) => onBudgetChange({ ...budget, cashTotal: parseWon(e.target.value) })}
              />
            </span>
          </div>
          <div className="budget-line budget-line--dark">
            <span className="budget-line__label">잔액</span>
            <span className="budget-pair">
              <CardIcon original />
              <span className="budget-pair__value" style={{ width: VALUE_WIDTH }}>
                {(budget.cardTotal - cardSpent).toLocaleString('ko-KR')}
              </span>
            </span>
            <span className="budget-pair">
              <CashIcon original />
              <span className="budget-pair__value" style={{ width: VALUE_WIDTH }}>
                {(budget.cashTotal - cashSpent).toLocaleString('ko-KR')}
              </span>
            </span>
          </div>
        </div>

        <button type="button" className="budget-card budget-card--action" onClick={() => setExpenseOpen(true)}>
          <span className="budget-card__title">비용</span>
          <BillIcon />
        </button>

        <button type="button" className="budget-card budget-card--action" onClick={() => setPrepOpen(true)}>
          <span className="budget-card__title">준비물</span>
          <BulletsIcon />
        </button>
      </div>

      {expenseOpen && (
        <ExpenseModal expenses={expenses} onChange={onExpensesChange} onClose={() => setExpenseOpen(false)} />
      )}

      {prepOpen && (
        <PrepChecklistModal
          prep={prepChecklist}
          onChange={onPrepChecklistChange}
          onClose={() => setPrepOpen(false)}
        />
      )}
    </>
  );
}

type ExpenseFormState = {
  label: string;
  payer: string;
  amount: string;
  note: string;
};

function emptyExpenseForm(): ExpenseFormState {
  return { label: '', payer: '', amount: '', note: '' };
}

function ExpenseModal({
  expenses,
  onChange,
  onClose,
}: {
  expenses: ExpenseEntry[];
  onChange: (expenses: ExpenseEntry[]) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ExpenseFormState>(emptyExpenseForm());

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const label = form.label.trim();
    if (!label) return;
    const entry: ExpenseEntry = {
      id: makeId(),
      label,
      payer: form.payer.trim(),
      amount: parseWon(form.amount),
      note: form.note.trim(),
    };
    onChange([...expenses, entry]);
    setForm(emptyExpenseForm());
  }

  function removeExpense(id: string) {
    onChange(expenses.filter((e) => e.id !== id));
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">비용</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {expenses.length > 0 && (
          <table className="expense-table">
            <thead>
              <tr>
                <th>항목</th>
                <th>결제처</th>
                <th>금액</th>
                <th>비고</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>{e.label}</td>
                  <td>{e.payer}</td>
                  <td>{formatWon(e.amount)}</td>
                  <td>{e.note}</td>
                  <td>
                    <button
                      type="button"
                      className="icon-action icon-action--danger"
                      onClick={() => removeExpense(e.id)}
                      aria-label="삭제"
                    >
                      <DeleteIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form onSubmit={submitForm}>
          <div className="form-row form-row--split">
            <label className="form-field">
              <span>항목</span>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="항목"
              />
            </label>
            <label className="form-field">
              <span>결제처</span>
              <input
                type="text"
                value={form.payer}
                onChange={(e) => setForm((f) => ({ ...f, payer: e.target.value }))}
                placeholder="결제처"
              />
            </label>
          </div>
          <div className="form-row form-row--split">
            <label className="form-field">
              <span>금액</span>
              <input
                type="text"
                inputMode="numeric"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9]/g, '') }))}
                placeholder="0"
              />
            </label>
            <label className="form-field">
              <span>비고</span>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="비고 (선택)"
              />
            </label>
          </div>
          <div className="form-actions--end">
            <button type="submit" className="add-btn">
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PrepChecklistModal({
  prep,
  onChange,
  onClose,
}: {
  prep: PrepItem[];
  onChange: (prep: PrepItem[]) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState('');

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    onChange([...prep, { id: makeId(), label: trimmed, checked: false }]);
    setLabel('');
  }

  function toggleItem(id: string) {
    onChange(prep.map((p) => (p.id === id ? { ...p, checked: !p.checked } : p)));
  }

  function removeItem(id: string) {
    onChange(prep.filter((p) => p.id !== id));
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">준비물</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {prep.length > 0 && (
          <ul className="prep-list">
            {prep.map((p) => (
              <li key={p.id} className="checklist-row">
                <label className="prep-list__row">
                  <input type="checkbox" checked={p.checked} onChange={() => toggleItem(p.id)} />
                  <span className={p.checked ? 'prep-list__label prep-list__label--checked' : 'prep-list__label'}>
                    {p.label}
                  </span>
                </label>
                <button type="button" className="icon-btn" onClick={() => removeItem(p.id)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="link-editor__row" onSubmit={addItem}>
          <input type="text" placeholder="준비물 이름" value={label} onChange={(e) => setLabel(e.target.value)} />
          <button type="submit" className="add-btn">
            추가
          </button>
        </form>
      </div>
    </div>
  );
}
