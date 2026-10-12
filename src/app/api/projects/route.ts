import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

    const [projects, tasks, tickets] = await Promise.all([
      prisma.project.findMany({
        where: { organizationId: org.id },
        include: { customer: true, tasks: { include: { assignedTo: true } }, milestones: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.findMany({
        where: { project: { organizationId: org.id } },
        include: { assignedTo: true, project: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supportTicket.findMany({
        where: { organizationId: org.id },
        include: { customer: true, assignedTo: true, messages: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({ success: true, projects, tasks, tickets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
