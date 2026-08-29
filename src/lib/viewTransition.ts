/**
 * The geometry behind the theme-toggle reveal: how far a circle centred at
 * (x, y) has to grow before it covers every corner of a width by height
 * viewport.
 *
 * Kept pure and separate from the DOM/animation orchestration in
 * ThemeToggle.tsx so the one bit of math worth getting wrong - which corner
 * ends up furthest - is unit testable without a browser.
 */
export function maxRadius(x: number, y: number, width: number, height: number): number {
  const dx = Math.max(x, width - x);
  const dy = Math.max(y, height - y);
  return Math.hypot(dx, dy);
}
