import { describe, expect, it } from 'vitest';
import { buildYScale } from './chartScale';

describe('chartScale', () => {
  it('genera 7 ticks equidistantes con max +10%', () => {
    const { maxY, ticks } = buildYScale([100, 200]);
    expect(maxY).toBeCloseTo(220);
    expect(ticks).toHaveLength(7);
    expect(ticks[0]).toBe(0);
    expect(ticks[6]).toBeCloseTo(220);
  });
});
