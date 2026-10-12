import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AnalyticsService } from '@/services/analytics.service';

export async function GET() {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

    const metrics = await AnalyticsService.getExecutiveMetrics(org.id);
    return NextResponse.json({ success: true, metrics, organization: org });
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
