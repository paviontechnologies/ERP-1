import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SalesService } from '@/services/sales.service';

export async function GET() {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

    const [orders, customers, invoices, leads] = await Promise.all([
      prisma.salesOrder.findMany({
        where: { organizationId: org.id },
        include: { customer: true, items: { include: { product: true } }, invoices: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.findMany({ where: { organizationId: org.id }, orderBy: { name: 'asc' } }),
      prisma.invoice.findMany({
        where: { organizationId: org.id },
        include: { customer: true, payments: true },
        orderBy: { issueDate: 'desc' },
      }),
      prisma.lead.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: 'desc' } }),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      customers,
      invoices,
      leads,
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
    const { action, customerId, items, orderId, invoiceId, amount, paymentMethod, referenceNumber } = body;

    if (action === 'CREATE_ORDER') {
      const order = await SalesService.createOrder({
        organizationId: org.id,
        customerId,
        items,
      });
      return NextResponse.json({ success: true, order });
    }

    if (action === 'CONFIRM_ORDER') {
      const result = await SalesService.confirmOrder({
        organizationId: org.id,
        orderId,
      });
      return NextResponse.json({ success: true, result });
    }

    if (action === 'RECORD_PAYMENT') {
      const payment = await SalesService.recordPayment({
        organizationId: org.id,
        invoiceId,
        amount,
        paymentMethod: paymentMethod || 'BANK_TRANSFER',
        referenceNumber,
      });
      return NextResponse.json({ success: true, payment });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
