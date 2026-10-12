import { prisma } from '@/lib/prisma';
import { WorkOrderStatus, OperationStatus, StockMovementType, ReservationStatus } from '@prisma/client';
import { logAudit } from '@/lib/audit';

export class ManufacturingService {
  /**
   * Create Work Order with BOM calculation
   */
  static async createWorkOrder(params: {
    organizationId: string;
    branchId?: string;
    warehouseId?: string;
    bomId: string;
    targetQuantity: number;
    startDate?: Date;
    dueDate?: Date;
    userId?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const bom = await tx.billOfMaterials.findUnique({
        where: { id: params.bomId },
        include: { items: { include: { rawMaterial: true } }, finishedProduct: true },
      });

      if (!bom) throw new Error('BOM not found');

      const woCount = await tx.workOrder.count({ where: { organizationId: params.organizationId } });
      const workOrderNumber = `WO-2026-${String(woCount + 1001).padStart(4, '0')}`;

      // Calculate total estimated cost
      let totalMaterialCost = 0;
      for (const item of bom.items) {
        totalMaterialCost += item.quantityPerUnit * params.targetQuantity * item.unitCost;
      }

      const laborCost = params.targetQuantity * bom.estimatedHours * 450; // ₹450 / hour direct labor
      const totalCost = totalMaterialCost + laborCost;

      const workOrder = await tx.workOrder.create({
        data: {
          organizationId: params.organizationId,
          branchId: params.branchId,
          warehouseId: params.warehouseId,
          workOrderNumber,
          bomId: bom.id,
          finishedProductId: bom.finishedProductId,
          targetQuantity: params.targetQuantity,
          status: WorkOrderStatus.PLANNED,
          startDate: params.startDate || new Date(),
          dueDate: params.dueDate,
          totalCost,
          createdById: params.userId,
          operations: {
            create: [
              { sequence: 1, operationName: 'Component Kitting & Quality Inspection', standardMinutes: 45, status: OperationStatus.PENDING },
              { sequence: 2, operationName: 'Sub-assembly & Wiring Integration', standardMinutes: 90, status: OperationStatus.PENDING },
              { sequence: 3, operationName: 'Testing, Calibration & Burn-in', standardMinutes: 60, status: OperationStatus.PENDING },
              { sequence: 4, operationName: 'Final Assembly, Packaging & Labeling', standardMinutes: 30, status: OperationStatus.PENDING },
            ],
          },
        },
        include: { finishedProduct: true, bom: { include: { items: { include: { rawMaterial: true } } } }, operations: true },
      });

      await logAudit({
        organizationId: params.organizationId,
        userId: params.userId,
        entity: 'WorkOrder',
        entityId: workOrder.id,
        action: 'CREATE_WORK_ORDER',
        newData: { workOrderNumber, targetQuantity: params.targetQuantity, finishedProduct: bom.finishedProduct.name },
      });

      return workOrder;
    });
  }

  /**
   * Complete Work Order -> Consumes raw materials, increments finished goods, posts journal
   */
  static async completeWorkOrder(params: {
    organizationId: string;
    workOrderId: string;
    producedQuantity: number;
    warehouseId?: string;
    userId?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.findUnique({
        where: { id: params.workOrderId },
        include: {
          bom: { include: { items: { include: { rawMaterial: true } } } },
          finishedProduct: true,
        },
      });

      if (!wo) throw new Error('Work order not found');
      if (wo.status === WorkOrderStatus.COMPLETED) throw new Error('Work order is already completed');

      let warehouse = await tx.warehouse.findFirst({
        where: { organizationId: params.organizationId, isActive: true },
      });
      if (wo.warehouseId) {
        const customWh = await tx.warehouse.findUnique({ where: { id: wo.warehouseId } });
        if (customWh) warehouse = customWh;
      }
      if (!warehouse) throw new Error('No warehouse available for manufacturing operations');

      let rawMaterialCostConsumed = 0;

      // 1. Consume Raw Materials from BOM
      for (const item of wo.bom.items) {
        const consumedQty = item.quantityPerUnit * params.producedQuantity;
        const itemCost = consumedQty * item.unitCost;
        rawMaterialCostConsumed += itemCost;

        // Decrement raw material stock
        await tx.product.update({
          where: { id: item.rawMaterialProductId },
          data: {
            currentStock: { decrement: consumedQty },
            availableStock: { decrement: consumedQty },
          },
        });

        // Decrement warehouse stock level
        const stockLevel = await tx.stockLevel.findFirst({
          where: { warehouseId: warehouse.id, productId: item.rawMaterialProductId },
        });
        if (stockLevel) {
          await tx.stockLevel.update({
            where: { id: stockLevel.id },
            data: { quantity: { decrement: consumedQty } },
          });
        }

        // Record Stock Movement (PRODUCTION_CONSUMPTION)
        await tx.stockMovement.create({
          data: {
            organizationId: params.organizationId,
            warehouseId: warehouse.id,
            productId: item.rawMaterialProductId,
            type: StockMovementType.PRODUCTION_CONSUMPTION,
            quantity: consumedQty,
            unitCost: item.unitCost,
            totalCost: itemCost,
            referenceType: 'WORK_ORDER',
            referenceId: wo.id,
            notes: `Consumed for Work Order ${wo.workOrderNumber}`,
            performedById: params.userId,
          },
        });
      }

      // 2. Increment Finished Goods Stock
      await tx.product.update({
        where: { id: wo.finishedProductId },
        data: {
          currentStock: { increment: params.producedQuantity },
          availableStock: { increment: params.producedQuantity },
        },
      });

      const fgStockLevel = await tx.stockLevel.findFirst({
        where: { warehouseId: warehouse.id, productId: wo.finishedProductId },
      });
      if (fgStockLevel) {
        await tx.stockLevel.update({
          where: { id: fgStockLevel.id },
          data: { quantity: { increment: params.producedQuantity } },
        });
      } else {
        await tx.stockLevel.create({
          data: {
            warehouseId: warehouse.id,
            productId: wo.finishedProductId,
            quantity: params.producedQuantity,
            batchNumber: `WO-${wo.workOrderNumber}`,
          },
        });
      }

      // Record Stock Movement (PRODUCTION_OUTPUT)
      await tx.stockMovement.create({
        data: {
          organizationId: params.organizationId,
          warehouseId: warehouse.id,
          productId: wo.finishedProductId,
          type: StockMovementType.PRODUCTION_OUTPUT,
          quantity: params.producedQuantity,
          unitCost: wo.finishedProduct.costPrice,
          totalCost: params.producedQuantity * wo.finishedProduct.costPrice,
          referenceType: 'WORK_ORDER',
          referenceId: wo.id,
          notes: `Manufactured via Work Order ${wo.workOrderNumber}`,
          performedById: params.userId,
          batchNumber: `WO-${wo.workOrderNumber}`,
        },
      });

      // 3. Mark Work Order & Operations Completed
      await tx.workOrderOperation.updateMany({
        where: { workOrderId: wo.id },
        data: { status: OperationStatus.COMPLETED },
      });

      const updatedWO = await tx.workOrder.update({
        where: { id: wo.id },
        data: {
          status: WorkOrderStatus.COMPLETED,
          producedQuantity: params.producedQuantity,
          completedDate: new Date(),
        },
      });

      // 4. Double-Entry Journal Entry:
      // Debit Finished Goods Inventory (1050)
      // Credit Raw Materials Inventory (1040)
      const fgAccount = await tx.account.findFirst({ where: { organizationId: params.organizationId, code: '1050' } });
      const rmAccount = await tx.account.findFirst({ where: { organizationId: params.organizationId, code: '1040' } });

      if (fgAccount && rmAccount && rawMaterialCostConsumed > 0) {
        const jEntryCount = await tx.journalEntry.count({ where: { organizationId: params.organizationId } });
        const entryNumber = `JE-2026-${String(jEntryCount + 1001).padStart(4, '0')}`;

        await tx.journalEntry.create({
          data: {
            organizationId: params.organizationId,
            entryNumber,
            referenceType: 'MANUFACTURING',
            referenceId: wo.id,
            description: `Production output for ${wo.workOrderNumber} (${wo.finishedProduct.name})`,
            lines: {
              create: [
                { accountId: fgAccount.id, debit: rawMaterialCostConsumed, credit: 0, description: 'Finished Goods added' },
                { accountId: rmAccount.id, debit: 0, credit: rawMaterialCostConsumed, description: 'Raw materials consumed' },
              ],
            },
          },
        });

        await tx.account.update({ where: { id: fgAccount.id }, data: { balance: { increment: rawMaterialCostConsumed } } });
        await tx.account.update({ where: { id: rmAccount.id }, data: { balance: { decrement: rawMaterialCostConsumed } } });
      }

      await logAudit({
        organizationId: params.organizationId,
        userId: params.userId,
        entity: 'WorkOrder',
        entityId: wo.id,
        action: 'COMPLETE_WORK_ORDER',
        newData: { workOrderNumber: wo.workOrderNumber, produced: params.producedQuantity },
      });

      return updatedWO;
    });
  }
}
