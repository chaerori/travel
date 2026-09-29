export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function parseWon(input: string): number {
  const digits = input.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}
