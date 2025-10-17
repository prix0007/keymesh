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
    const { userAddress, isEmergency, reason } = await request.json();

    if (!userAddress || typeof userAddress !== 'string') {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    const normalizedAddress = userAddress.toLowerCase();

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { address: normalizedAddress },
      include: {
        guardians: {
          where: { status: 'ACCEPTED' },
          select: {
            id: true,
            address: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if the requester is the user themselves or one of their guardians
    const isOwner = targetUser.address === userOrResponse.address;
    const isGuardian = targetUser.guardians.some(g => g.address === userOrResponse.address);

    if (!isOwner && !isGuardian) {
      return NextResponse.json(
        { error: 'Unauthorized to initiate recovery for this user' },
        { status: 403 }
      );
    }

    // Check if there's already an active recovery
    const existingRecovery = await prisma.recovery.findFirst({
      where: {
        userId: targetUser.id,
        status: {
          in: ['INITIATED', 'AWAITING_APPROVALS', 'APPROVED']
        }
      }
    });

    if (existingRecovery) {
      return NextResponse.json(
        { error: 'Recovery already in progress for this user' },
        { status: 409 }
      );
    }

    // Check if user has enough guardians
    if (targetUser.guardians.length < 3) {
      return NextResponse.json(
        { error: 'User must have at least 3 accepted guardians to initiate recovery' },
        { status: 400 }
      );
    }

    // Calculate unlock time (7 days for standard, 14 days for emergency)
    const delayDays = isEmergency ? 14 : 7;
    const unlockTime = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);

    // Create recovery record
    const recovery = await prisma.recovery.create({
      data: {
        userId: targetUser.id,
        status: 'INITIATED',
        isEmergency: Boolean(isEmergency),
        reason: reason || null,
        initiatedAt: new Date()
      },
      include: {
        user: {
          select: {
            address: true,
            email: true
          }
        },
        approvals: {
          include: {
            guardian: {
              select: {
                name: true,
                address: true
              }
            }
          }
        }
      }
    });

    // TODO: Send notifications to all guardians
    // This would be handled by the notification service
    // For each guardian in targetUser.guardians, send email/SMS about recovery request

    return NextResponse.json({
      recovery: {
        id: recovery.id,
        status: recovery.status,
        isEmergency: recovery.isEmergency,
        initiatedAt: recovery.initiatedAt,
        unlockTime: unlockTime,
        reason: recovery.reason,
        user: {
          address: recovery.user.address
        },
        approvals: recovery.approvals,
        approvalsRequired: 3,
        delayDays: delayDays
      },
      message: `Recovery initiated successfully. ${isEmergency ? 'Emergency' : 'Standard'} recovery will be available after ${delayDays} days with 3 guardian approvals.`
    });

  } catch (error) {
    console.error('Error initiating recovery:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}