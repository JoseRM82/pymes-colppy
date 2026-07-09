export function formatNumber(value: number): string {
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatImporte(importe: number): string {
  return formatNumber(importe);
}

export function formatMonthTotal(total: number): string {
  return `($${formatNumber(total)})`;
}

export function formatPercentChange(current: number, previous: number): string | null {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? '+' : '-';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

export function normalizeDecimalInput(value: string): string {
  return value.replace(',', '.');
}
