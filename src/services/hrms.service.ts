import { prisma } from '@/lib/prisma';
import { AttendanceStatus, ApprovalStatus, PayrollStatus, PaymentMethod } from '@prisma/client';
import { logAudit } from '@/lib/audit';

export class HRMSService {
  /**
   * Log employee daily attendance
   */
  static async recordAttendance(params: {
    organizationId: string;
    employeeId: string;
    date: Date;
    status: AttendanceStatus;
    checkIn?: Date;
    checkOut?: Date;
    workingHours?: number;
    notes?: string;
  }) {
    const dayStart = new Date(params.date);
    dayStart.setHours(0, 0, 0, 0);

    return await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: params.employeeId,
          date: dayStart,
        },
      },
      update: {
        status: params.status,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        workingHours: params.workingHours ?? 8,
        notes: params.notes,
      },
      create: {
        organizationId: params.organizationId,
        employeeId: params.employeeId,
        date: dayStart,
        status: params.status,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        workingHours: params.workingHours ?? 8,
        notes: params.notes,
      },
    });
  }

  /**
   * Generate Monthly Payroll Run and Payslips
   */
  static async runMonthlyPayroll(params: {
    organizationId: string;
    month: number;
    year: number;
    userId?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.payrollRun.findUnique({
        where: {
          organizationId_month_year: {
            organizationId: params.organizationId,
            month: params.month,
            year: params.year,
          },
        },
      });

      if (existing && existing.status === PayrollStatus.APPROVED) {
        throw new Error(`Payroll for ${params.month}/${params.year} has already been approved and locked.`);
      }

      // Fetch active employees
      const employees = await tx.employee.findMany({
        where: { organizationId: params.organizationId, status: 'ACTIVE' },
      });

      let totalGross = 0;
      let totalAllowances = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      const payslipRecords: any[] = [];

      for (const emp of employees) {
        const gross = emp.baseSalary;
        const allow = emp.allowances;
        const ded = emp.deductions;
        const net = gross + allow - ded;

        totalGross += gross;
        totalAllowances += allow;
        totalDeductions += ded;
        totalNet += net;

        payslipRecords.push({
          employeeId: emp.id,
          baseSalary: gross,
          allowances: allow,
          deductions: ded,
          netSalary: net,
          attendanceDays: 30,
          leaveDays: 0,
          status: PayrollStatus.DRAFT,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
        });
      }

      let payrollRun;
      if (existing) {
        // Delete previous draft payslips
        await tx.payslip.deleteMany({ where: { payrollRunId: existing.id } });
        payrollRun = await tx.payrollRun.update({
          where: { id: existing.id },
          data: {
            totalGrossSalary: totalGross,
            totalAllowances,
            totalDeductions,
            totalNetSalary: totalNet,
            employeeCount: employees.length,
            status: PayrollStatus.DRAFT,
          },
        });
      } else {
        payrollRun = await tx.payrollRun.create({
          data: {
            organizationId: params.organizationId,
            month: params.month,
            year: params.year,
            totalGrossSalary: totalGross,
            totalAllowances,
            totalDeductions,
            totalNetSalary: totalNet,
            employeeCount: employees.length,
            status: PayrollStatus.DRAFT,
          },
        });
      }

      // Create payslips
      for (const ps of payslipRecords) {
        await tx.payslip.create({
          data: {
            payrollRunId: payrollRun.id,
            ...ps,
          },
        });
      }

      // Create approval request for Finance / CEO
      await tx.approvalRequest.create({
        data: {
          organizationId: params.organizationId,
          requestedById: params.userId || (await tx.user.findFirst({ where: { organizationId: params.organizationId } }))!.id,
          module: 'HRMS',
          entityType: 'PAYROLL_RUN',
          entityId: payrollRun.id,
          title: `Payroll Finalization: Month ${params.month}/${params.year}`,
          description: `Total Net Disbursement: ₹${totalNet.toLocaleString('en-IN')} for ${employees.length} employees`,
          amount: totalNet,
          status: ApprovalStatus.PENDING,
        },
      });

      await logAudit({
        organizationId: params.organizationId,
        userId: params.userId,
        entity: 'PayrollRun',
        entityId: payrollRun.id,
        action: 'GENERATE_PAYROLL',
        newData: { month: params.month, year: params.year, totalNet, count: employees.length },
      });

      return { payrollRun, count: employees.length, totalNet };
    });
  }

  /**
   * Approve & Disburse Payroll -> Posts financial entry
   */
  static async approvePayroll(params: {
    organizationId: string;
    payrollRunId: string;
    userId: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.findUnique({
        where: { id: params.payrollRunId },
      });

      if (!run) throw new Error('Payroll run not found');
      if (run.status === PayrollStatus.APPROVED) throw new Error('Payroll is already approved');

      const updatedRun = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: PayrollStatus.APPROVED,
          approvedById: params.userId,
          approvedAt: new Date(),
          disbursedAt: new Date(),
        },
      });

      await tx.payslip.updateMany({
        where: { payrollRunId: run.id },
        data: { status: PayrollStatus.APPROVED, paymentDate: new Date() },
      });

      // Post Double-Entry Journal Entry:
      // Debit Salaries & Benefits (6010)
      // Credit Bank (1020)
      const salaryExpense = await tx.account.findFirst({ where: { organizationId: params.organizationId, code: '6010' } });
      const bankAccount = await tx.account.findFirst({ where: { organizationId: params.organizationId, code: '1020' } });

      if (salaryExpense && bankAccount) {
        const jEntryCount = await tx.journalEntry.count({ where: { organizationId: params.organizationId } });
        const entryNumber = `JE-2026-${String(jEntryCount + 1001).padStart(4, '0')}`;

        await tx.journalEntry.create({
          data: {
            organizationId: params.organizationId,
            entryNumber,
            referenceType: 'PAYROLL',
            referenceId: run.id,
            description: `Payroll disbursement for month ${run.month}/${run.year}`,
            lines: {
              create: [
                { accountId: salaryExpense.id, debit: run.totalNetSalary, credit: 0, description: 'Payroll expense' },
                { accountId: bankAccount.id, debit: 0, credit: run.totalNetSalary, description: 'Bank transfer disbursement' },
              ],
            },
          },
        });

        await tx.account.update({ where: { id: salaryExpense.id }, data: { balance: { increment: run.totalNetSalary } } });
        await tx.account.update({ where: { id: bankAccount.id }, data: { balance: { decrement: run.totalNetSalary } } });
      }

      await logAudit({
        organizationId: params.organizationId,
        userId: params.userId,
        entity: 'PayrollRun',
        entityId: run.id,
        action: 'APPROVE_PAYROLL',
        newData: { month: run.month, year: run.year, totalNet: run.totalNetSalary },
      });

      return updatedRun;
    });
  }

  /**
   * Get Today's Attendance Metric
   */
  static async getTodayAttendance(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalEmployees, attendances] = await Promise.all([
      prisma.employee.count({ where: { organizationId, status: 'ACTIVE' } }),
      prisma.attendance.findMany({
        where: { organizationId, date: today },
        include: { employee: true },
      }),
    ]);

    const presentCount = attendances.filter((a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.WORK_FROM_HOME).length;
    const wfhCount = attendances.filter((a) => a.status === AttendanceStatus.WORK_FROM_HOME).length;
    const onLeaveCount = attendances.filter((a) => a.status === AttendanceStatus.ON_LEAVE).length;
    const absentCount = totalEmployees - presentCount - onLeaveCount;

    const rate = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

    return {
      totalEmployees,
      presentCount,
      wfhCount,
      onLeaveCount,
      absentCount: Math.max(0, absentCount),
      attendanceRate: rate,
      attendances,
    };
  }
}
