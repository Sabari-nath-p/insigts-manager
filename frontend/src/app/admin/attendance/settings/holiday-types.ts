import { BadgeKey } from '@/lib/attendance-format';

export type HolidayType = 'public_holiday' | 'company_holiday' | 'optional_holiday' | 'restricted_holiday';

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: HolidayType;
  description: string | null;
  isPaid: boolean;
  isOptional: boolean;
  isTentative: boolean;
  applicableDepartments: string[] | null;
  isActive: boolean;
}

export const HOLIDAY_TYPES: Array<{ value: HolidayType; label: string }> = [
  { value: 'public_holiday', label: 'Public Holiday' },
  { value: 'company_holiday', label: 'Company Holiday' },
  { value: 'optional_holiday', label: 'Optional Holiday' },
  { value: 'restricted_holiday', label: 'Restricted Holiday' },
];

export function holidayTypeLabel(type: string): string {
  return HOLIDAY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function holidayTypeBadgeKey(type: HolidayType): BadgeKey {
  switch (type) {
    case 'public_holiday':
      return 'badgeBlue';
    case 'company_holiday':
      return 'badgeGreen';
    case 'optional_holiday':
      return 'badgeYellow';
    case 'restricted_holiday':
    default:
      return 'badgeGray';
  }
}
