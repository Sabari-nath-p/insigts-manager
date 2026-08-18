/**
 * Not a Prisma model field anywhere (working-day lists are stored as a `Json` column, e.g.
 * `User.workingDays`), so Prisma never generates a client-side enum for it — defined here
 * instead and used purely for validation/typing at the application layer.
 */
export enum WeekDay {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
}
