import { prisma } from '@/lib/prisma';
import { InvoiceStatus, WorkOrderStatus, AttendanceStatus } from '@prisma/client';

export class AnalyticsService {
  /**
   * Get Authoritative Executive BI Dashboard Metrics
   */
  static async getExecutiveMetrics(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      invoices,
      payments,
      accounts,
      products,
      workOrders,
      employees,
      todayAttendances,
      budgets,
      pendingApprovals,
      supportTickets,
    ] = await Promise.all([
      prisma.invoice.findMany({ where: { organizationId } }),
      prisma.payment.findMany({ where: { organizationId } }),
      prisma.account.findMany({ where: { organizationId } }),
      prisma.product.findMany({ where: { organizationId, isActive: true } }),
      prisma.workOrder.findMany({ where: { organizationId } }),
      prisma.employee.findMany({ where: { organizationId, status: 'ACTIVE' } }),
      prisma.attendance.findMany({ where: { organizationId, date: today } }),
      prisma.budget.findMany({ where: { organizationId, fiscalYear: 2026 }, include: { department: true } }),
      prisma.approvalRequest.count({ where: { organizationId, status: 'PENDING' } }),
      prisma.supportTicket.findMany({ where: { organizationId } }),
    ]);

    // Financial calculations
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.status !== 'CANCELLED' ? inv.totalAmount : 0), 0);
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const accountsReceivable = invoices
      .filter((i) => i.status === InvoiceStatus.ISSUED || i.status === InvoiceStatus.PARTIALLY_PAID || i.status === InvoiceStatus.OVERDUE)
      .reduce((sum, i) => sum + i.balanceDue, 0);

    const overdueInvoices = invoices.filter((i) => i.status === InvoiceStatus.OVERDUE || (i.dueDate < new Date() && i.balanceDue > 0));
    const overdueReceivables = overdueInvoices.reduce((sum, i) => sum + i.balanceDue, 0);

    // Cash Position from Bank Accounts
    const bankAccount = accounts.find((a) => a.code === '1020');
    const cashAccount = accounts.find((a) => a.code === '1010');
    const apAccount = accounts.find((a) => a.code === '2010');
    const cashPosition = (bankAccount?.balance || 0) + (cashAccount?.balance || 0);
    const accountsPayable = apAccount?.balance || 0;

    // Revenue, Expenses & Net Profit from Chart of Accounts
    const revAccounts = accounts.filter((a) => a.type === 'REVENUE');
    const expAccounts = accounts.filter((a) => a.type === 'EXPENSE');

    const totalRevenue = revAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const totalExpenses = expAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    // Inventory Valuation & Low Stock
    let inventoryValuation = 0;
    const lowStockProducts = products.filter((p) => p.currentStock <= p.reorderPoint);
    for (const p of products) {
      inventoryValuation += p.currentStock * p.costPrice;
    }

    // HR Metrics
    const totalHeadcount = employees.length;
    const presentToday = todayAttendances.filter(
      (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.WORK_FROM_HOME
    ).length;
    const attendanceRate = totalHeadcount > 0 ? Math.round((presentToday / totalHeadcount) * 100) : 0;

    // Manufacturing Metrics
    const activeWorkOrders = workOrders.filter(
      (wo) => wo.status === WorkOrderStatus.IN_PROGRESS || wo.status === WorkOrderStatus.RELEASED
    ).length;
    const completedWorkOrders = workOrders.filter((wo) => wo.status === WorkOrderStatus.COMPLETED).length;

    // Department Budget Overrun Check
    const departmentsOverBudget = budgets.filter((b) => b.spentAmount > b.allocatedAmount);

    return {
      financials: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        cashPosition,
        accountsReceivable,
        accountsPayable,
        overdueReceivables,
        overdueInvoiceCount: overdueInvoices.length,
      },
      inventory: {
        totalProducts: products.length,
        totalValuation: inventoryValuation,
        lowStockCount: lowStockProducts.length,
        lowStockItems: lowStockProducts.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          currentStock: p.currentStock,
          reorderPoint: p.reorderPoint,
          unit: p.unit,
        })),
      },
      operations: {
        activeWorkOrders,
        completedWorkOrders,
        pendingApprovals,
        openTickets: supportTickets.filter((t) => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length,
      },
      hr: {
        totalHeadcount,
        presentToday,
        attendanceRate,
      },
      budgetAnalysis: {
        totalAllocated: budgets.reduce((sum, b) => sum + b.allocatedAmount, 0),
        totalSpent: budgets.reduce((sum, b) => sum + b.spentAmount, 0),
        overBudgetDepartments: departmentsOverBudget.map((b) => ({
          department: b.department.name,
          allocated: b.allocatedAmount,
          spent: b.spentAmount,
          excess: b.spentAmount - b.allocatedAmount,
        })),
      },
    };
  }
}
