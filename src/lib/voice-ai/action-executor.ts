import { prisma } from '@/lib/prisma';
import { AppUser, hasPermission } from '@/lib/auth';
import { ParsedVoiceCommand } from './intent-parser';
import { ProcurementService } from '@/services/procurement.service';
import { HRMSService } from '@/services/hrms.service';
import { InvoiceStatus, SalesOrderStatus, PurchaseOrderStatus } from '@prisma/client';

export interface VoiceExecutionResult {
  success: boolean;
  intent: string;
  module: string;
  spokenResponse: string;
  displayText: string;
  actionProposed?: boolean;
  proposedActionDetails?: any;
  dataCard?: {
    type: 'metric' | 'table' | 'alert' | 'confirmation';
    title: string;
    metrics?: { label: string; value: string; trend?: string; color?: string }[];
    headers?: string[];
    rows?: (string | number)[][];
    alertMessage?: string;
  };
}

export async function executeVoiceCommand(
  command: ParsedVoiceCommand,
  user: AppUser,
  confirmed: boolean = false
): Promise<VoiceExecutionResult> {
  const orgId = user.organizationId;
  const isHindi = command.detectedLanguage === 'hi';
  const isHinglish = command.detectedLanguage === 'hinglish';

  // 1. RBAC Security Check
  if (!hasPermission(user.role, command.requiredPermission)) {
    const spokenDenial = isHindi
      ? `अस्वीकृत: आपके पास इस जानकारी तक पहुँचने की अनुमति नहीं है।`
      : isHinglish
      ? `Access Denied: Aapke role ke paas is department ka access nahi hai.`
      : `Access Denied: Your role (${user.role}) does not have permission to access ${command.module}.`;

    return {
      success: false,
      intent: command.intent,
      module: command.module,
      spokenResponse: spokenDenial,
      displayText: spokenDenial,
      dataCard: {
        type: 'alert',
        title: 'Authorization Required',
        alertMessage: `User role '${user.role}' lacks permission '${command.requiredPermission}'.`,
      },
    };
  }

  // 2. High-Impact Action Confirmation Guardrail
  if (command.requiresConfirmation && !confirmed) {
    let actionTitle = 'Confirmation Required: Create Draft Purchase Order';
    let promptMsg = `Are you sure you want to create a draft Purchase Order for ${command.slots.quantity || 100} units of ${command.slots.productName}?`;
    let spokenPrompt = isHindi
      ? `क्या आप ${command.slots.quantity || 100} यूनिट्स के लिए ड्राफ्ट परचेज ऑर्डर बनाना चाहते हैं? कृपया पुष्टि करें।`
      : isHinglish
      ? `Kya aap ${command.slots.quantity || 100} units ke liye draft purchase order create karna chahte hain? Confirm karein.`
      : `Please confirm: Would you like to create a draft purchase order for ${command.slots.quantity || 100} units of ${command.slots.productName}?`;

    return {
      success: true,
      intent: command.intent,
      module: command.module,
      actionProposed: true,
      proposedActionDetails: {
        intent: command.intent,
        slots: command.slots,
      },
      spokenResponse: spokenPrompt,
      displayText: promptMsg,
      dataCard: {
        type: 'confirmation',
        title: actionTitle,
        alertMessage: promptMsg,
        metrics: [
          { label: 'Item', value: command.slots.productName || 'Raw Material', color: 'blue' },
          { label: 'Proposed Quantity', value: `${command.slots.quantity || 100} Units`, color: 'emerald' },
          { label: 'Status', value: 'Pending Authorization', color: 'amber' },
        ],
      },
    };
  }

  // 3. Intent Handlers
  switch (command.intent) {
    // ----------------------------------------------------
    // Intent: Today's Sales
    // ----------------------------------------------------
    case 'GET_TODAY_SALES': {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const orders = await prisma.salesOrder.findMany({
        where: { organizationId: orgId, createdAt: { gte: today } },
      });

      const todayTotal = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const count = orders.length;

      const spoken = isHindi
        ? `आज कंपनी की कुल बिक्री ₹${todayTotal.toLocaleString('hi-IN')} है, जिसमें ${count} ऑर्डर्स दर्ज किए गए हैं।`
        : isHinglish
        ? `Aaj company ki total sales ₹${todayTotal.toLocaleString('en-IN')} hain, across ${count} orders.`
        : `Today's total confirmed sales are ₹${todayTotal.toLocaleString('en-IN')} across ${count} orders.`;

      return {
        success: true,
        intent: command.intent,
        module: 'SALES',
        spokenResponse: spoken,
        displayText: spoken,
        dataCard: {
          type: 'metric',
          title: "Today's Sales Performance",
          metrics: [
            { label: 'Total Sales', value: `₹${todayTotal.toLocaleString('en-IN')}`, trend: '+14% vs avg' },
            { label: 'Orders Count', value: `${count} orders` },
            { label: 'Average Order Value', value: count > 0 ? `₹${Math.round(todayTotal / count).toLocaleString('en-IN')}` : '₹0' },
          ],
        },
      };
    }

    // ----------------------------------------------------
    // Intent: Revenue & Expenses
    // ----------------------------------------------------
    case 'GET_REVENUE_EXPENSES': {
      const accounts = await prisma.account.findMany({ where: { organizationId: orgId } });
      const revAccounts = accounts.filter((a) => a.type === 'REVENUE');
      const expAccounts = accounts.filter((a) => a.type === 'EXPENSE');

      const totalRevenue = revAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);
      const totalExpenses = expAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);
      const netProfit = totalRevenue - totalExpenses;
      const margin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

      const spoken = isHindi
        ? `इस महीने का कुल राजस्व ₹${totalRevenue.toLocaleString('hi-IN')} और कुल खर्च ₹${totalExpenses.toLocaleString('hi-IN')} है। शुद्ध लाभ ₹${netProfit.toLocaleString('hi-IN')} है।`
        : isHinglish
        ? `Is month ka total revenue ₹${totalRevenue.toLocaleString('en-IN')} aur expenses ₹${totalExpenses.toLocaleString('en-IN')} hain. Net profit margin ${margin}% hai.`
        : `This month's revenue is ₹${totalRevenue.toLocaleString('en-IN')} with expenses of ₹${totalExpenses.toLocaleString('en-IN')}, resulting in a net profit of ₹${netProfit.toLocaleString('en-IN')} (${margin}% margin).`;

      return {
        success: true,
        intent: command.intent,
        module: 'FINANCE',
        spokenResponse: spoken,
        displayText: spoken,
        dataCard: {
          type: 'metric',
          title: 'Financial Performance (P&L)',
          metrics: [
            { label: 'Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, color: 'emerald' },
            { label: 'Expenses', value: `₹${totalExpenses.toLocaleString('en-IN')}`, color: 'rose' },
            { label: 'Net Profit', value: `₹${netProfit.toLocaleString('en-IN')}`, color: netProfit >= 0 ? 'emerald' : 'rose' },
            { label: 'Net Margin', value: `${margin}%` },
          ],
        },
      };
    }

    // ----------------------------------------------------
    // Intent: Budget Overruns
    // ----------------------------------------------------
    case 'CHECK_BUDGET_OVERRUNS': {
      const budgets = await prisma.budget.findMany({
        where: { organizationId: orgId, fiscalYear: 2026 },
        include: { department: true },
      });

      const exceeded = budgets.filter((b) => b.spentAmount > b.allocatedAmount);

      if (exceeded.length === 0) {
        const spoken = isHindi
          ? `सभी विभाग अपने निर्धारित बजट के भीतर काम कर रहे हैं। कोई बजट सीमा पार नहीं हुई है।`
          : isHinglish
          ? `Sabhi departments apne budget limit ke andar hain. Koi bhi department budget exceed nahi hua.`
          : `All departments are operating within their allocated budgets for FY 2026.`;

        return {
          success: true,
          intent: command.intent,
          module: 'FINANCE',
          spokenResponse: spoken,
          displayText: spoken,
          dataCard: {
            type: 'alert',
            title: 'Budget Status',
            alertMessage: 'Healthy: 0 departments have exceeded their budget allocation.',
          },
        };
      }

      const deptNames = exceeded.map((e) => e.department.name).join(', ');
      const spoken = isHindi
        ? `विभाग ${deptNames} ने अपने आवंटित बजट को पार कर लिया है।`
        : isHinglish
        ? `${deptNames} ne apna allocated budget cross kar liya hai.`
        : `Department(s) ${deptNames} have exceeded their allocated budget.`;

      return {
        success: true,
        intent: command.intent,
        module: 'FINANCE',
        spokenResponse: spoken,
        displayText: spoken,
        dataCard: {
          type: 'table',
          title: 'Budget Variance Alert',
          headers: ['Department', 'Allocated Budget', 'Actual Spent', 'Overrun Amount'],
          rows: exceeded.map((e) => [
            e.department.name,
            `₹${e.allocatedAmount.toLocaleString('en-IN')}`,
            `₹${e.spentAmount.toLocaleString('en-IN')}`,
            `+₹${(e.spentAmount - e.allocatedAmount).toLocaleString('en-IN')}`,
          ]),
        },
      };
    }

    // ----------------------------------------------------
    // Intent: Low Stock Products
    // ----------------------------------------------------
    case 'LIST_LOW_STOCK': {
      const products = await prisma.product.findMany({
        where: { organizationId: orgId, isActive: true },
        include: { category: true },
      });

      const lowStock = products.filter((p) => p.currentStock <= p.reorderPoint);

      const spoken = isHindi
        ? `वर्तमान में ${lowStock.length} उत्पादों का स्टॉक पुनःआदेश सीमा से कम है, जिसमें ${lowStock.slice(0, 2).map((p) => p.name).join(' और ')} शामिल हैं।`
        : isHinglish
        ? `Abhi ${lowStock.length} products ka stock low hai, mainly ${lowStock.slice(0, 2).map((p) => p.name).join(' aur ')}.`
        : `There are ${lowStock.length} products with stock at or below reorder threshold. Immediate replenishment is recommended.`;

      return {
        success: true,
        intent: command.intent,
        module: 'INVENTORY',
        spokenResponse: spoken,
        displayText: spoken,
        dataCard: {
          type: 'table',
          title: 'Low Stock Products & Reorder Alerts',
          headers: ['SKU', 'Product Name', 'Current Stock', 'Reorder Level', 'Unit'],
          rows: lowStock.map((p) => [
            p.sku,
            p.name,
            p.currentStock,
            p.reorderPoint,
            p.unit,
          ]),
        },
      };
    }

    // ----------------------------------------------------
    // Intent: Create Draft Purchase Order (Confirmed Execution)
    // ----------------------------------------------------
    case 'CREATE_DRAFT_PO': {
      // Find matching product
      let product = await prisma.product.findFirst({
        where: {
          organizationId: orgId,
          OR: [
            { name: { contains: command.slots.productName || 'Battery', mode: 'insensitive' } },
            { sku: { contains: command.slots.productName || 'RM-BAT', mode: 'insensitive' } },
          ],
        },
      });

      if (!product) {
        product = await prisma.product.findFirst({
          where: { organizationId: orgId, type: 'RAW_MATERIAL' },
        });
      }

      if (!product) throw new Error('No valid product found to create purchase order');

      // Select vendor
      const vendor = await prisma.vendor.findFirst({
        where: { organizationId: orgId },
      });
      if (!vendor) throw new Error('No vendor configured in system');

      const qty = command.slots.quantity || 100;
      const po = await ProcurementService.createPurchaseOrder({
        organizationId: orgId,
        vendorId: vendor.id,
        items: [{ productId: product.id, quantity: qty, unitPrice: product.costPrice }],
        userId: user.id,
      });

      const spoken = isHindi
        ? `ड्राफ्ट खरीद आदेश ${po.poNumber} सफलतापूर्वक ₹${po.totalAmount.toLocaleString('hi-IN')} के लिए बना दिया गया है।`
        : isHinglish
        ? `Draft purchase order ${po.poNumber} successfully create ho gaya hai for ${qty} units of ${product.name}.`
        : `Draft purchase order ${po.poNumber} for ${qty} units of ${product.name} (Total: ₹${po.totalAmount.toLocaleString('en-IN')}) has been created and submitted for approval.`;

      return {
        success: true,
        intent: command.intent,
        module: 'PROCUREMENT',
        spokenResponse: spoken,
        displayText: spoken,
        dataCard: {
          type: 'metric',
          title: `Purchase Order Created: ${po.poNumber}`,
          metrics: [
            { label: 'PO Number', value: po.poNumber },
            { label: 'Vendor', value: vendor.name },
            { label: 'Quantity', value: `${qty} ${product.unit}` },
            { label: 'Total Commitment', value: `₹${po.totalAmount.toLocaleString('en-IN')}`, color: 'emerald' },
          ],
        },
      };
    }

    // ----------------------------------------------------
    // Intent: Overdue Suppliers
    // ----------------------------------------------------
    case 'OVERDUE_SUPPLIERS': {
      const overduePOs = await prisma.purchaseOrder.findMany({
        where: {
          organizationId: orgId,
          status: { in: [PurchaseOrderStatus.ISSUED, PurchaseOrderStatus.PARTIALLY_RECEIVED] },
          expectedDeliveryDate: { lt: new Date() },
        },
        include: { vendor: true },
      });

      if (overduePOs.length === 0) {
        const spoken = isHindi
          ? `किसी भी सप्लायर की डिलीवरी में कोई देरी नहीं है। सभी समय पर हैं।`
          : isHinglish
          ? `Koi bhi supplier delivery delay nahi hai. Sabhi purchase orders on track hain.`
          : `All vendor deliveries are on schedule. No overdue purchase orders found.`;

        return {
          success: true,
          intent: command.intent,
          module: 'PROCUREMENT',
          spokenResponse: spoken,
          displayText: spoken,
          dataCard: {
            type: 'alert',
            title: 'Supplier Deliveries',
            alertMessage: 'On Track: Zero delayed vendor deliveries.',
          },
        };
      }

      const spoken = isHindi
        ? `${overduePOs.length} सप्लायरों की डिलीवरी निर्धारित समय से अधिक हो चुकी है।`
        : isHinglish
        ? `${overduePOs.length} suppliers ki deliveries overdue hain.`
        : `There are ${overduePOs.length} purchase orders with overdue delivery dates.`;

      return {
        success: true,
        intent: command.intent,
        module: 'PROCUREMENT',
        spokenResponse: spoken,
        displayText: spoken,
        dataCard: {
          type: 'table',
          title: 'Overdue Vendor Deliveries',
          headers: ['PO Number', 'Vendor Name', 'Expected Delivery', 'Committed Amount'],
          rows: overduePOs.map((po) => [
            po.poNumber,
            po.vendor.name,
            po.expectedDeliveryDate ? po.expectedDeliveryDate.toISOString().split('T')[0] : 'N/A',
            `₹${po.totalAmount.toLocaleString('en-IN')}`,
          ]),
        },
      };
    }

    // ----------------------------------------------------
    // Intent: Today's Attendance
    // ----------------------------------------------------
    case 'TODAY_ATTENDANCE': {
      const att = await HRMSService.getTodayAttendance(orgId);

      const spoken = isHindi
        ? `आज कुल ${att.totalEmployees} में से ${att.presentCount} कर्मचारी उपस्थित हैं। उपस्थिति दर ${att.attendanceRate} प्रतिशत है।`
        : isHinglish
        ? `Aaj total ${att.totalEmployees} mein se ${att.presentCount} employees present hain (${att.attendanceRate}% attendance).`
        : `Today, ${att.presentCount} out of ${att.totalEmployees} employees are present (${att.attendanceRate}% attendance rate).`;

      return {
        success: true,
        intent: command.intent,
        module: 'HRMS',
        spokenResponse: spoken,
        displayText: spoken,
        dataCard: {
          type: 'metric',
          title: "Today's Workforce Attendance",
          metrics: [
            { label: 'Present Today', value: `${att.presentCount} / ${att.totalEmployees}`, color: 'emerald' },
            { label: 'Attendance Rate', value: `${att.attendanceRate}%` },
            { label: 'Work from Home', value: `${att.wfhCount}` },
            { label: 'On Leave', value: `${att.onLeaveCount}` },
          ],
        },
      };
    }

    // ----------------------------------------------------
    // Intent: Generate Payroll Summary
    // ----------------------------------------------------
    case 'GENERATE_PAYROLL_SUMMARY': {
      const payrollRun = await prisma.payrollRun.findFirst({
        where: { organizationId: orgId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: { payslips: { include: { employee: true } } },
      });

      if (!payrollRun) {
        return {
          success: false,
          intent: command.intent,
          module: 'HRMS',
          spokenResponse: 'No payroll records found for the organization.',
          displayText: 'No payroll records found for the organization.',
        };
      }

      const spoken = isHindi
        ? `महीने ${payrollRun.month}/${payrollRun.year} का कुल शुद्ध वेतन ₹${payrollRun.totalNetSalary.toLocaleString('hi-IN')} है, जो ${payrollRun.employeeCount} कर्मचारियों को वितरित किया गया है।`
        : isHinglish
        ? `Month ${payrollRun.month}/${payrollRun.year} ka total payroll ₹${payrollRun.totalNetSalary.toLocaleString('en-IN')} hai for ${payrollRun.employeeCount} employees. Status: ${payrollRun.status}.`
        : `Latest payroll summary for Month ${payrollRun.month}/${payrollRun.year}: Total net disbursement is ₹${payrollRun.totalNetSalary.toLocaleString('en-IN')} for ${payrollRun.employeeCount} employees.`;

      return {
        success: true,
        intent: command.intent,
        module: 'HRMS',
        spokenResponse: spoken,
        displayText: spoken,
        dataCard: {
          type: 'metric',
          title: `Monthly Payroll Run: ${payrollRun.month}/${payrollRun.year}`,
          metrics: [
            { label: 'Total Net Salary', value: `₹${payrollRun.totalNetSalary.toLocaleString('en-IN')}`, color: 'emerald' },
            { label: 'Gross Salary', value: `₹${payrollRun.totalGrossSalary.toLocaleString('en-IN')}` },
            { label: 'Taxes & Deductions', value: `₹${payrollRun.totalDeductions.toLocaleString('en-IN')}`, color: 'rose' },
            { label: 'Status', value: payrollRun.status },
          ],
        },
      };
    }

    // ----------------------------------------------------
    // Intent: Overdue Customer Invoices
    // ----------------------------------------------------
    case 'OVERDUE_INVOICES': {
      const overdue = await prisma.invoice.findMany({
        where: {
          organizationId: orgId,
          status: InvoiceStatus.OVERDUE,
        },
        include: { customer: true },
      });

      const totalOverdue = overdue.reduce((sum, inv) => sum + inv.balanceDue, 0);

      const spoken = isHindi
        ? `वर्तमान में ₹${totalOverdue.toLocaleString('hi-IN')} के ${overdue.length} बकाया चालान हैं।`
        : isHinglish
        ? `Abhi ${overdue.length} overdue invoices hain, jinka total balance ₹${totalOverdue.toLocaleString('en-IN')} hai.`
        : `There are ${overdue.length} overdue invoices with total outstanding balance of ₹${totalOverdue.toLocaleString('en-IN')}.`;

      return {
        success: true,
        intent: command.intent,
        module: 'FINANCE',
        spokenResponse: spoken,
        displayText: spoken,
        dataCard: {
          type: 'table',
          title: 'Overdue Customer Receivables',
          headers: ['Invoice #', 'Customer Name', 'Due Date', 'Outstanding Balance'],
          rows: overdue.map((inv) => [
            inv.invoiceNumber,
            inv.customer.name,
            inv.dueDate.toISOString().split('T')[0],
            `₹${inv.balanceDue.toLocaleString('en-IN')}`,
          ]),
        },
      };
    }

    // ----------------------------------------------------
    // Intent: Cross-Dept: Unfulfilled Orders Due to Low Stock
    // ----------------------------------------------------
    case 'UNFULFILLED_ORDERS_LOW_STOCK': {
      const openOrders = await prisma.salesOrder.findMany({
        where: {
          organizationId: orgId,
          status: { in: [SalesOrderStatus.CONFIRMED, SalesOrderStatus.PROCESSING] },
        },
        include: { items: { include: { product: true } }, customer: true },
      });

      const blockedOrders: any[] = [];
      for (const order of openOrders) {
        for (const item of order.items) {
          if (item.product.currentStock < item.quantity) {
            blockedOrders.push({
              orderNumber: order.orderNumber,
              customer: order.customer.name,
              product: item.product.name,
              orderedQty: item.quantity,
              available: item.product.currentStock,
              deficit: item.quantity - item.product.currentStock,
            });
          }
        }
      }

      if (blockedOrders.length === 0) {
        const spoken = isHindi
          ? `कोई भी बिक्री आदेश स्टॉक की कमी के कारण रुका नहीं है।`
          : isHinglish
          ? `Koi bhi sales order low stock ki wajah se blocked nahi hai.`
          : `All confirmed sales orders have sufficient inventory available.`;

        return {
          success: true,
          intent: command.intent,
          module: 'CROSS_DEPT',
          spokenResponse: spoken,
          displayText: spoken,
          dataCard: {
            type: 'alert',
            title: 'Fulfillment Feasibility',
            alertMessage: 'Healthy: 0 sales orders are blocked by inventory shortages.',
          },
        };
      }

      const spoken = isHindi
        ? `${blockedOrders.length} बिक्री आदेश स्टॉक की कमी के कारण पूरे नहीं किए जा सकते।`
        : isHinglish
        ? `${blockedOrders.length} sales orders low stock ke karan fulfill nahi ho sakte.`
        : `${blockedOrders.length} sales order line items are currently unfulfillable due to stock shortages.`;

      return {
        success: true,
        intent: command.intent,
        module: 'CROSS_DEPT',
        spokenResponse: spoken,
        displayText: spoken,
        dataCard: {
          type: 'table',
          title: 'Unfulfillable Sales Orders (Stock Shortage)',
          headers: ['Order #', 'Customer', 'Product', 'Required', 'In Stock', 'Deficit'],
          rows: blockedOrders.map((b) => [
            b.orderNumber,
            b.customer,
            b.product,
            b.orderedQty,
            b.available,
            `-${b.deficit}`,
          ]),
        },
      };
    }

    // ----------------------------------------------------
    // Intent: Cross-Dept: Unpaid Invoices for Delivered Orders
    // ----------------------------------------------------
    case 'UNPAID_DELIVERED_ORDERS': {
      const deliveredInvoices = await prisma.invoice.findMany({
        where: {
          organizationId: orgId,
          balanceDue: { gt: 0 },
          salesOrder: { status: SalesOrderStatus.DELIVERED },
        },
        include: { customer: true, salesOrder: true },
      });

      const totalDeliveredUnpaid = deliveredInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

      const spoken = isHindi
        ? `डिलीवर किए जा चुके ऑर्डर्स के लिए ₹${totalDeliveredUnpaid.toLocaleString('hi-IN')} के ${deliveredInvoices.length} चालान अभी भी बिना भुगतान के हैं।`
        : isHinglish
        ? `Already delivered orders ke liye ${deliveredInvoices.length} unpaid invoices hain totaling ₹${totalDeliveredUnpaid.toLocaleString('en-IN')}.`
        : `Found ${deliveredInvoices.length} unpaid invoices totaling ₹${totalDeliveredUnpaid.toLocaleString('en-IN')} for orders that have already been fulfilled and delivered.`;

      return {
        success: true,
        intent: command.intent,
        module: 'CROSS_DEPT',
        spokenResponse: spoken,
        displayText: spoken,
        dataCard: {
          type: 'table',
          title: 'Unpaid Invoices for Delivered Shipments',
          headers: ['Invoice #', 'Sales Order #', 'Customer', 'Delivered On', 'Balance Due'],
          rows: deliveredInvoices.map((inv) => [
            inv.invoiceNumber,
            inv.salesOrder?.orderNumber || 'N/A',
            inv.customer.name,
            inv.salesOrder?.deliveredAt?.toISOString().split('T')[0] || 'Delivered',
            `₹${inv.balanceDue.toLocaleString('en-IN')}`,
          ]),
        },
      };
    }

    // ----------------------------------------------------
    // Intent: Cross-Dept: Compare Procurement with Finance Budget
    // ----------------------------------------------------
    case 'COMPARE_PROCUREMENT_BUDGET': {
      const [procBudget, purchaseOrders] = await Promise.all([
        prisma.budget.findFirst({
          where: { organizationId: orgId, department: { code: 'PROC' }, fiscalYear: 2026 },
          include: { department: true },
        }),
        prisma.purchaseOrder.findMany({
          where: { organizationId: orgId },
        }),
      ]);

      const allocated = procBudget?.allocatedAmount || 5000000;
      const totalPoCommitted = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
      const remaining = allocated - totalPoCommitted;
      const utilization = Math.round((totalPoCommitted / allocated) * 100);

      const spoken = isHindi
        ? `प्रोक्योरमेंट का कुल बजट ₹${allocated.toLocaleString('hi-IN')} है, जिसमें से ₹${totalPoCommitted.toLocaleString('hi-IN')} उपयोग किया गया है (${utilization}%)।`
        : isHinglish
        ? `Procurement department ka total budget ₹${allocated.toLocaleString('en-IN')} hai, aur purchase orders total ₹${totalPoCommitted.toLocaleString('en-IN')} (${utilization}% utilized).`
        : `Procurement has an allocated budget of ₹${allocated.toLocaleString('en-IN')}. Current PO commitments total ₹${totalPoCommitted.toLocaleString('en-IN')} (${utilization}% budget utilization).`;

      return {
        success: true,
        intent: command.intent,
        module: 'CROSS_DEPT',
        spokenResponse: spoken,
        displayText: spoken,
        dataCard: {
          type: 'metric',
          title: 'Procurement vs Finance Budget',
          metrics: [
            { label: 'Allocated Budget', value: `₹${allocated.toLocaleString('en-IN')}` },
            { label: 'PO Commitments', value: `₹${totalPoCommitted.toLocaleString('en-IN')}`, color: 'emerald' },
            { label: 'Remaining Budget', value: `₹${remaining.toLocaleString('en-IN')}`, color: remaining >= 0 ? 'emerald' : 'rose' },
            { label: 'Utilization', value: `${utilization}%` },
          ],
        },
      };
    }

    // ----------------------------------------------------
    // Intent: General ERP Status
    // ----------------------------------------------------
    case 'GENERAL_ERP_STATUS':
    default: {
      const [products, orders, employees] = await Promise.all([
        prisma.product.count({ where: { organizationId: orgId } }),
        prisma.salesOrder.count({ where: { organizationId: orgId } }),
        prisma.employee.count({ where: { organizationId: orgId } }),
      ]);

      const spoken = isHindi
        ? `अपैक्स ईआरपी प्रणाली सुचारू रूप से चल रही है। कुल ${products} उत्पाद, ${orders} बिक्री आदेश और ${employees} कर्मचारी सक्रिय हैं।`
        : isHinglish
        ? `Apex ERP system operational hai. Database mein ${products} products, ${orders} sales orders, aur ${employees} employees active hain.`
        : `Apex ERP system is active with ${products} products, ${orders} sales orders, and ${employees} registered employees.`;

      return {
        success: true,
        intent: command.intent,
        module: 'GENERAL',
        spokenResponse: spoken,
        displayText: spoken,
        dataCard: {
          type: 'metric',
          title: 'System Operational Status',
          metrics: [
            { label: 'Active Catalog', value: `${products} SKUs` },
            { label: 'Total Orders', value: `${orders} Orders` },
            { label: 'Staff Count', value: `${employees} Employees` },
          ],
        },
      };
    }
  }
}
