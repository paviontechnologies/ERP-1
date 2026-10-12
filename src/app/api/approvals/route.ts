import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProcurementService } from '@/services/procurement.service';
import { HRMSService } from '@/services/hrms.service';
import { ApprovalStatus } from '@prisma/client';

export async function GET() {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

    const requests = await prisma.approvalRequest.findMany({
      where: { organizationId: org.id },
      include: { requestedBy: true, approver: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

    const body = await req.json();
    const { requestId, action, userId, rejectionReason } = body;

    const request = await prisma.approvalRequest.findUnique({ where: { id: requestId } });
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    if (action === 'APPROVE') {
      // Execute downstream workflow depending on entity type
      if (request.entityType === 'PURCHASE_ORDER') {
        await ProcurementService.approvePurchaseOrder({
          organizationId: org.id,
          poId: request.entityId,
          userId: userId || 'admin',
        });
      } else if (request.entityType === 'PAYROLL_RUN') {
        await HRMSService.approvePayroll({
          organizationId: org.id,
          payrollRunId: request.entityId,
          userId: userId || 'admin',
        });
      }

      const updated = await prisma.approvalRequest.update({
        where: { id: requestId },
        data: {
          status: ApprovalStatus.APPROVED,
          approverId: userId,
          approvedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, request: updated });
    }

    if (action === 'REJECT') {
      const updated = await prisma.approvalRequest.update({
        where: { id: requestId },
        data: {
          status: ApprovalStatus.REJECTED,
          approverId: userId,
          rejectionReason,
        },
      });

      return NextResponse.json({ success: true, request: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
