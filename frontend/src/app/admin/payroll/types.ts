export interface PayrollExceptionView {
  code: string;
  message: string;
  date: string;
}

export interface AdminPayrollRecord {
  id: string;
  userId: string;
  payrollMonth: string;
  calendarDays: number;
  weeklyOffDays: number;
  holidayDays: number;
  workingDays: number;
  standardHoursPerDay: number;
  scheduledMinutes: number;
  actualWorkedMinutes: number;
  payableMinutes: number;
  extraMinutes: number;
  paidLeaveDays: number;
  medicalLeaveDays: number;
  unpaidLeaveDays: number;
  monthlySalaryUsed: string;
  internalHourlyRate: string;
  baseSalaryEarned: string;
  additionsTotal: string;
  deductionsTotal: string;
  finalPayableAmount: string;
  status: string;
  paymentStatus: string;
  exceptions: PayrollExceptionView[] | null;
  fullName: string;
  department: string | null;
  exceptionsCount: number;
}

export interface PayrollAdjustment {
  id: string;
  payrollRecordId: string;
  type: string;
  amount: string;
  reason: string;
  addedBy: string;
  approvalStatus: string;
  isEmployeeVisible: boolean;
  remarks: string | null;
  createdAt: string;
}

export interface PayrollAuditLogEntry {
  id: string;
  payrollRecordId: string | null;
  actorId: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  changedAt: string;
}

export interface PayrollDashboard {
  month: string;
  totalEmployees: number;
  payrollRecordsCount: number;
  totalPayroll: number;
  totalScheduledHours: number;
  totalPayableHours: number;
  totalActualHours: number;
  totalExtraHours: number;
  employeesWithShortHours: number;
  employeesWithFullHours: number;
  employeesWithAttendanceIssues: number;
  employeesWithMissingAttendance: number;
  payrollPending: number;
  payrollUnderReview: number;
  payrollApproved: number;
  payrollFinalized: number;
  payrollPaid: number;
}

export interface EmployeeCompensation {
  id: string;
  userId: string;
  monthlySalary: string;
  standardWorkingHoursPerDay: number;
  payrollStatus: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface LeavePayrollRule {
  leaveType: string;
  isPayable: boolean;
  payableFraction: string;
  updatedAt: string;
}

export interface PayrollSettings {
  payslipEnabled: boolean;
}
