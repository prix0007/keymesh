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

    // Find the recovery with all related data
    const recovery = await prisma.recovery.findUnique({
      where: { id: recoveryId },
      include: {
        user: {
          include: {
            daCommitments: {
              orderBy: { pieceId: "asc" },
            },
            guardians: {
              where: { status: "ACCEPTED" },
            },
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

    if (!recovery) {
      return NextResponse.json({ error: "Recovery not found" }, { status: 404 });
    }

    // Check if the user is the owner or a system call
    const isOwner = recovery.user.address === userOrResponse.address;

    if (!isOwner) {
      return NextResponse.json({ error: "Only the wallet owner can finalize recovery" }, { status: 403 });
    }

    // Check if recovery is in the right state
    if (recovery.status !== "APPROVED") {
      return NextResponse.json({ error: "Recovery must be approved before finalization" }, { status: 400 });
    }

    // Check if we have enough approvals
    const requiredApprovals = 3;
    const currentApprovals = recovery.approvals.length;

    if (currentApprovals < requiredApprovals) {
      return NextResponse.json(
        { error: `Insufficient approvals. Need ${requiredApprovals}, have ${currentApprovals}` },
        { status: 400 },
      );
    }

    // Check if delay period has passed
    const delayDays = recovery.isEmergency ? 14 : 7;
    const unlockTime = new Date(recovery.initiatedAt.getTime() + delayDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    if (now < unlockTime) {
      const timeRemaining = unlockTime.getTime() - now.getTime();
      const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));

      return NextResponse.json(
        { error: `Delay period not complete. ${hoursRemaining} hours remaining.` },
        { status: 400 },
      );
    }

    // Check if user has DA commitments
    if (recovery.user.daCommitments.length !== 3) {
      return NextResponse.json({ error: "User does not have complete DA commitments for recovery" }, { status: 400 });
    }

    // Update recovery status to completed
    const completedRecovery = await prisma.recovery.update({
      where: { id: recoveryId },
      data: {
        status: "COMPLETED",
        completedAt: now,
      },
      include: {
        user: {
          include: {
            daCommitments: {
              orderBy: { pieceId: "asc" },
            },
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

    // TODO: Call smart contract finalization function
    // This would mark the recovery as completed on-chain

    // Return DA block references for piece retrieval
    const daReferences = completedRecovery.user.daCommitments.map((commitment: any) => ({
      pieceId: commitment.pieceId,
      blockNumber: commitment.blockNumber.toString(),
      txIndex: commitment.txIndex,
      dataHash: commitment.dataHash,
      merkleRoot: commitment.merkleRoot,
    }));

    // TODO: Send notifications to all parties about completion

    return NextResponse.json({
      recovery: {
        id: completedRecovery.id,
        status: completedRecovery.status,
        isEmergency: completedRecovery.isEmergency,
        initiatedAt: completedRecovery.initiatedAt,
        completedAt: completedRecovery.completedAt,
        user: {
          address: completedRecovery.user.address,
        },
        approvals: completedRecovery.approvals.map((approval: any) => ({
          guardian: approval.guardian,
          approvedAt: approval.approvedAt,
        })),
      },
      daReferences,
      message: "Recovery has been finalized successfully. You can now retrieve your encrypted pieces from Avail DA.",
      nextSteps: [
        "Use the DA references to retrieve encrypted pieces from Avail",
        "Decrypt the pieces using your available authentication methods",
        "Reconstruct your private key using Shamir Secret Sharing",
        "Restore wallet access",
      ],
    });
  } catch (error) {
    console.error("Error finalizing recovery:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
