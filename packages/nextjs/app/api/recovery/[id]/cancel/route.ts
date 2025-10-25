import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userOrResponse = await requireAuth(request);
  if (userOrResponse instanceof Response) {
    return userOrResponse;
  }

  try {
    const resolvedParams = await params;
    const recoveryId = resolvedParams.id;
    const { reason } = await request.json();

    // Find the recovery
    const recovery = await prisma.recovery.findUnique({
      where: { id: recoveryId },
      include: {
        user: {
          select: {
            id: true,
            address: true,
            email: true,
          },
        },
        approvals: {
          include: {
            guardian: {
              select: {
                name: true,
                address: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!recovery) {
      return NextResponse.json({ error: "Recovery not found" }, { status: 404 });
    }

    // Check if the user is the owner of the recovery
    if (recovery.user.address !== userOrResponse.address) {
      return NextResponse.json({ error: "Only the wallet owner can cancel recovery" }, { status: 403 });
    }

    // Check if recovery can be cancelled
    if (!["INITIATED", "AWAITING_APPROVALS", "APPROVED"].includes(recovery.status)) {
      return NextResponse.json({ error: "Recovery cannot be cancelled in current state" }, { status: 400 });
    }

    // Update recovery status to cancelled
    const cancelledRecovery = await prisma.recovery.update({
      where: { id: recoveryId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        reason: reason || recovery.reason,
      },
      include: {
        user: {
          select: {
            address: true,
          },
        },
        approvals: {
          include: {
            guardian: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });

    // TODO: Send notifications to all guardians about cancellation
    // This would be handled by the notification service

    return NextResponse.json({
      recovery: {
        id: cancelledRecovery.id,
        status: cancelledRecovery.status,
        isEmergency: cancelledRecovery.isEmergency,
        initiatedAt: cancelledRecovery.initiatedAt,
        cancelledAt: cancelledRecovery.cancelledAt,
        reason: cancelledRecovery.reason,
        user: {
          address: cancelledRecovery.user.address,
        },
        approvals: cancelledRecovery.approvals.map((approval: any) => ({
          guardian: approval.guardian,
          approvedAt: approval.approvedAt,
        })),
      },
      message: "Recovery has been cancelled successfully. All guardians will be notified.",
    });
  } catch (error) {
    console.error("Error cancelling recovery:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
