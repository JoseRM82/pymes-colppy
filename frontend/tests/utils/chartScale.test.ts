import { describe, expect, it } from 'vitest';
import { buildYScale } from '../../src/utils/chartScale';

describe('chartScale', () => {
  it('genera ticks redondos con max superior al dato', () => {
    const { maxY, ticks } = buildYScale([100, 200]);
    expect(maxY).toBeGreaterThanOrEqual(220);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBe(maxY);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
  });

  it('escala valores grandes con pasos legibles', () => {
    const { maxY, ticks } = buildYScale([1_224_073]);
    expect(maxY).toBeGreaterThanOrEqual(1_224_073);
    expect(ticks.every((t, i) => i === 0 || t > ticks[i - 1])).toBe(true);
  });
});
