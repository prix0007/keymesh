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
    await availService.connect();

    // Get all submissions for this user
    const userData = await getUserDAData(availService, walletAddress);

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error fetching user DA data:", error);
    return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
  }
}

async function getUserDAData(availService: MockAvailService, walletAddress: string) {
  try {
    // Access the private db property to get user data
    const db = (availService as any).db;

    if (!db) {
      return { submissions: [], totalSize: 0, totalCost: 0 };
    }

    const stmt = db.prepare(`
      SELECT
        block_number,
        tx_index,
        data_hash,
        merkle_root,
        LENGTH(data) as data_size,
        metadata,
        timestamp
      FROM avail_submissions
      WHERE user_address = ?
      ORDER BY timestamp DESC
    `);

    const submissions = stmt.all(walletAddress);

    // Calculate total data size and estimated cost
    const totalSize = submissions.reduce((sum: number, sub: any) => sum + sub.data_size, 0);
    const estimatedCost = await availService.estimateSubmissionCost(totalSize);

    // Parse metadata for each submission
    const enrichedSubmissions = submissions.map((sub: any) => {
      let parsedMetadata = {};
      try {
        parsedMetadata = JSON.parse(sub.metadata);
      } catch (error) {
        console.error("Error parsing metadata:", error);
      }

      return {
        blockNumber: sub.block_number,
        txIndex: sub.tx_index,
        dataHash: sub.data_hash,
        merkleRoot: sub.merkle_root,
        dataSize: sub.data_size,
        timestamp: sub.timestamp, // Keep as timestamp number for proper serialization
        metadata: parsedMetadata,
      };
    });

    return {
      submissions: enrichedSubmissions,
      totalSize,
      totalCost: estimatedCost.cost,
      currency: estimatedCost.currency,
    };
  } catch (error) {
    console.error("Error getting user DA data:", error);
    return { submissions: [], totalSize: 0, totalCost: 0 };
  }
}
