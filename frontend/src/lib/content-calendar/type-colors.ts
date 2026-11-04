/**
 * Each kind of post gets a colour dot. The colour comes from the type's name alone, so "Poster" is the same
 * colour for everyone in every month, and nothing is stored. Red is left out on purpose: it marks special days.
 * Class names are written out in full so Tailwind can see them.
 */

const FIXED: Record<string, string> = {
  poster: 'bg-emerald-500',
  carousel: 'bg-blue-500',
  video: 'bg-yellow-400',
};

/** For everything else people type (GMB, website submission date, ...). Clearly apart from green, blue, yellow and red. */
const AUTO = ['bg-violet-500', 'bg-orange-500', 'bg-teal-700', 'bg-fuchsia-500', 'bg-amber-800', 'bg-slate-500'];

const keyOf = (type: string) => type.trim().toLowerCase();

export function typeDotClass(type: string): string {
  const key = keyOf(type);
  if (FIXED[key]) return FIXED[key];
  let hash = 5381;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
  return AUTO[Math.abs(hash) % AUTO.length];
}
