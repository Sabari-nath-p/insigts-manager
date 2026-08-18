import { Lead, LeadStatus } from '@prisma/client';

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function num(v: string | null | undefined): number {
  return v == null ? 0 : Number(v);
}

// ==========================================================================
// Money — section 10 & 60. Never stored; always computed on read.
// ==========================================================================

export interface LeadFinancials {
  dealValue: number;
  refundAmount: number;
  netRevenue: number;
  resolvedCommissionPercent: number;
  earnings: number;
}

/** Net Revenue = Revenue Generated (deal value) - Refunds/Clawbacks. */
export function computeLeadFinancials(lead: Pick<Lead, 'dealValue' | 'refundAmount' | 'commissionOverridePercent'>, ruleBasedPercent: number): LeadFinancials {
  const dealValue = num(lead.dealValue);
  const refundAmount = num(lead.refundAmount);
  const netRevenue = round2(dealValue - refundAmount);
  const resolvedCommissionPercent = lead.commissionOverridePercent != null ? num(lead.commissionOverridePercent) : ruleBasedPercent;
  const earnings = round2(netRevenue * (resolvedCommissionPercent / 100));
  return { dealValue, refundAmount, netRevenue, resolvedCommissionPercent, earnings };
}

// ==========================================================================
// Aging / warning flags — sections 13-15, 58
// ==========================================================================

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

/** Follow-Up Ongoing leads untouched 7+ days (section 13). */
export function isFollowUpAging(lead: Pick<Lead, 'status' | 'lastTouchAt'>, now: Date = new Date()): boolean {
  if (lead.status !== LeadStatus.follow_up_ongoing || !lead.lastTouchAt) return false;
  return daysBetween(new Date(lead.lastTouchAt), now) >= 7;
}

/** Unpaid deposits 14+ days (section 14) — only flags a genuinely pending deposit. */
export function isDepositAging(
  lead: Pick<Lead, 'status' | 'depositAmount' | 'depositPaidAt' | 'meetingDate'>,
  now: Date = new Date(),
): boolean {
  if (lead.status !== LeadStatus.deposit) return false;
  if (num(lead.depositAmount) <= 0) return false;
  if (lead.depositPaidAt) return false; // already paid — not a leak
  const since = lead.meetingDate ? new Date(lead.meetingDate) : null;
  if (!since) return false;
  return daysBetween(since, now) >= 14;
}

/** Meeting booked more than 4 days before the meeting date (section 15). */
export function bookingLagDays(lead: Pick<Lead, 'meetingBookedAt' | 'meetingDate'>): number | null {
  if (!lead.meetingBookedAt || !lead.meetingDate) return null;
  const booked = new Date(lead.meetingBookedAt);
  const meeting = new Date(`${lead.meetingDate}T00:00:00`);
  return daysBetween(booked, meeting);
}

export function isBookingLagWarning(lead: Pick<Lead, 'meetingBookedAt' | 'meetingDate'>): boolean {
  const lag = bookingLagDays(lead);
  return lag != null && lag > 4;
}

/** New lead created but never contacted (part of section 39's leak list). */
export function isNoContact(lead: Pick<Lead, 'status' | 'firstContactAt' | 'createdAt'>): boolean {
  return lead.status === LeadStatus.new && !lead.firstContactAt;
}

export type AgingStatus = 'follow_up_aging' | 'deposit_aging' | 'booking_lag' | 'no_contact' | null;

/** The single most relevant warning for a lead, used for the Kanban card / Lead Log "Aging" column. */
export function primaryAgingStatus(
  lead: Pick<Lead, 'status' | 'lastTouchAt' | 'depositAmount' | 'depositPaidAt' | 'meetingDate' | 'meetingBookedAt' | 'firstContactAt' | 'createdAt'>,
  now: Date = new Date(),
): AgingStatus {
  if (isFollowUpAging(lead, now)) return 'follow_up_aging';
  if (isDepositAging(lead, now)) return 'deposit_aging';
  if (isBookingLagWarning(lead)) return 'booking_lag';
  if (isNoContact(lead)) return 'no_contact';
  return null;
}

// ==========================================================================
// Setter / closer metrics — sections 22-26, 60
// ==========================================================================

export function speedToLeadMinutes(lead: Pick<Lead, 'createdAt' | 'firstContactAt'>): number | null {
  if (!lead.firstContactAt) return null;
  return Math.round((new Date(lead.firstContactAt).getTime() - new Date(lead.createdAt).getTime()) / 60000);
}

export function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return round2((numerator / denominator) * 100);
}

// ==========================================================================
// Payment conversion — section 30
// ==========================================================================

export function daysToCollect(lead: Pick<Lead, 'depositPaidAt' | 'paidInFullAt'>): number | null {
  if (!lead.depositPaidAt || !lead.paidInFullAt) return null;
  return daysBetween(new Date(`${lead.depositPaidAt}T00:00:00`), new Date(`${lead.paidInFullAt}T00:00:00`));
}
