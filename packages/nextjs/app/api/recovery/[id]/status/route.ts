import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userOrResponse = await requireAuth(request);
  if (userOrResponse instanceof Response) {
    return userOrResponse;
  }

  try {
    const resolvedParams = await params;
    const recoveryId = resolvedParams.id;

    // Find the recovery
    const recovery = await prisma.recovery.findUnique({
      where: { id: recoveryId },
      include: {
        user: {
          include: {
            guardians: {
              where: { status: "ACCEPTED" },
              select: {
                id: true,
                address: true,
                name: true,
                email: true,
              },
            },
          },
        },
        approvals: {
          include: {
            guardian: {
              select: {
                id: true,
                address: true,
                name: true,
              },
            },
          },
          orderBy: { approvedAt: "asc" },
        },
      },
    });

    if (!recovery) {
      return NextResponse.json({ error: "Recovery not found" }, { status: 404 });
    }

    // Check if user is authorized to view this recovery
    const isOwner = recovery.user.address === userOrResponse.address;
    const isGuardian = recovery.user.guardians.some((g: any) => g.address === userOrResponse.address);

    if (!isOwner && !isGuardian) {
      return NextResponse.json({ error: "Unauthorized to view this recovery" }, { status: 403 });
    }

    // Calculate timing information
    const delayDays = recovery.isEmergency ? 14 : 7;
    const unlockTime = new Date(recovery.initiatedAt.getTime() + delayDays * 24 * 60 * 60 * 1000);
    const timeRemaining = Math.max(0, unlockTime.getTime() - Date.now());
    const isDelayComplete = Date.now() >= unlockTime.getTime();

    // Calculate approval status
    const requiredApprovals = 3;
    const currentApprovals = recovery.approvals.length;
    const hasEnoughApprovals = currentApprovals >= requiredApprovals;

    // Check which guardians have/haven't approved
    const guardianStatus = recovery.user.guardians.map((guardian: any) => {
      const approval = recovery.approvals.find((a: any) => a.guardian.id === guardian.id);
      return {
        guardian: {
          id: guardian.id,
          name: guardian.name,
          address: guardian.address,
        },
        hasApproved: !!approval,
        approvedAt: approval?.approvedAt || null,
      };
    });

    const canFinalize = hasEnoughApprovals && isDelayComplete && ["APPROVED"].includes(recovery.status);

    return NextResponse.json({
      recovery: {
        id: recovery.id,
        status: recovery.status,
        isEmergency: recovery.isEmergency,
        reason: recovery.reason,
        initiatedAt: recovery.initiatedAt,
        completedAt: recovery.completedAt,
        cancelledAt: recovery.cancelledAt,
        user: {
          address: recovery.user.address,
        },
      },
      timing: {
        delayDays,
        unlockTime,
        timeRemaining,
        timeRemainingFormatted: formatTimeRemaining(timeRemaining),
        isDelayComplete,
        canFinalize,
      },
      approvals: {
        current: currentApprovals,
        required: requiredApprovals,
        hasEnoughApprovals,
        guardianStatus,
        approvalHistory: recovery.approvals.map((approval: any) => ({
          id: approval.id,
          guardian: approval.guardian,
          approvedAt: approval.approvedAt,
        })),
      },
      permissions: {
        isOwner,
        isGuardian,
        canApprove:
          isGuardian &&
          !guardianStatus.find((gs: any) => gs.guardian.address === userOrResponse.address)?.hasApproved &&
          ["INITIATED", "AWAITING_APPROVALS"].includes(recovery.status),
        canCancel: isOwner && ["INITIATED", "AWAITING_APPROVALS", "APPROVED"].includes(recovery.status),
        canFinalize: isOwner && canFinalize,
      },
    });
  } catch (error) {
    console.error("Error fetching recovery status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) {
    return "Delay period complete";
  }

  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days} day${days !== 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}, ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
}
