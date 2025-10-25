import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest, { params }: { params: Promise<{ pieceId: string }> }) {
  const userOrResponse = await requireAuth(request);
  if (userOrResponse instanceof Response) {
    return userOrResponse;
  }

  try {
    const resolvedParams = await params;
    const pieceIdParam = resolvedParams.pieceId;
    const pieceId = parseInt(pieceIdParam);

    // Validate pieceId
    if (isNaN(pieceId) || pieceId < 0 || pieceId > 2) {
      return NextResponse.json({ error: "Invalid pieceId. Must be 0, 1, or 2" }, { status: 400 });
    }

    // Check if user has an active recovery or is authorized to retrieve pieces
    // TODO: Uncomment and use for production access control
    // const activeRecovery = await prisma.recovery.findFirst({
    //   where: {
    //     userId: userOrResponse.id,
    //     status: {
    //       in: ["APPROVED", "COMPLETED"],
    //     },
    //   },
    //   orderBy: { initiatedAt: "desc" },
    //   take: 1,
    // });

    // For now, allow piece retrieval if user is authenticated and owns the pieces
    // In production, you might want to restrict this to only during active recovery
    const allowRetrieval = true;

    if (!allowRetrieval) {
      return NextResponse.json({ error: "Piece retrieval only allowed during active recovery" }, { status: 403 });
    }

    // Find the DA commitment for this piece
    const commitment = await prisma.dACommitment.findFirst({
      where: {
        userId: userOrResponse.id,
        pieceId: pieceId,
      },
    });

    if (!commitment) {
      return NextResponse.json({ error: `No DA commitment found for piece ${pieceId}` }, { status: 404 });
    }

    // TODO: Fetch piece from Avail DA using block reference
    // This would use the Avail client to retrieve data from the specified block and transaction
    // For now, we'll simulate this with a mock response

    const mockEncryptedPieceData = await fetchFromAvailDA(
      commitment.blockNumber.toString(),
      commitment.txIndex,
    );

    if (!mockEncryptedPieceData) {
      return NextResponse.json({ error: "Failed to retrieve piece from Avail DA" }, { status: 500 });
    }

    // Verify the retrieved data against the stored hash
    // TODO: Implement actual hash verification
    const isValid = await verifyPieceIntegrity();

    if (!isValid) {
      return NextResponse.json({ error: "Retrieved piece failed integrity check" }, { status: 500 });
    }

    return NextResponse.json({
      pieceId: commitment.pieceId,
      data: mockEncryptedPieceData, // Base64 encoded encrypted piece
      commitment: {
        blockNumber: commitment.blockNumber.toString(),
        txIndex: commitment.txIndex,
        dataHash: commitment.dataHash,
        merkleRoot: commitment.merkleRoot,
        timestamp: commitment.timestamp,
      },
      verified: isValid,
      message: `Successfully retrieved piece ${pieceId} from Avail DA`,
    });
  } catch (error) {
    console.error("Error retrieving piece from DA:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Mock function to simulate fetching from Avail DA
async function fetchFromAvailDA(blockNumber: string, txIndex: number): Promise<string | null> {
  try {
    // TODO: Replace with actual Avail client implementation
    // const availClient = createAvailClient();
    // const blockData = await availClient.getBlock(blockNumber);
    // const txData = blockData.transactions[txIndex];
    // return txData.data;

    // Mock encrypted piece data (Base64 encoded)
    const mockData = Buffer.from(`encrypted_piece_data_for_block_${blockNumber}_tx_${txIndex}`, "utf8").toString(
      "base64",
    );

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return mockData;
  } catch (error) {
    console.error("Error fetching from Avail DA:", error);
    return null;
  }
}

// Mock function to verify piece integrity
async function verifyPieceIntegrity(): Promise<boolean> {
  try {
    // TODO: Implement actual hash verification
    // const crypto = require('crypto');
    // const hash = crypto.createHash('sha256').update(pieceData).digest('hex');
    // return `0x${hash}` === expectedHash;

    // For now, always return true for mock data
    return true;
  } catch (error) {
    console.error("Error verifying piece integrity:", error);
    return false;
  }
}
