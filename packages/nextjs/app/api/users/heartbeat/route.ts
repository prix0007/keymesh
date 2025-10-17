import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const userOrResponse = await requireAuth(request);
  if (userOrResponse instanceof Response) {
    return userOrResponse;
  }

  try {
    const now = new Date();

    // Update user's heartbeat timestamp
    const updatedUser = await prisma.user.update({
      where: { id: userOrResponse.id },
      data: {
        lastHeartbeat: now,
        updatedAt: now
      },
      select: {
        id: true,
        address: true,
        lastHeartbeat: true
      }
    });

    // TODO: Also call smart contract heartbeat function
    // This would require setting up blockchain service
    // For now, we just update the database

    return NextResponse.json({
      success: true,
      timestamp: updatedUser.lastHeartbeat,
      message: 'Heartbeat updated successfully'
    });

  } catch (error) {
    console.error('Error updating heartbeat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}