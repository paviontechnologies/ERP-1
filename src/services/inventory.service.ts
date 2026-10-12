import { prisma } from '@/lib/prisma';
import { StockMovementType, ReservationStatus } from '@prisma/client';
import { logAudit } from '@/lib/audit';

export class InventoryService {
  /**
   * Check product stock availability
   */
  static async checkStock(productId: string, requestedQuantity: number) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { stockLevels: true },
    });

    if (!product) throw new Error(`Product not found: ${productId}`);

    const isAvailable = product.availableStock >= requestedQuantity;
    return {
      product,
      currentStock: product.currentStock,
      reservedStock: product.reservedStock,
      availableStock: product.availableStock,
      requestedQuantity,
      isAvailable,
      shortage: isAvailable ? 0 : requestedQuantity - product.availableStock,
    };
  }

  /**
   * Reserve stock for a Sales Order or Work Order
   */
  static async reserveStock(params: {
    organizationId: string;
    productId: string;
    warehouseId: string;
    quantity: number;
    salesOrderId?: string;
    workOrderId?: string;
    userId?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: params.productId },
      });

      if (!product) throw new Error('Product not found');
      if (product.availableStock < params.quantity) {
        throw new Error(
          `Insufficient available stock for ${product.name}. Available: ${product.availableStock}, Requested: ${params.quantity}`
        );
      }

      // Create reservation
      const reservation = await tx.inventoryReservation.create({
        data: {
          organizationId: params.organizationId,
          productId: params.productId,
          warehouseId: params.warehouseId,
          salesOrderId: params.salesOrderId,
          workOrderId: params.workOrderId,
          quantity: params.quantity,
          status: ReservationStatus.ACTIVE,
        },
      });

      // Update product reserved & available stock
      const updatedProduct = await tx.product.update({
        where: { id: params.productId },
        data: {
          reservedStock: { increment: params.quantity },
          availableStock: { decrement: params.quantity },
        },
      });

      // Update warehouse stock level reserved count
      const stockLevel = await tx.stockLevel.findFirst({
        where: { warehouseId: params.warehouseId, productId: params.productId },
      });

      if (stockLevel) {
        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: { reservedQuantity: { increment: params.quantity } },
        });
      }

      await logAudit({
        organizationId: params.organizationId,
        userId: params.userId,
        entity: 'InventoryReservation',
        entityId: reservation.id,
        action: 'RESERVE_STOCK',
        newData: { quantity: params.quantity, product: product.sku },
      });

      return { reservation, product: updatedProduct };
    });
  }

  /**
   * Record Stock Movement (In / Out / Adjustment)
   */
  static async recordMovement(params: {
    organizationId: string;
    warehouseId: string;
    productId: string;
    type: StockMovementType;
    quantity: number;
    unitCost?: number;
    referenceType?: string;
    referenceId?: string;
    batchNumber?: string;
    notes?: string;
    userId?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: params.productId } });
      if (!product) throw new Error('Product not found');

      const isOutward = (
        [
          StockMovementType.SALES_SHIPMENT,
          StockMovementType.PRODUCTION_CONSUMPTION,
          StockMovementType.TRANSFER_OUT,
        ] as StockMovementType[]
      ).includes(params.type);

      const isInward = (
        [
          StockMovementType.PURCHASE_RECEIPT,
          StockMovementType.PRODUCTION_OUTPUT,
          StockMovementType.TRANSFER_IN,
          StockMovementType.RETURN,
        ] as StockMovementType[]
      ).includes(params.type);

      const qtyDelta = isInward ? params.quantity : isOutward ? -params.quantity : params.quantity;
      const unitCost = params.unitCost ?? product.costPrice;
      const totalCost = Math.abs(params.quantity * unitCost);

      // Create movement record
      const movement = await tx.stockMovement.create({
        data: {
          organizationId: params.organizationId,
          warehouseId: params.warehouseId,
          productId: params.productId,
          type: params.type,
          quantity: params.quantity,
          unitCost,
          totalCost,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          batchNumber: params.batchNumber,
          notes: params.notes,
          performedById: params.userId,
        },
      });

      // Update product current stock & available stock
      const updatedProduct = await tx.product.update({
        where: { id: params.productId },
        data: {
          currentStock: { increment: qtyDelta },
          availableStock: { increment: qtyDelta },
        },
      });

      // Update warehouse stock level
      const stockLevel = await tx.stockLevel.findFirst({
        where: { warehouseId: params.warehouseId, productId: params.productId },
      });

      if (stockLevel) {
        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: { quantity: { increment: qtyDelta } },
        });
      } else if (isInward) {
        await tx.stockLevel.create({
          data: {
            warehouseId: params.warehouseId,
            productId: params.productId,
            batchNumber: params.batchNumber || 'DEFAULT',
            quantity: params.quantity,
          },
        });
      }

      return { movement, updatedProduct };
    });
  }

  /**
   * Query all products with stock at or below reorder threshold
   */
  static async getLowStockProducts(organizationId: string) {
    const products = await prisma.product.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        category: true,
        stockLevels: { include: { warehouse: true } },
      },
      orderBy: { currentStock: 'asc' },
    });

    return products.filter((p) => p.currentStock <= p.reorderPoint);
  }

  /**
   * Total Inventory Valuation
   */
  static async getInventoryValuation(organizationId: string) {
    const products = await prisma.product.findMany({
      where: { organizationId, isActive: true },
      select: { currentStock: true, costPrice: true, type: true },
    });

    let rawMaterialValue = 0;
    let finishedGoodsValue = 0;
    let totalValuation = 0;

    for (const p of products) {
      const val = p.currentStock * p.costPrice;
      totalValuation += val;
      if (p.type === 'RAW_MATERIAL') rawMaterialValue += val;
      else finishedGoodsValue += val;
    }

    return { totalValuation, rawMaterialValue, finishedGoodsValue };
  }
}
