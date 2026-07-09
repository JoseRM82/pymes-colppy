export function buildYScale(values: number[]) {
  const maxReal = Math.max(...values, 0);
  const maxY = maxReal > 0 ? maxReal * 1.1 : 1;
  const ticks = Array.from({ length: 7 }, (_, i) => (maxY / 6) * i);
  return { maxY, ticks };
}

export function shortMonthLabel(key: string, mode: 'monthly' | 'annual'): string {
  if (mode === 'annual') return key;
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-AR', {
    month: 'short',
    year: '2-digit',
  });
}
