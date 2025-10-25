import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/lib/services/notificationService";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const notificationService = new NotificationService();

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (optional but recommended)
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000); // 6 months
    const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000); // 2 years

    // Find users inactive for more than 6 months but less than 2 years
    const inactiveUsers = await prisma.user.findMany({
      where: {
        lastHeartbeat: {
          lt: sixMonthsAgo,
          gt: twoYearsAgo,
        },
        // Only send warning once per month
        updatedAt: {
          lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last update more than 30 days ago
        },
      },
      select: {
        id: true,
        address: true,
        email: true,
        phone: true,
        lastHeartbeat: true,
      },
      take: 100, // Limit to prevent overwhelming the system
    });

    let warningsSent = 0;

    // Send heartbeat warnings
    for (const user of inactiveUsers) {
      const daysSinceLastHeartbeat = Math.floor((now.getTime() - user.lastHeartbeat.getTime()) / (1000 * 60 * 60 * 24));

      // Send email warning if user has email
      if (user.email) {
        const success = await notificationService.sendNotification({
          userId: user.id,
          type: "HEARTBEAT_WARNING",
          recipient: user.email,
          channel: "EMAIL",
          subject: "Keymesh Account Inactivity Warning",
          templateData: {
            address: user.address,
            daysSinceLastHeartbeat,
            lastHeartbeat: user.lastHeartbeat,
          },
        });

        if (success) {
          warningsSent++;
        }
      }

      // Send SMS warning if user has phone and no email
      if (!user.email && user.phone) {
        const success = await notificationService.sendNotification({
          userId: user.id,
          type: "HEARTBEAT_WARNING",
          recipient: user.phone,
          channel: "SMS",
          templateData: {
            address: user.address,
            daysSinceLastHeartbeat,
            lastHeartbeat: user.lastHeartbeat,
          },
        });

        if (success) {
          warningsSent++;
        }
      }

      // Update user's updatedAt to prevent sending multiple warnings
      await prisma.user.update({
        where: { id: user.id },
        data: { updatedAt: now },
      });
    }

    // Find users eligible for inheritance (inactive for 2+ years)
    const inheritanceEligibleUsers = await prisma.user.findMany({
      where: {
        lastHeartbeat: {
          lt: twoYearsAgo,
        },
      },
      select: {
        id: true,
        address: true,
        email: true,
        lastHeartbeat: true,
        guardians: {
          where: { status: "ACCEPTED" },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      take: 50,
    });

    let inheritanceNotificationsSent = 0;

    // Notify guardians about inheritance eligibility
    for (const user of inheritanceEligibleUsers) {
      const daysSinceLastHeartbeat = Math.floor((now.getTime() - user.lastHeartbeat.getTime()) / (1000 * 60 * 60 * 24));

      for (const guardian of user.guardians) {
        if (guardian.email) {
          const success = await notificationService.sendNotification({
            userId: user.id,
            guardianId: guardian.id,
            type: "HEARTBEAT_WARNING", // Could create a specific INHERITANCE_ELIGIBLE type
            recipient: guardian.email,
            channel: "EMAIL",
            subject: `Keymesh: Wallet ${user.address} eligible for inheritance`,
            templateData: {
              address: user.address,
              daysSinceLastHeartbeat,
              lastHeartbeat: user.lastHeartbeat,
              guardianName: guardian.name,
              isInheritanceEligible: true,
            },
          });

          if (success) {
            inheritanceNotificationsSent++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: {
        inactiveUsers: inactiveUsers.length,
        warningsSent,
        inheritanceEligibleUsers: inheritanceEligibleUsers.length,
        inheritanceNotificationsSent,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error in heartbeat cron job:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
