import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userOrResponse = await requireAuth(request);
  if (userOrResponse instanceof Response) {
    return userOrResponse;
  }

  try {
    const resolvedParams = await params;
    const guardianId = resolvedParams.id;

    // Verify the guardian belongs to the authenticated user
    const guardian = await prisma.guardian.findFirst({
      where: {
        id: guardianId,
        userId: userOrResponse.id,
      },
    });

    if (!guardian) {
      return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
    }

    // Check if there are any active recoveries
    const activeRecovery = await prisma.recovery.findFirst({
      where: {
        userId: userOrResponse.id,
        status: {
          in: ["INITIATED", "AWAITING_APPROVALS", "APPROVED"],
        },
      },
    });

    if (activeRecovery) {
      return NextResponse.json({ error: "Cannot remove guardian during active recovery" }, { status: 409 });
    }

    // Mark guardian as inactive instead of deleting
    const updatedGuardian = await prisma.guardian.update({
      where: { id: guardianId },
      data: { status: "INACTIVE" },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    return NextResponse.json({
      message: `Guardian ${updatedGuardian.name} has been removed`,
      guardian: updatedGuardian,
    });
  } catch (error) {
    console.error("Error removing guardian:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
