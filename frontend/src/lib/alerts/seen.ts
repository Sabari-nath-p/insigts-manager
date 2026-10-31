/**
 * Remembers which notifications already popped up, so a page change, a second tab or a reload never
 * repeats one. Kept in localStorage (shared by every tab of this browser) with an in-memory copy as a
 * fallback for browsers that block storage.
 */

const KEEP = 200;
const memory = new Map<string, Set<string>>();

function stored(key: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Returns the ids that have not been shown yet, and marks them as shown. */
export function claimUnseen(source: string, ids: string[]): string[] {
  const key = `insights_alerts_seen_${source}`;
  const saved = stored(key);
  const mem = memory.get(source) ?? new Set<string>();
  memory.set(source, mem);
  const have = new Set([...saved, ...mem]);
  const fresh = ids.filter((id) => !have.has(id));
  if (fresh.length === 0) return [];
  fresh.forEach((id) => mem.add(id));
  try {
    localStorage.setItem(key, JSON.stringify([...saved, ...fresh].slice(-KEEP)));
  } catch {
    /* the in-memory copy still prevents repeats in this tab */
  }
  return fresh;
}
