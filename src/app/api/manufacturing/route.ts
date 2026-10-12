import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ManufacturingService } from '@/services/manufacturing.service';

export async function GET() {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

    const [workOrders, boms] = await Promise.all([
      prisma.workOrder.findMany({
        where: { organizationId: org.id },
        include: {
          finishedProduct: true,
          bom: { include: { items: { include: { rawMaterial: true } } } },
          operations: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.billOfMaterials.findMany({
        where: { organizationId: org.id },
        include: { finishedProduct: true, items: { include: { rawMaterial: true } } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      workOrders,
      boms,
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
    const { action, bomId, targetQuantity, workOrderId, producedQuantity, userId } = body;

    if (action === 'CREATE_WORK_ORDER') {
      const wo = await ManufacturingService.createWorkOrder({
        organizationId: org.id,
        bomId,
        targetQuantity,
        userId,
      });
      return NextResponse.json({ success: true, workOrder: wo });
    }

    if (action === 'COMPLETE_WORK_ORDER') {
      const wo = await ManufacturingService.completeWorkOrder({
        organizationId: org.id,
        workOrderId,
        producedQuantity,
        userId,
      });
      return NextResponse.json({ success: true, workOrder: wo });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
