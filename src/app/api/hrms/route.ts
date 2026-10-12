import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HRMSService } from '@/services/hrms.service';

export async function GET() {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

    const [employees, attendanceData, payrollRuns] = await Promise.all([
      prisma.employee.findMany({
        where: { organizationId: org.id },
        include: { department: true },
        orderBy: { employeeCode: 'asc' },
      }),
      HRMSService.getTodayAttendance(org.id),
      prisma.payrollRun.findMany({
        where: { organizationId: org.id },
        include: { payslips: { include: { employee: true } } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
    ]);

    return NextResponse.json({
      success: true,
      employees,
      attendance: attendanceData,
      payrollRuns,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

    const body = await req.json();
    const { action, employeeId, date, status, month, year, payrollRunId, userId } = body;

    if (action === 'RECORD_ATTENDANCE') {
      const att = await HRMSService.recordAttendance({
        organizationId: org.id,
        employeeId,
        date: date ? new Date(date) : new Date(),
        status,
      });
      return NextResponse.json({ success: true, attendance: att });
    }

    if (action === 'RUN_PAYROLL') {
      const res = await HRMSService.runMonthlyPayroll({
        organizationId: org.id,
        month,
        year,
        userId,
      });
      return NextResponse.json({ success: true, result: res });
    }

    if (action === 'APPROVE_PAYROLL') {
      const res = await HRMSService.approvePayroll({
        organizationId: org.id,
        payrollRunId,
        userId: userId || 'admin',
      });
      return NextResponse.json({ success: true, result: res });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
