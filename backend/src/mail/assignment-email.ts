export interface AssignedTask {
  ref: string;
  title: string;
  projectKey: string;
  projectName: string;
}

export interface AssignmentEmail {
  subject: string;
  text: string;
  html: string;
}

/** How many tasks are listed in one email; the rest are summed up in a line. */
const MAX_LISTED = 20;

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * The email telling someone they were given work. One task gets that task's name and link; several get a list and
 * a link to My Work. Every value that came from a person (task titles, names) is escaped for the HTML part and
 * flattened to one line for the subject, so a clever title can neither inject markup nor extra mail headers.
 * Without `appUrl` the email simply has no links.
 */
export function buildAssignmentEmail(args: { recipientName: string; actorNames: string[]; tasks: AssignedTask[]; appUrl: string | null }): AssignmentEmail {
  const { tasks, appUrl } = args;
  const first = oneLine(args.recipientName).split(' ')[0] || 'there';
  const actors = [...new Set(args.actorNames.map(oneLine).filter(Boolean))];
  const by = actors.length === 1 ? actors[0] : null;
  const single = tasks.length === 1 ? tasks[0] : null;

  const subject = single
    ? `${by ? `${by} assigned you` : 'You were assigned'} ${single.ref}: ${clip(oneLine(single.title), 80)}`
    : `${by ? `${by} assigned you` : 'You were assigned'} ${tasks.length} tasks`;

  const link = (t: AssignedTask) => (appUrl ? `${appUrl}/projects/${encodeURIComponent(t.projectKey)}?task=${encodeURIComponent(t.ref)}` : null);
  const openAll = appUrl ? (single ? link(single) : `${appUrl}/projects/my-work`) : null;

  const listed = tasks.slice(0, MAX_LISTED);
  const extra = tasks.length - listed.length;
  const intro = single ? `${by ?? 'Someone'} assigned you a task:` : `${by ?? 'People'} assigned you ${tasks.length} tasks:`;

  const textLines = listed.map((t) => `- ${t.ref}  ${oneLine(t.title)}  (${oneLine(t.projectName)})`);
  const text = [
    `Hi ${first},`,
    '',
    intro,
    '',
    ...textLines,
    ...(extra > 0 ? [`...and ${extra} more`] : []),
    ...(openAll ? ['', `Open ${single ? 'it' : 'My Work'}: ${openAll}`] : []),
    '',
    '- Insights',
  ].join('\n');

  const htmlItems = listed
    .map((t) => {
      const href = link(t);
      const name = `<strong>${escapeHtml(t.ref)}</strong> ${escapeHtml(oneLine(t.title))} <span style="color:#71717a">(${escapeHtml(oneLine(t.projectName))})</span>`;
      return `<li style="margin:4px 0">${href ? `<a href="${escapeHtml(href)}" style="color:#000;text-decoration:none">${name}</a>` : name}</li>`;
    })
    .join('');
  const html =
    `<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#000;line-height:1.5">` +
    `<p>Hi ${escapeHtml(first)},</p>` +
    `<p>${escapeHtml(intro)}</p>` +
    `<ul style="padding-left:18px">${htmlItems}</ul>` +
    (extra > 0 ? `<p style="color:#71717a">...and ${extra} more</p>` : '') +
    (openAll ? `<p><a href="${escapeHtml(openAll)}" style="display:inline-block;background:#000;color:#fff;padding:8px 18px;border-radius:999px;text-decoration:none">Open ${single ? 'task' : 'My Work'}</a></p>` : '') +
    `<p style="color:#71717a">Insights</p>` +
    `</div>`;

  return { subject, text, html };
}
