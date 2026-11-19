/**
 * Centralized currency and number formatting utility (NFR-01, BR-25).
 * Formats numbers into Egyptian Pounds (ج.م) using Western digits (0-9)
 * without trailing .00 for whole numbers, preserving 2 decimal places for fractions.
 */
export function formatEGP(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0 ج.م';
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(num)) return '0 ج.م';

  const isWhole = Math.abs(num % 1) < 0.00001;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  });

  return `${formatted} ج.م`;
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US');
}
