import { HolidayType } from '@prisma/client';

export interface DefaultHoliday {
  date: string;
  name: string;
  type: HolidayType;
  isTentative?: boolean;
}

/** The company's standard holiday calendar, Apr 2026 – Mar 2027. Used by "restore defaults". */
export const DEFAULT_HOLIDAYS: DefaultHoliday[] = [
  { date: '2026-04-02', name: 'Maundy Thursday', type: HolidayType.public_holiday },
  { date: '2026-04-03', name: 'Good Friday', type: HolidayType.public_holiday },
  { date: '2026-04-05', name: 'Easter Sunday', type: HolidayType.company_holiday },
  { date: '2026-04-14', name: 'Dr. B. R. Ambedkar Jayanthi', type: HolidayType.public_holiday },
  { date: '2026-04-15', name: 'Vishu', type: HolidayType.public_holiday },
  { date: '2026-05-01', name: 'May Day', type: HolidayType.public_holiday },
  { date: '2026-08-15', name: 'Independence Day', type: HolidayType.public_holiday },
  { date: '2026-08-25', name: 'First Onam', type: HolidayType.public_holiday },
  { date: '2026-08-26', name: 'Thiruvonam', type: HolidayType.public_holiday },
  { date: '2026-09-04', name: 'Sreekrishna Jayanthi', type: HolidayType.public_holiday },
  { date: '2026-10-02', name: 'Gandhi Jayanthi', type: HolidayType.public_holiday },
  { date: '2026-10-20', name: 'Mahanavami', type: HolidayType.public_holiday },
  { date: '2026-10-21', name: 'Vijayadasami', type: HolidayType.public_holiday },
  { date: '2026-11-08', name: 'Deepavali', type: HolidayType.company_holiday },
  { date: '2026-12-25', name: 'Christmas Day', type: HolidayType.public_holiday },
  { date: '2027-01-26', name: 'Republic Day', type: HolidayType.public_holiday },
  { date: '2027-03-10', name: 'Eid-ul-Fitr', type: HolidayType.public_holiday, isTentative: true },
  { date: '2027-03-25', name: 'Maundy Thursday', type: HolidayType.public_holiday },
  { date: '2027-03-26', name: 'Good Friday', type: HolidayType.public_holiday },
  { date: '2027-03-28', name: 'Easter Sunday', type: HolidayType.company_holiday },
];
