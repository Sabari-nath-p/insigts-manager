export interface PayrollAdjustmentView {
  type: string;
  amount: string;
  reason: string;
  date?: string;
}

export interface EmployeePayrollRecord {
  id: string;
  payrollMonth: string;
  workingDays: number;
  scheduledHours: number;
  actualHours: number;
  payableHours: number;
  extraHours: number;
  payrollAmount: number;
  status: string;
  paymentStatus: string;
  visibleAdjustments: PayrollAdjustmentView[];
}

export interface Payslip {
  employeeName: string;
  employeeId: string;
  designation: string | null;
  department: string | null;
  payrollMonth: string;
  workingDays: number;
  scheduledHours: number;
  actualHours: number;
  payableHours: number;
  extraHours: number;
  baseSalaryEarned: string;
  approvedAdditions: PayrollAdjustmentView[];
  approvedDeductions: PayrollAdjustmentView[];
  finalPayableAmount: string;
  paymentStatus: string;
}
