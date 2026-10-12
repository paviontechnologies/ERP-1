import { prisma } from '@/lib/prisma';
import { PurchaseOrderStatus, GoodsReceiptStatus, StockMovementType, ApprovalStatus } from '@prisma/client';
import { logAudit } from '@/lib/audit';

export class ProcurementService {
  /**
   * Create Purchase Order
   */
  static async createPurchaseOrder(params: {
    organizationId: string;
    branchId?: string;
    vendorId: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
    requisitionId?: string;
    terms?: string;
    expectedDeliveryDate?: Date;
    userId?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const poCount = await tx.purchaseOrder.count({ where: { organizationId: params.organizationId } });
      const poNumber = `PO-2026-${String(poCount + 1001).padStart(4, '0')}`;

      let subtotal = 0;
      const poItemsData = params.items.map((i) => {
        const itemTotal = i.quantity * i.unitPrice;
        subtotal += itemTotal;
        return {
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: itemTotal,
        };
      });

      const taxAmount = Math.round(subtotal * 0.18);
      const totalAmount = subtotal + taxAmount;

      const po = await tx.purchaseOrder.create({
        data: {
          organizationId: params.organizationId,
          branchId: params.branchId,
          vendorId: params.vendorId,
          poNumber,
          requisitionId: params.requisitionId,
          status: PurchaseOrderStatus.DRAFT,
          subtotal,
          taxAmount,
          totalAmount,
          expectedDeliveryDate: params.expectedDeliveryDate,
          terms: params.terms,
          createdById: params.userId,
          items: {
            create: poItemsData,
          },
        },
        include: { items: { include: { product: true } }, vendor: true },
      });

      // Create Approval Request
      await tx.approvalRequest.create({
        data: {
          organizationId: params.organizationId,
          requestedById: params.userId || (await tx.user.findFirst({ where: { organizationId: params.organizationId } }))!.id,
          module: 'PROCUREMENT',
          entityType: 'PURCHASE_ORDER',
          entityId: po.id,
          title: `Approval for Purchase Order ${poNumber} - ${po.vendor.name}`,
          description: `Total procurement commitment: ₹${totalAmount.toLocaleString('en-IN')}`,
          amount: totalAmount,
          status: ApprovalStatus.PENDING,
        },
      });

      await logAudit({
        organizationId: params.organizationId,
        userId: params.userId,
        entity: 'PurchaseOrder',
        entityId: po.id,
        action: 'CREATE_PURCHASE_ORDER',
        newData: { poNumber, totalAmount, vendor: po.vendor.name },
      });

      return po;
    });
  }

  /**
   * Approve Purchase Order
   */
  static async approvePurchaseOrder(params: {
    organizationId: string;
    poId: string;
    userId: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: params.poId },
        include: { vendor: true },
      });

      if (!po) throw new Error('Purchase order not found');

      let approverUser = await tx.user.findFirst({
        where: {
          organizationId: params.organizationId,
          OR: [{ id: params.userId }, { email: params.userId }],
        },
      });
      if (!approverUser) {
        approverUser = await tx.user.findFirst({ where: { organizationId: params.organizationId } });
      }

      const updatedPO = await tx.purchaseOrder.update({
        where: { id: params.poId },
        data: {
          status: PurchaseOrderStatus.ISSUED,
          approvedById: approverUser ? approverUser.id : undefined,
          approvedAt: new Date(),
        },
      });

      // Update related approval request if present
      await tx.approvalRequest.updateMany({
        where: { entityId: params.poId, status: ApprovalStatus.PENDING },
        data: {
          status: ApprovalStatus.APPROVED,
          approverId: params.userId,
          approvedAt: new Date(),
        },
      });

      await logAudit({
        organizationId: params.organizationId,
        userId: params.userId,
        entity: 'PurchaseOrder',
        entityId: po.id,
        action: 'APPROVE_PURCHASE_ORDER',
        newData: { poNumber: po.poNumber, status: 'ISSUED' },
      });

      return updatedPO;
    });
  }

  /**
   * Process Goods Receipt Note (GRN) -> 3-way match & increment inventory
   */
  static async processGoodsReceipt(params: {
    organizationId: string;
    purchaseOrderId: string;
    warehouseId: string;
    carrier?: string;
    trackingNumber?: string;
    items: { productId: string; receivedQuantity: number }[];
    userId?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: params.purchaseOrderId },
        include: { items: true, vendor: true },
      });

      if (!po) throw new Error('Purchase order not found');

      const grnCount = await tx.goodsReceipt.count({ where: { organizationId: params.organizationId } });
      const grnNumber = `GRN-2026-${String(grnCount + 1001).padStart(4, '0')}`;

      const grn = await tx.goodsReceipt.create({
        data: {
          organizationId: params.organizationId,
          warehouseId: params.warehouseId,
          purchaseOrderId: po.id,
          grnNumber,
          carrier: params.carrier,
          trackingNumber: params.trackingNumber,
          status: GoodsReceiptStatus.ACCEPTED,
          receivedById: params.userId,
          items: {
            create: params.items.map((i) => {
              const poItem = po.items.find((pi) => pi.productId === i.productId);
              return {
                productId: i.productId,
                orderedQuantity: poItem ? poItem.quantity : i.receivedQuantity,
                receivedQuantity: i.receivedQuantity,
                acceptedQuantity: i.receivedQuantity,
              };
            }),
          },
        },
      });

      let totalValueReceived = 0;

      // Update inventory stock and PO item received quantity
      for (const item of params.items) {
        const poItem = po.items.find((pi) => pi.productId === item.productId);
        const unitCost = poItem ? poItem.unitPrice : 0;
        totalValueReceived += item.receivedQuantity * unitCost;

        // Update product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: item.receivedQuantity },
            availableStock: { increment: item.receivedQuantity },
          },
        });

        // Update stock level in warehouse
        const stockLevel = await tx.stockLevel.findFirst({
          where: { warehouseId: params.warehouseId, productId: item.productId },
        });

        if (stockLevel) {
          await tx.stockLevel.update({
            where: { id: stockLevel.id },
            data: { quantity: { increment: item.receivedQuantity } },
          });
        } else {
          await tx.stockLevel.create({
            data: {
              warehouseId: params.warehouseId,
              productId: item.productId,
              quantity: item.receivedQuantity,
              batchNumber: `GRN-${grnNumber}`,
            },
          });
        }

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            organizationId: params.organizationId,
            warehouseId: params.warehouseId,
            productId: item.productId,
            type: StockMovementType.PURCHASE_RECEIPT,
            quantity: item.receivedQuantity,
            unitCost,
            totalCost: item.receivedQuantity * unitCost,
            referenceType: 'GOODS_RECEIPT',
            referenceId: grn.id,
            performedById: params.userId,
            batchNumber: `GRN-${grnNumber}`,
          },
        });

        // Update PO item received quantity
        if (poItem) {
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: { receivedQuantity: { increment: item.receivedQuantity } },
          });
        }
      }

      // Check if all PO items fully received
      const updatedPoItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
      const allReceived = updatedPoItems.every((item) => item.receivedQuantity >= item.quantity);

      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: allReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED,
        },
      });

      // Post Double-Entry Journal Entry: Debit Inventory (1040) / Credit Accounts Payable (2010)
      const invAccount = await tx.account.findFirst({ where: { organizationId: params.organizationId, code: '1040' } });
      const apAccount = await tx.account.findFirst({ where: { organizationId: params.organizationId, code: '2010' } });

      if (invAccount && apAccount && totalValueReceived > 0) {
        const jEntryCount = await tx.journalEntry.count({ where: { organizationId: params.organizationId } });
        const entryNumber = `JE-2026-${String(jEntryCount + 1001).padStart(4, '0')}`;

        await tx.journalEntry.create({
          data: {
            organizationId: params.organizationId,
            entryNumber,
            referenceType: 'GOODS_RECEIPT',
            referenceId: grn.id,
            description: `Goods receipt ${grnNumber} from ${po.vendor.name}`,
            lines: {
              create: [
                { accountId: invAccount.id, debit: totalValueReceived, credit: 0, description: 'Stock receipt' },
                { accountId: apAccount.id, debit: 0, credit: totalValueReceived, description: 'Payable to supplier' },
              ],
            },
          },
        });

        await tx.account.update({ where: { id: invAccount.id }, data: { balance: { increment: totalValueReceived } } });
        await tx.account.update({ where: { id: apAccount.id }, data: { balance: { increment: totalValueReceived } } });
      }

      await logAudit({
        organizationId: params.organizationId,
        userId: params.userId,
        entity: 'GoodsReceipt',
        entityId: grn.id,
        action: 'PROCESS_GOODS_RECEIPT',
        newData: { grnNumber, poNumber: po.poNumber, totalValue: totalValueReceived },
      });

      return grn;
    });
  }
}
