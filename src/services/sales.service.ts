import { prisma } from '@/lib/prisma';
import { SalesOrderStatus, PaymentStatus, InvoiceStatus, StockMovementType, ReservationStatus } from '@prisma/client';
import { logAudit } from '@/lib/audit';

export class SalesService {
  /**
   * Create Draft Sales Order
   */
  static async createOrder(params: {
    organizationId: string;
    branchId?: string;
    customerId: string;
    items: { productId: string; quantity: number; unitPrice: number; description?: string }[];
    notes?: string;
    userId?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const orderCount = await tx.salesOrder.count({ where: { organizationId: params.organizationId } });
      const orderNumber = `SO-2026-${String(orderCount + 1001).padStart(4, '0')}`;

      let subtotal = 0;
      const orderItemsData = params.items.map((i) => {
        const itemTotal = i.quantity * i.unitPrice;
        subtotal += itemTotal;
        return {
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: itemTotal,
          description: i.description,
        };
      });

      const taxAmount = Math.round(subtotal * 0.18); // 18% GST
      const totalAmount = subtotal + taxAmount;

      const order = await tx.salesOrder.create({
        data: {
          organizationId: params.organizationId,
          branchId: params.branchId,
          orderNumber,
          customerId: params.customerId,
          status: SalesOrderStatus.DRAFT,
          paymentStatus: PaymentStatus.PENDING,
          subtotal,
          taxAmount,
          totalAmount,
          notes: params.notes,
          createdById: params.userId,
          items: {
            create: orderItemsData,
          },
        },
        include: { items: { include: { product: true } }, customer: true },
      });

      await logAudit({
        organizationId: params.organizationId,
        userId: params.userId,
        entity: 'SalesOrder',
        entityId: order.id,
        action: 'CREATE_SALES_ORDER',
        newData: { orderNumber, totalAmount },
      });

      return order;
    });
  }

  /**
   * Confirm Sales Order -> Auto-reserves inventory & generates invoice
   */
  static async confirmOrder(params: {
    organizationId: string;
    orderId: string;
    warehouseId?: string;
    userId?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: params.orderId },
        include: { items: { include: { product: true } }, customer: true },
      });

      if (!order) throw new Error('Sales order not found');
      if (order.status !== SalesOrderStatus.DRAFT) {
        throw new Error(`Order cannot be confirmed from status: ${order.status}`);
      }

      // Check customer credit limit
      const newOutstanding = order.customer.outstandingBalance + order.totalAmount;
      if (newOutstanding > order.customer.creditLimit) {
        throw new Error(
          `Customer credit limit exceeded. Limit: ₹${order.customer.creditLimit}, Projected Outstanding: ₹${newOutstanding}`
        );
      }

      // Check default warehouse
      let warehouse = await tx.warehouse.findFirst({
        where: { organizationId: params.organizationId, isActive: true },
      });
      if (params.warehouseId) {
        const customWh = await tx.warehouse.findUnique({ where: { id: params.warehouseId } });
        if (customWh) warehouse = customWh;
      }
      if (!warehouse) throw new Error('No active warehouse configured');

      // Check stock and reserve
      for (const item of order.items) {
        if (item.product.availableStock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${item.product.name}. Available: ${item.product.availableStock}, Needed: ${item.quantity}`
          );
        }

        // Create reservation
        await tx.inventoryReservation.create({
          data: {
            organizationId: params.organizationId,
            productId: item.productId,
            warehouseId: warehouse.id,
            salesOrderId: order.id,
            quantity: item.quantity,
            status: ReservationStatus.ACTIVE,
          },
        });

        // Increment reserved, decrement available
        await tx.product.update({
          where: { id: item.productId },
          data: {
            reservedStock: { increment: item.quantity },
            availableStock: { decrement: item.quantity },
          },
        });

        // Update order item reserved qty
        await tx.salesOrderItem.update({
          where: { id: item.id },
          data: { reservedQuantity: item.quantity },
        });
      }

      // Generate invoice
      const invoiceCount = await tx.invoice.count({ where: { organizationId: params.organizationId } });
      const invoiceNumber = `INV-2026-${String(invoiceCount + 1001).padStart(4, '0')}`;
      const dueDate = new Date(Date.now() + order.customer.paymentTermsDays * 24 * 60 * 60 * 1000);

      const invoice = await tx.invoice.create({
        data: {
          organizationId: params.organizationId,
          branchId: order.branchId,
          invoiceNumber,
          salesOrderId: order.id,
          customerId: order.customerId,
          issueDate: new Date(),
          dueDate,
          status: InvoiceStatus.ISSUED,
          subtotal: order.subtotal,
          taxAmount: order.taxAmount,
          totalAmount: order.totalAmount,
          paidAmount: 0,
          balanceDue: order.totalAmount,
          notes: `Generated from order ${order.orderNumber}`,
        },
      });

      // Update customer outstanding balance
      await tx.customer.update({
        where: { id: order.customerId },
        data: { outstandingBalance: { increment: order.totalAmount } },
      });

      // Update order status
      const updatedOrder = await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          status: SalesOrderStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
        include: { items: { include: { product: true } }, customer: true, invoices: true },
      });

      // Post Double-Entry Journal Entry
      const arAccount = await tx.account.findFirst({ where: { organizationId: params.organizationId, code: '1030' } });
      const revAccount = await tx.account.findFirst({ where: { organizationId: params.organizationId, code: '4010' } });

      if (arAccount && revAccount) {
        const jEntryCount = await tx.journalEntry.count({ where: { organizationId: params.organizationId } });
        const entryNumber = `JE-2026-${String(jEntryCount + 1001).padStart(4, '0')}`;

        await tx.journalEntry.create({
          data: {
            organizationId: params.organizationId,
            branchId: order.branchId,
            entryNumber,
            referenceType: 'SALES_INVOICE',
            referenceId: invoice.id,
            description: `Sales revenue for order ${order.orderNumber} - ${order.customer.name}`,
            lines: {
              create: [
                { accountId: arAccount.id, debit: order.totalAmount, credit: 0, description: 'Debtors' },
                { accountId: revAccount.id, debit: 0, credit: order.totalAmount, description: 'Revenue' },
              ],
            },
          },
        });

        // Update account balances
        await tx.account.update({ where: { id: arAccount.id }, data: { balance: { increment: order.totalAmount } } });
        await tx.account.update({ where: { id: revAccount.id }, data: { balance: { increment: order.totalAmount } } });
      }

      await logAudit({
        organizationId: params.organizationId,
        userId: params.userId,
        entity: 'SalesOrder',
        entityId: order.id,
        action: 'CONFIRM_SALES_ORDER_AND_INVOICE',
        newData: { orderNumber: order.orderNumber, invoiceNumber },
      });

      return { order: updatedOrder, invoice };
    });
  }

  /**
   * Process Customer Payment
   */
  static async recordPayment(params: {
    organizationId: string;
    invoiceId: string;
    amount: number;
    paymentMethod: any;
    referenceNumber?: string;
    notes?: string;
    userId?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: params.invoiceId },
        include: { customer: true, salesOrder: true },
      });

      if (!invoice) throw new Error('Invoice not found');
      if (params.amount <= 0) throw new Error('Payment amount must be greater than zero');
      if (params.amount > invoice.balanceDue) {
        throw new Error(`Payment ₹${params.amount} exceeds invoice balance due ₹${invoice.balanceDue}`);
      }

      const paymentCount = await tx.payment.count({ where: { organizationId: params.organizationId } });
      const paymentNumber = `PAY-2026-${String(paymentCount + 1001).padStart(4, '0')}`;

      const payment = await tx.payment.create({
        data: {
          organizationId: params.organizationId,
          paymentNumber,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: params.amount,
          paymentMethod: params.paymentMethod,
          referenceNumber: params.referenceNumber,
          notes: params.notes,
          createdById: params.userId,
        },
      });

      const newPaidAmount = invoice.paidAmount + params.amount;
      const newBalanceDue = invoice.balanceDue - params.amount;
      const isFullyPaid = newBalanceDue === 0;

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          status: isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
        },
      });

      if (invoice.salesOrderId) {
        await tx.salesOrder.update({
          where: { id: invoice.salesOrderId },
          data: {
            paymentStatus: isFullyPaid ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
          },
        });
      }

      // Deduct customer outstanding balance
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: { outstandingBalance: { decrement: params.amount } },
      });

      // Update General Ledger (Debit Bank, Credit Accounts Receivable)
      const bankAccount = await tx.account.findFirst({ where: { organizationId: params.organizationId, code: '1020' } });
      const arAccount = await tx.account.findFirst({ where: { organizationId: params.organizationId, code: '1030' } });

      if (bankAccount && arAccount) {
        const jEntryCount = await tx.journalEntry.count({ where: { organizationId: params.organizationId } });
        const entryNumber = `JE-2026-${String(jEntryCount + 1001).padStart(4, '0')}`;

        await tx.journalEntry.create({
          data: {
            organizationId: params.organizationId,
            entryNumber,
            referenceType: 'PAYMENT_RECEIPT',
            referenceId: payment.id,
            description: `Payment ${paymentNumber} received from ${invoice.customer.name}`,
            lines: {
              create: [
                { accountId: bankAccount.id, debit: params.amount, credit: 0, description: 'Bank receipt' },
                { accountId: arAccount.id, debit: 0, credit: params.amount, description: 'AR settlement' },
              ],
            },
          },
        });

        await tx.account.update({ where: { id: bankAccount.id }, data: { balance: { increment: params.amount } } });
        await tx.account.update({ where: { id: arAccount.id }, data: { balance: { decrement: params.amount } } });
      }

      await logAudit({
        organizationId: params.organizationId,
        userId: params.userId,
        entity: 'Payment',
        entityId: payment.id,
        action: 'RECEIVE_PAYMENT',
        newData: { paymentNumber, amount: params.amount, invoiceNumber: invoice.invoiceNumber },
      });

      return payment;
    });
  }
}
