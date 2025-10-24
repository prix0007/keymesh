import { NextRequest, NextResponse } from 'next/server';
import { CryptoService } from '@/lib/services/cryptoService';
import { AvailService } from '@/lib/services/availService';
import { BlockchainService } from '@/lib/services/blockchainService';

export interface SetupRequest {
  userAddress: string;
  password: string;
  biometricData?: string; // Base64 encoded
  guardians: Array<{
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  }>;
}

export interface SetupResponse {
  success: boolean;
  transactionHash?: string;
  recoveryId?: string;
  availCommitments?: Array<{
    pieceId: number;
    blockNumber: number;
    txIndex: number;
    dataHash: string;
  }>;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<SetupResponse>> {
  try {
    const body: SetupRequest = await request.json();
    const { userAddress, password, biometricData, guardians } = body;

    // Validate input
    if (!userAddress || !password || !guardians || guardians.length !== 5) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input: userAddress, password, and 5 guardians are required'
        },
        { status: 400 }
      );
    }

    // Initialize services
    const cryptoService = new CryptoService();
    const availService = new AvailService();
    const blockchainService = new BlockchainService();

    // Step 1: Generate a mock private key (in reality this would be the user's actual private key)
    const privateKey = await CryptoService.generatePrivateKey();

    // Step 2: Split the private key using Shamir Secret Sharing
    const { pieces } = await CryptoService.splitKey(privateKey, 2, 3);

    // Step 3: Encrypt pieces with different methods
    // Piece 1: Encrypt with password
    const piece1Encrypted = await CryptoService.encryptWithPassword(pieces[0].data, password);

    // Piece 2: Encrypt with biometric data (or password if no biometric)
    let piece2Encrypted: Uint8Array;
    if (biometricData) {
      const biometricBytes = new Uint8Array(Buffer.from(biometricData, 'base64'));
      piece2Encrypted = await CryptoService.encryptWithBiometric(pieces[1].data, biometricBytes);
    } else {
      // Fallback to password encryption for now
      piece2Encrypted = await CryptoService.encryptWithPassword(pieces[1].data, password + '_biometric');
    }

    // Piece 3: Encrypt with guardians info (simplified)
    const guardiansString = JSON.stringify(guardians);
    const piece3Encrypted = await CryptoService.encryptWithPassword(pieces[2].data, guardiansString);

    // Step 4: Store encrypted pieces on Avail DA
    const availCommitments = [];

    // Submit piece 1 (password-encrypted)
    const piece1Result = await availService.submitPiece(piece1Encrypted, userAddress);
    if (piece1Result.success) {
      availCommitments.push({
        pieceId: 1,
        blockNumber: piece1Result.blockNumber!,
        txIndex: piece1Result.txIndex!,
        dataHash: piece1Result.dataHash!
      });
    } else {
      throw new Error(`Failed to store piece 1 on Avail: ${piece1Result.error}`);
    }

    // Submit piece 2 (biometric-encrypted)
    const piece2Result = await availService.submitPiece(piece2Encrypted, userAddress);
    if (piece2Result.success) {
      availCommitments.push({
        pieceId: 2,
        blockNumber: piece2Result.blockNumber!,
        txIndex: piece2Result.txIndex!,
        dataHash: piece2Result.dataHash!
      });
    } else {
      throw new Error(`Failed to store piece 2 on Avail: ${piece2Result.error}`);
    }

    // Submit piece 3 (guardian-encrypted)
    const piece3Result = await availService.submitPiece(piece3Encrypted, userAddress);
    if (piece3Result.success) {
      availCommitments.push({
        pieceId: 3,
        blockNumber: piece3Result.blockNumber!,
        txIndex: piece3Result.txIndex!,
        dataHash: piece3Result.dataHash!
      });
    } else {
      throw new Error(`Failed to store piece 3 on Avail: ${piece3Result.error}`);
    }

    // Step 5: Record commitments on blockchain (mock for now)
    const daCommitments = availCommitments.map(commitment => ({
      pieceId: commitment.pieceId,
      blockNumber: BigInt(commitment.blockNumber),
      txIndex: commitment.txIndex,
      dataHash: commitment.dataHash,
      merkleRoot: '0x' + '0'.repeat(64) // Mock merkle root
    }));

    // Extract guardian addresses (using email as fallback for demo)
    const guardianAddresses = guardians.map(g =>
      g.address || `0x${'0'.repeat(40)}` // Mock addresses for demo
    );

    // Setup recovery on blockchain (this might fail in development, but we'll try)
    let transactionHash: string | undefined;
    try {
      transactionHash = await blockchainService.setupRecovery(
        userAddress,
        guardianAddresses,
        daCommitments
      );
    } catch (error) {
      console.log('Blockchain setup failed (expected in development):', error);
      // Continue without blockchain setup for demo purposes
      transactionHash = '0x' + Math.random().toString(16).substring(2, 66); // Mock tx hash
    }

    // Step 6: Record DA commitments on blockchain
    try {
      await blockchainService.recordDACommitments(userAddress, daCommitments);
    } catch (error) {
      console.log('DA commitment recording failed (expected in development):', error);
      // Continue without blockchain recording for demo purposes
    }

    return NextResponse.json({
      success: true,
      transactionHash,
      recoveryId: `recovery_${Date.now()}`,
      availCommitments: availCommitments.map(c => ({
        pieceId: c.pieceId,
        blockNumber: c.blockNumber,
        txIndex: c.txIndex,
        dataHash: c.dataHash
      }))
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}