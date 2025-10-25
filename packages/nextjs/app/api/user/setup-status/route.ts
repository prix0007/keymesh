import { NextRequest, NextResponse } from "next/server";
import { MockAvailService } from "@/lib/services/mockAvailService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("address");

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    const availService = new MockAvailService();

    // Check if user has any stored pieces (indicating completed setup)
    // We'll query the database to see if this wallet address has any submissions
    const hasSetup = await checkUserSetupStatus(availService, walletAddress);

    return NextResponse.json({
      hasSetup,
      walletAddress,
    });
  } catch (error) {
    console.error("Error checking user setup status:", error);
    return NextResponse.json({ error: "Failed to check setup status" }, { status: 500 });
  }
}

async function checkUserSetupStatus(availService: MockAvailService, walletAddress: string): Promise<boolean> {
  try {
    // Connect to the service
    await availService.connect();

    // Access the private db property to check for user data
    // Note: In production, this would be a proper service method
    const db = (availService as any).db;

    if (!db) {
      return false;
    }

    const stmt = db.prepare("SELECT COUNT(*) as count FROM avail_submissions WHERE user_address = ?");
    const result = stmt.get(walletAddress) as any;

    return result.count > 0;
  } catch (error) {
    console.error("Error checking setup status:", error);
    return false;
  }
}
