import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FinanceService } from '@/services/finance.service';

export async function GET() {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

    const [accounts, journalEntries, expenses, budgetAnalysis] = await Promise.all([
      prisma.account.findMany({ where: { organizationId: org.id }, orderBy: { code: 'asc' } }),
      prisma.journalEntry.findMany({
        where: { organizationId: org.id },
        include: { lines: { include: { account: true } } },
        orderBy: { entryDate: 'desc' },
        take: 30,
      }),
      prisma.expense.findMany({
        where: { organizationId: org.id },
        include: { department: true },
        orderBy: { expenseDate: 'desc' },
      }),
      FinanceService.getBudgetAnalysis(org.id),
    ]);

    return NextResponse.json({
      success: true,
      accounts,
      journalEntries,
      expenses,
      budgetAnalysis,
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
    const { action, departmentId, title, category, amount, lines, description, userId } = body;

    if (action === 'RECORD_EXPENSE') {
      const expense = await FinanceService.recordExpense({
        organizationId: org.id,
        departmentId,
        title,
        category,
        amount,
        userId,
      });
      return NextResponse.json({ success: true, expense });
    }

    if (action === 'POST_JOURNAL_ENTRY') {
      const entry = await FinanceService.postJournalEntry({
        organizationId: org.id,
        description,
        lines,
        userId,
      });
      return NextResponse.json({ success: true, entry });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
