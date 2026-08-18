import type { BadgeKey } from './attendance-format';

export const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  proposal: 'Proposal',
  deposit: 'Deposit',
  follow_up_ongoing: 'Follow-Up Ongoing',
  meeting_follow_up: 'Meeting Follow-Up',
  won: 'Won',
  lost: 'Lost',
};

export const STATUS_TONE: Record<string, BadgeKey> = {
  new: 'badgeGray',
  proposal: 'badgeBlue',
  deposit: 'badgeYellow',
  follow_up_ongoing: 'badgeYellow',
  meeting_follow_up: 'badgeBlue',
  won: 'badgeGreen',
  lost: 'badgeRed',
};

export const AGING_LABELS: Record<string, string> = {
  follow_up_aging: '7+ DAYS NO TOUCH',
  deposit_aging: 'DEPOSIT AGING — 14+ DAYS',
  booking_lag: 'BOOKING LAG — 4+ DAYS',
  no_contact: 'NO CONTACT YET',
};

export const LOSS_REASON_LABELS: Record<string, string> = {
  price: 'Price',
  timing: 'Timing',
  partner_spouse: 'Partner / Spouse',
  competitor: 'Competitor',
  ghosted: 'Ghosted',
  not_qualified: 'Not Qualified',
};

export const MEETING_STATUS_LABELS: Record<string, string> = {
  show: 'Show',
  no_show: 'No-Show',
  rescheduled_by_us: 'Rescheduled by Us',
  rescheduled_by_them: 'Rescheduled by Them',
  cancel: 'Cancel',
  dq: 'DQ',
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: 'Call',
  whatsapp: 'WhatsApp',
  email: 'Email',
  instagram_dm: 'Instagram DM',
  meeting: 'Meeting',
  follow_up: 'Follow-Up',
  proposal_sent: 'Proposal Sent',
  payment_request: 'Payment Request',
  status_change: 'Status Change',
  field_change: 'Field Update',
  note: 'Note',
  other: 'Other',
};

export function formatCurrency(amount: number | string | null | undefined): string {
  const n = amount == null ? 0 : Number(amount);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatDateOnly(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
