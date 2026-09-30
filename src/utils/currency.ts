import type { CurrencyCode } from '../types';

export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function parseWon(input: string): number {
  const digits = input.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}

export const CURRENCY_OPTIONS: { code: CurrencyCode; label: string; unit: string }[] = [
  { code: 'KRW', label: '원 (KRW)', unit: '원' },
  { code: 'USD', label: '달러 (USD)', unit: '달러' },
  { code: 'JPY', label: '엔 (JPY)', unit: '엔' },
  { code: 'EUR', label: '유로 (EUR)', unit: '유로' },
  { code: 'AUD', label: '호주 달러 (AUD)', unit: '호주 달러' },
];

export function getCurrencyUnit(code: CurrencyCode): string {
  return CURRENCY_OPTIONS.find((c) => c.code === code)?.unit ?? '';
}
