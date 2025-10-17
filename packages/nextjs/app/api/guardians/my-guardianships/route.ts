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
    // Find all users where the authenticated user is a guardian
    const guardianships = await prisma.guardian.findMany({
      where: {
        address: userOrResponse.address,
        status: 'ACCEPTED'
      },
      include: {
        user: {
          select: {
            id: true,
            address: true,
            email: true,
            lastHeartbeat: true,
            createdAt: true,
            recoveries: {
              where: {
                status: {
                  in: ['INITIATED', 'AWAITING_APPROVALS', 'APPROVED']
                }
              },
              select: {
                id: true,
                status: true,
                isEmergency: true,
                initiatedAt: true,
                approvals: {
                  where: {
                    guardian: {
                      address: userOrResponse.address
                    }
                  },
                  select: {
                    id: true,
                    approvedAt: true,
                    signature: true
                  }
                }
              },
              take: 1,
              orderBy: { initiatedAt: 'desc' }
            }
          }
        }
      },
      orderBy: { addedAt: 'desc' }
    });

    const formattedGuardianships = guardianships.map(guardianship => ({
      guardianshipId: guardianship.id,
      user: {
        address: guardianship.user.address,
        email: guardianship.user.email,
        lastHeartbeat: guardianship.user.lastHeartbeat,
        createdAt: guardianship.user.createdAt,
        daysSinceLastHeartbeat: Math.floor(
          (Date.now() - guardianship.user.lastHeartbeat.getTime()) / (1000 * 60 * 60 * 24)
        )
      },
      guardianInfo: {
        name: guardianship.name,
        addedAt: guardianship.addedAt,
        acceptedAt: guardianship.acceptedAt
      },
      activeRecovery: guardianship.user.recoveries[0] || null,
      hasApproved: guardianship.user.recoveries[0]?.approvals.length > 0
    }));

    return NextResponse.json({
      guardianships: formattedGuardianships,
      total: formattedGuardianships.length,
      activeRecoveries: formattedGuardianships.filter(g => g.activeRecovery).length,
      pendingApprovals: formattedGuardianships.filter(
        g => g.activeRecovery && !g.hasApproved
      ).length
    });

  } catch (error) {
    console.error('Error fetching guardianships:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}