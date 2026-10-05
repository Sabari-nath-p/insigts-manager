/** Fractional ordering: a position strictly between two neighbours (either may be absent). */
export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1000;
  if (before === null) return (after as number) - 1000;
  if (after === null) return before + 1000;
  return (before + after) / 2;
}

/** True when two neighbouring positions are too close to split again and the column needs renumbering. */
export function needsRebalance(a: number, b: number): boolean {
  return Math.abs(b - a) < 1e-6;
}
