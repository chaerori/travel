import { useRef, useState } from 'react';
import type { ExpenseEntry } from '../types';
import { formatWon, parseWon } from '../utils/currency';
import { makeId } from '../utils/id';
import { DeleteIcon } from './icons/DeleteIcon';

type ExpenseFormState = {
  label: string;
  payer: string;
  amount: string;
  note: string;
};

function emptyExpenseForm(): ExpenseFormState {
  return { label: '', payer: '', amount: '', note: '' };
}

type Props = {
  expenses: ExpenseEntry[];
  onChange: (expenses: ExpenseEntry[]) => void;
  onClose: () => void;
};

export function ExpenseModal({ expenses, onChange, onClose }: Props) {
  const [form, setForm] = useState<ExpenseFormState>(emptyExpenseForm());
  const dragIndex = useRef<number | null>(null);

  function handleDragPointerDown(e: React.PointerEvent<HTMLSpanElement>, index: number) {
    dragIndex.current = index;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDragPointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    if (dragIndex.current === null) return;
    const target = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>('[data-expense-index]');
    if (!target) return;
    const targetIndex = Number(target.dataset.expenseIndex);
    if (targetIndex === dragIndex.current) return;
    const fromIndex = dragIndex.current;
    const next = [...expenses];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
    dragIndex.current = targetIndex;
  }

  function handleDragPointerUp() {
    dragIndex.current = null;
  }

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

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

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
                {expenses.length > 1 && <th className="expense-table__handle" />}
                <th>항목</th>
                <th>결제처</th>
                <th>금액</th>
                <th>비고</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e, index) => (
                <tr key={e.id} data-expense-index={index}>
                  {expenses.length > 1 && (
                    <td className="expense-table__handle">
                      <span
                        className="drag-handle"
                        onPointerDown={(ev) => handleDragPointerDown(ev, index)}
                        onPointerMove={handleDragPointerMove}
                        onPointerUp={handleDragPointerUp}
                        onPointerCancel={handleDragPointerUp}
                      >
                        ⠿
                      </span>
                    </td>
                  )}
                  <td>{e.label}</td>
                  <td>{e.payer}</td>
                  <td className="expense-table__amount">{formatWon(e.amount)}</td>
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
            <tfoot>
              <tr className="expense-table__total-row">
                <td colSpan={(expenses.length > 1 ? 1 : 0) + 2} />
                <td className="expense-table__amount">{formatWon(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}

        <form className="modal-form" onSubmit={submitForm}>
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
