const CSV_HEADERS = [
  'leadName',
  'companyName',
  'status',
  'setter',
  'closer',
  'createdAt',
  'meetingDate',
  'meetingStatus',
  'offerMade',
  'saleType',
  'depositAmount',
  'dealValue',
  'cashCollected',
  'refundAmount',
  'earnings',
  'lastTouchAt',
  'nextFollowUpDate',
  'agingStatus',
  'lossReason',
] as const;

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

interface CsvLeadRow {
  leadName: string;
  companyName: string | null;
  status: string;
  setterId: string | null;
  closerId: string | null;
  createdAt: Date | string;
  meetingDate: string | null;
  meetingStatus: string | null;
  offerMade: boolean | null;
  saleType: string | null;
  depositAmount: string;
  dealValue: number;
  cashCollected: string;
  refundAmount: number;
  earnings: number;
  lastTouchAt: Date | string | null;
  nextFollowUpDate: string | null;
  agingStatus: string | null;
  lossReason: string | null;
}

export function leadsToCsv(leads: CsvLeadRow[], nameById: Map<string, string>): string {
  const rows = leads.map((l) =>
    [
      l.leadName,
      l.companyName ?? '',
      l.status,
      l.setterId ? (nameById.get(l.setterId) ?? '') : '',
      l.closerId ? (nameById.get(l.closerId) ?? '') : '',
      new Date(l.createdAt).toISOString(),
      l.meetingDate ?? '',
      l.meetingStatus ?? '',
      l.offerMade == null ? '' : String(l.offerMade),
      l.saleType ?? '',
      l.depositAmount,
      String(l.dealValue),
      l.cashCollected,
      String(l.refundAmount),
      String(l.earnings),
      l.lastTouchAt ? new Date(l.lastTouchAt).toISOString() : '',
      l.nextFollowUpDate ?? '',
      l.agingStatus ?? '',
      l.lossReason ?? '',
    ]
      .map((v) => escapeCsvField(String(v)))
      .join(','),
  );
  return [CSV_HEADERS.join(','), ...rows].join('\n');
}
