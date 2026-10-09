/** Colours people can give a project or a label. */
export interface PaletteColor {
  name: string;
  hex: string;
}

export const PALETTE: PaletteColor[] = [
  { name: 'Crimson', hex: '#F43F5E' },
  { name: 'Ruby', hex: '#E11D48' },
  { name: 'Coral', hex: '#FF6B5E' },
  { name: 'Vermilion', hex: '#FF453A' },
  { name: 'Tangerine', hex: '#FF8A00' },
  { name: 'Amber', hex: '#FFB000' },
  { name: 'Gold', hex: '#E9C349' },
  { name: 'Copper', hex: '#D97745' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Jade', hex: '#00A878' },
  { name: 'Mint', hex: '#34D399' },
  { name: 'Lime', hex: '#A3E635' },
  { name: 'Chartreuse', hex: '#84CC16' },
  { name: 'Pine', hex: '#16856B' },
  { name: 'Electric Blue', hex: '#2563EB' },
  { name: 'Cobalt', hex: '#3657D6' },
  { name: 'Azure', hex: '#0EA5E9' },
  { name: 'Sky Cyan', hex: '#22D3EE' },
  { name: 'Ice Blue', hex: '#38BDF8' },
  { name: 'Deep Aqua', hex: '#00B8A9' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Amethyst', hex: '#A855F7' },
  { name: 'Electric Purple', hex: '#9333EA' },
  { name: 'Orchid', hex: '#C026D3' },
  { name: 'Magenta', hex: '#E11D9A' },
  { name: 'Hot Pink', hex: '#FF3D9A' },
  { name: 'Rose', hex: '#FB7185' },
  { name: 'Lavender', hex: '#A78BFA' },
  { name: 'Steel Blue', hex: '#4682B4' },
  { name: 'Salmon', hex: '#FA8072' },
  // Yellows, golds and earth tones.
  { name: 'Neon Yellow', hex: '#E5FF00' },
  { name: 'Lemon', hex: '#FFE600' },
  { name: 'Sunflower', hex: '#FFC400' },
  { name: 'Marigold', hex: '#FFAA00' },
  { name: 'Old Gold', hex: '#B89100' },
  { name: 'Butter', hex: '#FFF59D' },
  { name: 'Acid Lime', hex: '#B5F000' },
  { name: 'Moss', hex: '#8A9A25' },
  { name: 'Pumpkin', hex: '#F77F00' },
  { name: 'Ochre', hex: '#CC7722' },
  { name: 'Caramel', hex: '#A97142' },
  { name: 'Sand', hex: '#C8B27D' },
];

/**
 * Order used when a colour is picked automatically. It alternates between very different hues
 * (green, blue, orange, purple, red, ...) so neighbouring items in a list do not look alike.
 */
const AUTO_ORDER = [
  'Emerald', 'Electric Blue', 'Tangerine', 'Violet', 'Crimson', 'Azure', 'Amber', 'Orchid',
  'Jade', 'Cobalt', 'Coral', 'Amethyst', 'Lime', 'Hot Pink', 'Deep Aqua', 'Copper',
  'Steel Blue', 'Rose', 'Chartreuse', 'Lavender', 'Ruby', 'Sky Cyan', 'Gold', 'Electric Purple',
  'Pine', 'Magenta', 'Mint', 'Vermilion', 'Ice Blue', 'Salmon',
  'Sunflower', 'Moss', 'Pumpkin', 'Butter', 'Old Gold', 'Acid Lime',
  'Caramel', 'Lemon', 'Ochre', 'Marigold', 'Sand', 'Neon Yellow',
];

const byName = new Map(PALETTE.map((c) => [c.name, c]));
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Colours that active projects are using, as lowercase hex -> project name. Archived projects do not
 * count, so their colour is free to reuse. Pass `exceptId` to ignore one project (the one being edited).
 */
export function colorsInUse(projects: Array<{ id: string; name: string; color: string; status: string }>, exceptId?: string): Map<string, string> {
  const taken = new Map<string, string>();
  for (const p of projects) {
    if (p.status === 'active' && p.id !== exceptId) taken.set(p.color.toLowerCase(), p.name);
  }
  return taken;
}

export function colorName(hex: string): string {
  return PALETTE.find((c) => same(c.hex, hex))?.name ?? 'Custom';
}

/**
 * The next colour that nothing in `used` has yet, following the spread-out order above.
 * Once every colour is taken it starts over, so a new item still always gets a colour.
 */
export function nextColor(used: string[]): string {
  const ordered = AUTO_ORDER.map((name) => byName.get(name)!.hex);
  const free = ordered.find((hex) => !used.some((u) => same(u, hex)));
  return free ?? ordered[used.length % ordered.length];
}
