/** A short project key from a name: the initials of several words, or the start of a single word. */
export function suggestKey(name: string): string {
  const words = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  const key = words.length > 1 ? words.map((w) => w[0]).join('') : (words[0] ?? '');
  return key.slice(0, 4);
}

/**
 * A key nobody uses yet. Keys must be unique across all projects, archived ones included (they keep theirs),
 * so a client's second project becomes AB2, then AB3, and so on. A key starts with a letter and has 2-10 characters.
 */
export function uniqueKey(name: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((k) => k.toUpperCase()));
  let base = suggestKey(name);
  if (!/^[A-Z]/.test(base)) base = `P${base}`;
  if (base.length < 2) base = `${base}PR`;
  if (!used.has(base)) return base;
  for (let n = 2; n < 10_000; n++) {
    const suffix = String(n);
    const key = `${base.slice(0, 10 - suffix.length)}${suffix}`;
    if (!used.has(key)) return key;
  }
  return `${base}${Date.now().toString(36).toUpperCase()}`.slice(0, 10);
}
