import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const userOrResponse = await requireAuth(request);
  if (userOrResponse instanceof Response) {
    return userOrResponse;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userOrResponse.id },
      include: {
        guardians: {
          select: {
            id: true,
            address: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            addedAt: true,
            acceptedAt: true
          },
          orderBy: { addedAt: 'asc' }
        },
        daCommitments: {
          select: {
            pieceId: true,
            blockNumber: true,
            txIndex: true,
            dataHash: true,
            merkleRoot: true,
            timestamp: true
          },
          orderBy: { pieceId: 'asc' }
        },
        recoveries: {
          where: {
            status: {
              in: ['INITIATED', 'AWAITING_APPROVALS', 'APPROVED']
            }
          },
          include: {
            approvals: {
              include: {
                guardian: {
                  select: {
                    id: true,
                    name: true,
                    address: true
                  }
                }
              }
            }
          },
          take: 1,
          orderBy: { initiatedAt: 'desc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        address: user.address,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastHeartbeat: user.lastHeartbeat,
        guardians: user.guardians,
        daCommitments: user.daCommitments,
        activeRecovery: user.recoveries[0] || null,
        isSetup: user.daCommitments.length === 3,
        guardiansSetup: user.guardians.filter(g => g.status === 'ACCEPTED').length >= 3
      }
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const userOrResponse = await requireAuth(request);
  if (userOrResponse instanceof Response) {
    return userOrResponse;
  }

  try {
    const { email, phone } = await request.json();

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone format if provided (basic validation)
    if (phone && !/^[+]?[1-9]\d{1,14}$/.test(phone.replace(/\s|-/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid phone format' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userOrResponse.id },
      data: {
        email: email || null,
        phone: phone || null,
        updatedAt: new Date()
      },
      select: {
        id: true,
        address: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        lastHeartbeat: true
      }
    });

    return NextResponse.json({
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}