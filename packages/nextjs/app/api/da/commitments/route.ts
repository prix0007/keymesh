import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const userOrResponse = await requireAuth(request);
  if (userOrResponse instanceof Response) {
    return userOrResponse;
  }

  try {
    const { commitments } = await request.json();

    if (!Array.isArray(commitments) || commitments.length === 0) {
      return NextResponse.json(
        { error: 'Commitments array is required' },
        { status: 400 }
      );
    }

    if (commitments.length !== 3) {
      return NextResponse.json(
        { error: 'Exactly 3 commitments required (for pieces A, B, C)' },
        { status: 400 }
      );
    }

    // Validate each commitment
    for (const commitment of commitments) {
      if (typeof commitment.pieceId !== 'number' || commitment.pieceId < 0 || commitment.pieceId > 2) {
        return NextResponse.json(
          { error: 'Invalid pieceId. Must be 0, 1, or 2' },
          { status: 400 }
        );
      }

      if (!commitment.blockNumber || !commitment.txIndex || !commitment.dataHash || !commitment.merkleRoot) {
        return NextResponse.json(
          { error: 'Missing required commitment fields: blockNumber, txIndex, dataHash, merkleRoot' },
          { status: 400 }
        );
      }

      // Validate blockNumber is a positive integer
      if (!Number.isInteger(commitment.blockNumber) || commitment.blockNumber <= 0) {
        return NextResponse.json(
          { error: 'Invalid blockNumber. Must be a positive integer' },
          { status: 400 }
        );
      }

      // Validate txIndex is a non-negative integer
      if (!Number.isInteger(commitment.txIndex) || commitment.txIndex < 0) {
        return NextResponse.json(
          { error: 'Invalid txIndex. Must be a non-negative integer' },
          { status: 400 }
        );
      }

      // Validate hash formats (should be hex strings)
      if (!/^0x[a-fA-F0-9]+$/.test(commitment.dataHash)) {
        return NextResponse.json(
          { error: 'Invalid dataHash format. Must be a hex string starting with 0x' },
          { status: 400 }
        );
      }

      if (!/^0x[a-fA-F0-9]+$/.test(commitment.merkleRoot)) {
        return NextResponse.json(
          { error: 'Invalid merkleRoot format. Must be a hex string starting with 0x' },
          { status: 400 }
        );
      }
    }

    // Check if piece IDs are unique
    const pieceIds = commitments.map(c => c.pieceId);
    const uniquePieceIds = new Set(pieceIds);
    if (uniquePieceIds.size !== 3) {
      return NextResponse.json(
        { error: 'Piece IDs must be unique (0, 1, 2)' },
        { status: 400 }
      );
    }

    // Check if user already has DA commitments
    const existingCommitments = await prisma.dACommitment.findMany({
      where: { userId: userOrResponse.id }
    });

    if (existingCommitments.length > 0) {
      return NextResponse.json(
        { error: 'User already has DA commitments. Use PUT to update.' },
        { status: 409 }
      );
    }

    // Create commitments in transaction
    const createdCommitments = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const commitment of commitments) {
        const created = await tx.dACommitment.create({
          data: {
            userId: userOrResponse.id,
            pieceId: commitment.pieceId,
            blockNumber: BigInt(commitment.blockNumber),
            txIndex: commitment.txIndex,
            dataHash: commitment.dataHash,
            merkleRoot: commitment.merkleRoot,
            timestamp: new Date()
          }
        });
        results.push(created);
      }

      return results;
    });

    // TODO: Call DARegistry smart contract to record commitments on-chain
    // This would store the block references on Arbitrum for verification

    const formattedCommitments = createdCommitments.map(commitment => ({
      id: commitment.id,
      pieceId: commitment.pieceId,
      blockNumber: commitment.blockNumber.toString(),
      txIndex: commitment.txIndex,
      dataHash: commitment.dataHash,
      merkleRoot: commitment.merkleRoot,
      timestamp: commitment.timestamp
    }));

    return NextResponse.json({
      commitments: formattedCommitments,
      message: 'DA commitments recorded successfully',
      totalPieces: formattedCommitments.length
    });

  } catch (error) {
    console.error('Error recording DA commitments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const userOrResponse = await requireAuth(request);
  if (userOrResponse instanceof Response) {
    return userOrResponse;
  }

  try {
    const commitments = await prisma.dACommitment.findMany({
      where: { userId: userOrResponse.id },
      orderBy: { pieceId: 'asc' }
    });

    const formattedCommitments = commitments.map(commitment => ({
      id: commitment.id,
      pieceId: commitment.pieceId,
      blockNumber: commitment.blockNumber.toString(),
      txIndex: commitment.txIndex,
      dataHash: commitment.dataHash,
      merkleRoot: commitment.merkleRoot,
      timestamp: commitment.timestamp
    }));

    return NextResponse.json({
      commitments: formattedCommitments,
      totalPieces: formattedCommitments.length,
      isComplete: formattedCommitments.length === 3
    });

  } catch (error) {
    console.error('Error fetching DA commitments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}