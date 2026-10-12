import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProcurementService } from '@/services/procurement.service';

export async function GET() {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

    const [orders, vendors, goodsReceipts] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: { organizationId: org.id },
        include: { vendor: true, items: { include: { product: true } }, goodsReceipts: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vendor.findMany({ where: { organizationId: org.id }, orderBy: { name: 'asc' } }),
      prisma.goodsReceipt.findMany({
        where: { organizationId: org.id },
        include: { purchaseOrder: { include: { vendor: true } }, items: { include: { product: true } } },
        orderBy: { receivedDate: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      vendors,
      goodsReceipts,
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
    const { action, vendorId, items, poId, warehouseId, carrier, trackingNumber, userId } = body;

    if (action === 'CREATE_PO') {
      const po = await ProcurementService.createPurchaseOrder({
        organizationId: org.id,
        vendorId,
        items,
        userId,
      });
      return NextResponse.json({ success: true, po });
    }

    if (action === 'APPROVE_PO') {
      const po = await ProcurementService.approvePurchaseOrder({
        organizationId: org.id,
        poId,
        userId: userId || 'admin',
      });
      return NextResponse.json({ success: true, po });
    }

    if (action === 'PROCESS_GRN') {
      const grn = await ProcurementService.processGoodsReceipt({
        organizationId: org.id,
        purchaseOrderId: poId,
        warehouseId,
        carrier,
        trackingNumber,
        items,
        userId,
      });
      return NextResponse.json({ success: true, grn });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
