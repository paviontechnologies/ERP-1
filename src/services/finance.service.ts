import { prisma } from '@/lib/prisma';
import { ExpenseStatus, AccountType, PaymentMethod } from '@prisma/client';
import { logAudit } from '@/lib/audit';

export class FinanceService {
  /**
   * Post Manual or Automated Journal Entry
   */
  static async postJournalEntry(params: {
    organizationId: string;
    branchId?: string;
    description: string;
    referenceType?: string;
    referenceId?: string;
    lines: { accountId: string; debit: number; credit: number; description?: string }[];
    userId?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      // Validate double-entry balance: total debit must equal total credit
      const totalDebit = params.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
      const totalCredit = params.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(
          `Double-entry imbalance! Total Debit: ₹${totalDebit} does not equal Total Credit: ₹${totalCredit}`
        );
      }

      const jEntryCount = await tx.journalEntry.count({ where: { organizationId: params.organizationId } });
      const entryNumber = `JE-2026-${String(jEntryCount + 1001).padStart(4, '0')}`;

      const entry = await tx.journalEntry.create({
        data: {
          organizationId: params.organizationId,
          branchId: params.branchId,
          entryNumber,
          description: params.description,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          postedById: params.userId,
          lines: {
            create: params.lines.map((l) => ({
              accountId: l.accountId,
              debit: l.debit || 0,
              credit: l.credit || 0,
              description: l.description,
            })),
          },
        },
        include: { lines: { include: { account: true } } },
      });

      // Update account balances
      for (const line of params.lines) {
        const delta = (line.debit || 0) - (line.credit || 0);
        await tx.account.update({
          where: { id: line.accountId },
          data: { balance: { increment: delta } },
        });
      }

      await logAudit({
        organizationId: params.organizationId,
        userId: params.userId,
        entity: 'JournalEntry',
        entityId: entry.id,
        action: 'POST_JOURNAL_ENTRY',
        newData: { entryNumber, totalAmount: totalDebit },
      });

      return entry;
    });
  }

  /**
   * Record and Approve Department Expense
   */
  static async recordExpense(params: {
    organizationId: string;
    branchId?: string;
    departmentId: string;
    title: string;
    category: string;
    amount: number;
    paymentMethod?: PaymentMethod;
    receiptUrl?: string;
    userId?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          organizationId: params.organizationId,
          branchId: params.branchId,
          departmentId: params.departmentId,
          title: params.title,
          category: params.category,
          amount: params.amount,
          taxAmount: Math.round(params.amount * 0.18),
          totalAmount: Math.round(params.amount * 1.18),
          paymentMethod: params.paymentMethod || PaymentMethod.BANK_TRANSFER,
          status: ExpenseStatus.APPROVED,
          requestedById: params.userId,
          approvedById: params.userId,
          approvedAt: new Date(),
        },
        include: { department: true },
      });

      // Update department budget spent amount
      const budget = await tx.budget.findFirst({
        where: {
          organizationId: params.organizationId,
          departmentId: params.departmentId,
          fiscalYear: 2026,
        },
      });

      if (budget) {
        const newSpent = budget.spentAmount + expense.totalAmount;
        const newRemaining = budget.allocatedAmount - newSpent;
        await tx.budget.update({
          where: { id: budget.id },
          data: { spentAmount: newSpent, remainingAmount: newRemaining },
        });
      }

      // Update General Ledger: Debit Operating Expense, Credit Bank
      const opExpenseAcc = await tx.account.findFirst({
        where: { organizationId: params.organizationId, code: '6020' },
      });
      const bankAcc = await tx.account.findFirst({
        where: { organizationId: params.organizationId, code: '1020' },
      });

      if (opExpenseAcc && bankAcc) {
        const jEntryCount = await tx.journalEntry.count({ where: { organizationId: params.organizationId } });
        const entryNumber = `JE-2026-${String(jEntryCount + 1001).padStart(4, '0')}`;

        await tx.journalEntry.create({
          data: {
            organizationId: params.organizationId,
            entryNumber,
            referenceType: 'EXPENSE',
            referenceId: expense.id,
            description: `Expense: ${expense.title} (${expense.department?.name})`,
            lines: {
              create: [
                { accountId: opExpenseAcc.id, debit: expense.totalAmount, credit: 0, description: expense.title },
                { accountId: bankAcc.id, debit: 0, credit: expense.totalAmount, description: 'Bank payment' },
              ],
            },
          },
        });

        await tx.account.update({ where: { id: opExpenseAcc.id }, data: { balance: { increment: expense.totalAmount } } });
        await tx.account.update({ where: { id: bankAcc.id }, data: { balance: { decrement: expense.totalAmount } } });
      }

      return expense;
    });
  }

  /**
   * Department Budget vs Actual Analysis
   */
  static async getBudgetAnalysis(organizationId: string) {
    const budgets = await prisma.budget.findMany({
      where: { organizationId, fiscalYear: 2026 },
      include: { department: true },
    });

    return budgets.map((b) => {
      const utilization = b.allocatedAmount > 0 ? Math.round((b.spentAmount / b.allocatedAmount) * 100) : 0;
      const isExceeded = b.spentAmount > b.allocatedAmount;
      return {
        departmentName: b.department.name,
        departmentCode: b.department.code,
        allocated: b.allocatedAmount,
        spent: b.spentAmount,
        remaining: b.remainingAmount,
        utilization,
        isExceeded,
      };
    });
  }
}
