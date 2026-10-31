/** The second line shown under a team-status alert, in the toast and in the bell. */
const PRESENCE_NOTE: Record<string, string> = {
  'presence.started': 'Available now to contact',
  'presence.resumed': 'Available now to contact',
  'presence.paused': 'Will be back very soon',
};

/** Servers that still send the older wording get the same title as new ones. */
export function alertTitle(type: string, title: string): string {
  return type === 'presence.paused' ? title.replace(/ paused for a break$/, ' is on break') : title;
}

/** The notification's own text wins; team-status alerts without one get a friendly default. */
export function alertBody(type: string, body: string | null): string | null {
  return body ?? PRESENCE_NOTE[type] ?? null;
}
