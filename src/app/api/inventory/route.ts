import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InventoryService } from '@/services/inventory.service';
import { StockMovementType } from '@prisma/client';

export async function GET() {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

    const [products, categories, warehouses, movements, valuation] = await Promise.all([
      prisma.product.findMany({
        where: { organizationId: org.id },
        include: { category: true, stockLevels: { include: { warehouse: true } } },
        orderBy: { currentStock: 'asc' },
      }),
      prisma.category.findMany({ where: { organizationId: org.id } }),
      prisma.warehouse.findMany({ where: { organizationId: org.id } }),
      prisma.stockMovement.findMany({
        where: { organizationId: org.id },
        include: { product: true, warehouse: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      InventoryService.getInventoryValuation(org.id),
    ]);

    return NextResponse.json({
      success: true,
      products,
      categories,
      warehouses,
      movements,
      valuation,
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
    const { action, warehouseId, productId, quantity, type, notes } = body;

    if (action === 'RECORD_MOVEMENT') {
      const res = await InventoryService.recordMovement({
        organizationId: org.id,
        warehouseId,
        productId,
        type: type || StockMovementType.ADJUSTMENT,
        quantity,
        notes,
      });
      return NextResponse.json({ success: true, data: res });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
