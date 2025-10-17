import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface GuardianInviteToken {
  guardianId: string;
  email?: string;
  phone?: string;
  exp: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { address } = await request.json();
    const token = params.token;

    // Verify the invitation token
    let decoded: GuardianInviteToken;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as GuardianInviteToken;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 401 }
      );
    }

    // Validate address format if provided
    if (address && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Find the guardian
    const guardian = await prisma.guardian.findUnique({
      where: { id: decoded.guardianId },
      include: {
        user: {
          select: {
            address: true,
            email: true
          }
        }
      }
    });

    if (!guardian) {
      return NextResponse.json(
        { error: 'Guardian invitation not found' },
        { status: 404 }
      );
    }

    if (guardian.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Guardian invitation has already been processed' },
        { status: 409 }
      );
    }

    // Update guardian status and optionally set address
    const updatedGuardian = await prisma.guardian.update({
      where: { id: guardian.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        address: address?.toLowerCase() || guardian.address
      },
      include: {
        user: {
          select: {
            address: true,
            email: true
          }
        }
      }
    });

    // TODO: Send notification to user about guardian acceptance
    // This would be handled by the notification service

    return NextResponse.json({
      message: 'Guardian invitation accepted successfully',
      guardian: {
        id: updatedGuardian.id,
        name: updatedGuardian.name,
        status: updatedGuardian.status,
        acceptedAt: updatedGuardian.acceptedAt,
        protectedUser: {
          address: updatedGuardian.user.address
        }
      }
    });

  } catch (error) {
    console.error('Error accepting guardian invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // Verify the invitation token
    let decoded: GuardianInviteToken;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as GuardianInviteToken;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 401 }
      );
    }

    // Find the guardian and user info
    const guardian = await prisma.guardian.findUnique({
      where: { id: decoded.guardianId },
      include: {
        user: {
          select: {
            address: true,
            email: true
          }
        }
      }
    });

    if (!guardian) {
      return NextResponse.json(
        { error: 'Guardian invitation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      guardian: {
        name: guardian.name,
        status: guardian.status,
        addedAt: guardian.addedAt,
        acceptedAt: guardian.acceptedAt
      },
      user: {
        address: guardian.user.address
      },
      isExpired: Date.now() > decoded.exp * 1000,
      canAccept: guardian.status === 'PENDING'
    });

  } catch (error) {
    console.error('Error fetching guardian invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}