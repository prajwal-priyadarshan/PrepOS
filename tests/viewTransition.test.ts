import { describe, expect, it } from 'vitest';
import { maxRadius } from '../src/lib/viewTransition';

describe('maxRadius', () => {
  it('reaches the far corner from a point near the top-left', () => {
    expect(maxRadius(0, 0, 1000, 800)).toBe(Math.hypot(1000, 800));
  });

  it('reaches the far corner from a point near the bottom-right', () => {
    expect(maxRadius(1000, 800, 1000, 800)).toBe(Math.hypot(1000, 800));
  });

  it('is symmetric from dead centre', () => {
    expect(maxRadius(500, 400, 1000, 800)).toBe(Math.hypot(500, 400));
  });

  it('picks whichever side is actually further, not just one axis', () => {
    // Near the left edge, far from the bottom - width dominates x, height dominates y.
    expect(maxRadius(50, 750, 1000, 800)).toBe(Math.hypot(950, 750));
  });
});
