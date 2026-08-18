/** Shape of one entry in PayrollRecord.exceptions (a Prisma Json column, not a Prisma model). */
export interface PayrollException {
  code: 'missing_checkout' | 'unresolved_absence' | 'unapproved_correction';
  message: string;
  date: string;
}
