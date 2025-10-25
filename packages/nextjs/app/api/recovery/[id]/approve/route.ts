import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { verifyMessage } from "viem";

const prisma = new PrismaClient();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userOrResponse = await requireAuth(request);
  if (userOrResponse instanceof Response) {
    return userOrResponse;
  }

  try {
    const { signature, message } = await request.json();
    const resolvedParams = await params;
    const recoveryId = resolvedParams.id;

    if (!signature || !message) {
      return NextResponse.json({ error: "Signature and message are required" }, { status: 400 });
    }

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
        },
      },
    });

    if (!recovery) {
      return NextResponse.json({ error: "Recovery not found" }, { status: 404 });
    }

    if (recovery.status !== "INITIATED" && recovery.status !== "AWAITING_APPROVALS") {
      return NextResponse.json({ error: "Recovery is not in a state that allows approvals" }, { status: 400 });
    }

    // Check if the user is a guardian for this recovery
    const guardian = recovery.user.guardians.find((g: any) => g.address === userOrResponse.address);
    if (!guardian) {
      return NextResponse.json({ error: "You are not a guardian for this user" }, { status: 403 });
    }

    // Check if guardian has already approved
    const existingApproval = recovery.approvals.find((a: any) => a.guardian.id === guardian.id);
    if (existingApproval) {
      return NextResponse.json({ error: "You have already approved this recovery" }, { status: 409 });
    }

    // Verify the signature
    const expectedMessage = `I approve the recovery request for wallet ${recovery.user.address}\nRecovery ID: ${recovery.id}\nTimestamp: ${Date.now()}`;

    let isValid = false;
    try {
      isValid = await verifyMessage({
        address: userOrResponse.address as `0x${string}`,
        message: expectedMessage,
        signature: signature as `0x${string}`,
      });
    } catch (error) {
      console.error("Signature verification error:", error);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Create the approval
    const approval = await prisma.recoveryApproval.create({
      data: {
        recoveryId: recovery.id,
        guardianId: guardian.id,
        signature: signature,
        message: expectedMessage,
        approvedAt: new Date(),
      },
      include: {
        guardian: {
          select: {
            name: true,
            address: true,
          },
        },
      },
    });

    // Check if we have enough approvals (3 out of 5)
    const totalApprovals = recovery.approvals.length + 1; // Include the new approval
    const requiredApprovals = 3;

    if (totalApprovals >= requiredApprovals) {
      // Update recovery status to APPROVED
      await prisma.recovery.update({
        where: { id: recovery.id },
        data: { status: "APPROVED" },
        include: {
          user: {
            select: {
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
                },
              },
            },
          },
        },
      });
    } else if (recovery.status === "INITIATED") {
      // Update status to AWAITING_APPROVALS
      await prisma.recovery.update({
        where: { id: recovery.id },
        data: { status: "AWAITING_APPROVALS" },
      });
    }

    // TODO: Send notification to user about approval
    // TODO: If approved, send notification about ability to finalize after delay

    const canFinalize = totalApprovals >= requiredApprovals;
    const delayDays = recovery.isEmergency ? 14 : 7;
    const unlockTime = new Date(recovery.initiatedAt.getTime() + delayDays * 24 * 60 * 60 * 1000);

    return NextResponse.json({
      approval: {
        id: approval.id,
        approvedAt: approval.approvedAt,
        guardian: approval.guardian,
      },
      recovery: {
        id: recovery.id,
        status: canFinalize ? "APPROVED" : "AWAITING_APPROVALS",
        totalApprovals: totalApprovals,
        requiredApprovals: requiredApprovals,
        canFinalize: canFinalize && Date.now() >= unlockTime.getTime(),
        unlockTime: unlockTime,
        timeRemaining: Math.max(0, unlockTime.getTime() - Date.now()),
      },
      message: canFinalize
        ? `Recovery approved! Can be finalized after ${delayDays}-day delay.`
        : `Approval recorded. ${requiredApprovals - totalApprovals} more approvals needed.`,
    });
  } catch (error) {
    console.error("Error approving recovery:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
