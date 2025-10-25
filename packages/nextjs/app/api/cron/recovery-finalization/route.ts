import { NextRequest, NextResponse } from "next/server";
import { BlockchainService } from "@/lib/services/blockchainService";
import { NotificationService } from "@/lib/services/notificationService";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const blockchainService = new BlockchainService();
const notificationService = new NotificationService();

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (optional but recommended)
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find recoveries that are approved and past their delay period
    const readyRecoveries = await prisma.recovery.findMany({
      where: {
        status: "APPROVED",
      },
      include: {
        user: {
          select: {
            id: true,
            address: true,
            email: true,
            phone: true,
          },
        },
        approvals: {
          include: {
            guardian: {
              select: {
                id: true,
                name: true,
                email: true,
                address: true,
              },
            },
          },
        },
      },
      take: 50, // Limit to prevent overwhelming the system
    });

    let finalizationsProcessed = 0;
    let finalizationErrors = 0;

    for (const recovery of readyRecoveries) {
      try {
        // Calculate delay period
        const delayDays = recovery.isEmergency ? 14 : 7;
        const unlockTime = new Date(recovery.initiatedAt.getTime() + delayDays * 24 * 60 * 60 * 1000);

        // Check if delay period has passed
        if (now < unlockTime) {
          continue; // Skip if delay period hasn't passed
        }

        // Check if we have enough approvals (3 of 5)
        const requiredApprovals = 3;
        if (recovery.approvals.length < requiredApprovals) {
          continue; // Skip if not enough approvals
        }

        // Auto-finalize the recovery
        const updatedRecovery = await prisma.recovery.update({
          where: { id: recovery.id },
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
                    email: true,
                    address: true,
                  },
                },
              },
            },
          },
        });

        // Call smart contract finalization
        try {
          const txHash = await blockchainService.finalizeRecovery(recovery.user.address);
          console.log(`Recovery finalized on blockchain: ${txHash}`);
        } catch (blockchainError) {
          console.error("Error finalizing recovery on blockchain:", blockchainError);
          // Continue with database finalization even if blockchain fails
        }

        // Send notification to user about completion
        if (recovery.user.email) {
          await notificationService.sendNotification({
            userId: recovery.user.id,
            type: "RECOVERY_COMPLETED",
            recipient: recovery.user.email,
            channel: "EMAIL",
            subject: "Your Keymesh recovery has been completed",
            templateData: {
              address: recovery.user.address,
              recoveryId: recovery.id,
              isEmergency: recovery.isEmergency,
              completedAt: now,
              totalApprovals: recovery.approvals.length,
              daCommitments: updatedRecovery.user.daCommitments,
            },
          });
        }

        // Send notifications to all guardians who approved
        for (const approval of recovery.approvals) {
          if (approval.guardian.email) {
            await notificationService.sendNotification({
              userId: recovery.user.id,
              guardianId: approval.guardian.id,
              type: "RECOVERY_COMPLETED",
              recipient: approval.guardian.email,
              channel: "EMAIL",
              subject: "Recovery you approved has been completed",
              templateData: {
                address: recovery.user.address,
                recoveryId: recovery.id,
                guardianName: approval.guardian.name,
                completedAt: now,
              },
            });
          }
        }

        finalizationsProcessed++;
      } catch (error) {
        console.error(`Error finalizing recovery ${recovery.id}:`, error);
        finalizationErrors++;

        // Mark recovery as failed
        await prisma.recovery.update({
          where: { id: recovery.id },
          data: {
            status: "FAILED",
            completedAt: now,
          },
        });
      }
    }

    // Clean up old recoveries (completed/cancelled more than 30 days ago)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const cleanupResult = await prisma.recovery.updateMany({
      where: {
        status: {
          in: ["COMPLETED", "CANCELLED", "FAILED"],
        },
        OR: [{ completedAt: { lt: thirtyDaysAgo } }, { cancelledAt: { lt: thirtyDaysAgo } }],
      },
      data: {
        // Could add an 'archived' field or move to separate table
        // For now, we'll just leave them as is
      },
    });

    return NextResponse.json({
      success: true,
      processed: {
        totalRecoveriesChecked: readyRecoveries.length,
        finalizationsProcessed,
        finalizationErrors,
        oldRecordsFound: cleanupResult.count,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error in recovery finalization cron job:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
