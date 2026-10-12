import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseVoiceIntent } from '@/lib/voice-ai/intent-parser';
import { executeVoiceCommand } from '@/lib/voice-ai/action-executor';
import { DEMO_USERS, AppUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, role = 'CEO', confirmed = false, slots } = body;

    if (!query && !slots) {
      return NextResponse.json({ error: 'Query or action slots required' }, { status: 400 });
    }

    // Resolve Organization
    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 500 });
    }

    // Resolve User for the specified role
    const demoInfo = DEMO_USERS[role as UserRole] || DEMO_USERS.CEO;
    let dbUser = await prisma.user.findFirst({
      where: { organizationId: org.id, role: demoInfo.role },
    });

    if (!dbUser) {
      dbUser = await prisma.user.findFirst({ where: { organizationId: org.id } });
    }

    const appUser: AppUser = {
      id: dbUser ? dbUser.id : 'demo-user',
      name: dbUser ? dbUser.name : demoInfo.name,
      email: dbUser ? dbUser.email : demoInfo.email,
      role: demoInfo.role,
      organizationId: org.id,
      branchId: dbUser?.branchId || undefined,
      departmentId: dbUser?.departmentId || undefined,
    };

    // Parse Intent
    const parsed = parseVoiceIntent(query || '');
    if (slots) {
      parsed.slots = { ...parsed.slots, ...slots };
    }

    // Execute
    const result = await executeVoiceCommand(parsed, appUser, confirmed);

    return NextResponse.json({
      success: true,
      parsed,
      result,
      user: { name: appUser.name, role: appUser.role },
    });
  } catch (error: any) {
    console.error('Error processing voice query:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal voice engine failure',
      },
      { status: 500 }
    );
  }
}
