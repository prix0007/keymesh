/**
 * @fileoverview Key management for Keymesh social recovery system
 * Handles key splitting, encryption, and recovery coordination
 */

import {
  hashPassword,
  hashBiometric,
  deriveGuardianKey,
  encryptData,
  decryptData,
  generateRandomKey,
  secureWipe,
  EncryptedBundle
} from '../crypto/encryption.js';
import { splitSecret, reconstructSecret, Share } from '../crypto/shamir.js';
import { generateRecoveryCode, parseRecoveryCode } from '../utils/recoveryCode.js';

export interface RecoverySetupConfig {
  masterKey: Uint8Array;              // 32 or 64 bytes
  password: string;
  biometricHash?: Uint8Array;         // Optional biometric data
  guardianAddresses: string[];        // 5 Ethereum addresses
}

export interface RecoveryConfig {
  recoveryCode: string;
  pieces: {
    password?: string;
    biometricHash?: Uint8Array;
    guardianSignatures?: string[];    // 3 of 5 required
  };
}

export interface EncryptedPiece {
  id: 'A' | 'B' | 'C';
  type: 'password' | 'biometric' | 'social';
  encryptedData: EncryptedBundle;
  size: number;
}

export interface RecoverySetupResult {
  pieces: EncryptedPiece[];           // 3 pieces
  recoveryCode: string;               // Base58 encoded
  metadata: RecoveryMetadata;
}

export interface RecoveryMetadata {
  userAddress?: string;
  guardianAddresses: string[];
  createdAt: number;
  version: number;
}

export interface DACommitment {
  blockNumber: number;
  txIndex: number;
  dataHash: string;
  merkleRoot: string;
}

export interface RecoveryResult {
  masterKey: Uint8Array;
  metadata: RecoveryMetadata;
  piecesUsed: ('A' | 'B' | 'C')[];
}

/**
 * Main setup function for social recovery
 * Splits the master key and encrypts pieces with different methods
 */
export async function setupRecovery(config: RecoverySetupConfig): Promise<RecoverySetupResult> {
  try {
    // Validate inputs
    if (!config.masterKey || (config.masterKey.length !== 32 && config.masterKey.length !== 64)) {
      throw new Error('Master key must be 32 or 64 bytes');
    }

    if (!config.password || config.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (!config.guardianAddresses || config.guardianAddresses.length !== 5) {
      throw new Error('Exactly 5 guardian addresses required');
    }

    // Validate Ethereum addresses
    for (const address of config.guardianAddresses) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        throw new Error(`Invalid Ethereum address: ${address}`);
      }
    }

    // Step 1: Split master key into 3 shares using Shamir Secret Sharing
    // Need any 2 of 3 pieces to recover
    const shares = splitSecret(config.masterKey, { shares: 3, threshold: 2 });

    // Step 2: Encrypt each piece with different methods
    const pieces: EncryptedPiece[] = [];

    // Piece A: Encrypted with password
    const passwordData = hashPassword(config.password);
    const pieceA = encryptData(shares[0].data, passwordData.hash);
    pieces.push({
      id: 'A',
      type: 'password',
      encryptedData: pieceA,
      size: shares[0].data.length
    });

    // Piece B: Encrypted with biometric (or fallback to generated key)
    let biometricKey: Uint8Array;
    if (config.biometricHash && config.biometricHash.length > 0) {
      biometricKey = hashBiometric(config.biometricHash);
    } else {
      // Generate a fallback key if no biometric provided
      biometricKey = generateRandomKey();
      console.warn('No biometric provided, using generated fallback key');
    }

    const pieceB = encryptData(shares[1].data, biometricKey);
    pieces.push({
      id: 'B',
      type: 'biometric',
      encryptedData: pieceB,
      size: shares[1].data.length
    });

    // Piece C: Encrypted with guardian multisig key
    const guardianKey = deriveGuardianKey(config.guardianAddresses);
    const pieceC = encryptData(shares[2].data, guardianKey);
    pieces.push({
      id: 'C',
      type: 'social',
      encryptedData: pieceC,
      size: shares[2].data.length
    });

    // Step 3: Create metadata
    const metadata: RecoveryMetadata = {
      guardianAddresses: config.guardianAddresses,
      createdAt: Date.now(),
      version: 1
    };

    // Step 4: Generate recovery code
    const recoveryCode = generateRecoveryCode(metadata, []);

    // Cleanup sensitive data
    secureWipe(passwordData.hash);
    secureWipe(biometricKey);
    secureWipe(guardianKey);
    shares.forEach(share => secureWipe(share.data));

    return {
      pieces,
      recoveryCode,
      metadata
    };

  } catch (error) {
    throw new Error(`Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main recovery function
 * Decrypts pieces and reconstructs the master key
 */
export async function recoverKey(config: RecoveryConfig): Promise<RecoveryResult> {
  try {
    // Parse recovery code to get metadata
    const { metadata } = parseRecoveryCode(config.recoveryCode);

    // Track which pieces we can decrypt
    const availablePieces: { piece: 'A' | 'B' | 'C', share: Share }[] = [];

    // Try to decrypt Piece A (password)
    if (config.pieces.password) {
      try {
        const passwordData = hashPassword(config.pieces.password);
        // Note: In real implementation, we'd fetch the encrypted piece from storage/DA
        // For now, this is a placeholder
        console.log('Would decrypt piece A with password');
        secureWipe(passwordData.hash);
      } catch (error) {
        console.warn('Failed to decrypt piece A:', error);
      }
    }

    // Try to decrypt Piece B (biometric)
    if (config.pieces.biometricHash) {
      try {
        const biometricKey = hashBiometric(config.pieces.biometricHash);
        // Note: In real implementation, we'd fetch the encrypted piece from storage/DA
        console.log('Would decrypt piece B with biometric');
        secureWipe(biometricKey);
      } catch (error) {
        console.warn('Failed to decrypt piece B:', error);
      }
    }

    // Try to decrypt Piece C (social/guardian)
    if (config.pieces.guardianSignatures && config.pieces.guardianSignatures.length >= 3) {
      try {
        const guardianKey = deriveGuardianKey(metadata.guardianAddresses);
        // Note: In real implementation, we'd verify guardian signatures first
        console.log('Would decrypt piece C with guardian signatures');
        secureWipe(guardianKey);
      } catch (error) {
        console.warn('Failed to decrypt piece C:', error);
      }
    }

    // Check if we have enough pieces (need 2 of 3)
    if (availablePieces.length < 2) {
      throw new Error(`Insufficient pieces for recovery. Have ${availablePieces.length}, need 2`);
    }

    // Reconstruct the master key using Shamir Secret Sharing
    const shares = availablePieces.slice(0, 2).map(item => item.share);
    const masterKey = reconstructSecret(shares);

    // Cleanup
    shares.forEach(share => secureWipe(share.data));

    return {
      masterKey,
      metadata,
      piecesUsed: availablePieces.slice(0, 2).map(item => item.piece)
    };

  } catch (error) {
    throw new Error(`Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt a specific piece with the provided key
 * @param encryptedPiece The encrypted piece to decrypt
 * @param key The decryption key
 * @returns The decrypted share data
 */
export function decryptPiece(encryptedPiece: EncryptedPiece, key: Uint8Array): Share {
  try {
    const decryptedData = decryptData(encryptedPiece.encryptedData, key);

    // The decrypted data should be a Shamir share
    // For simplicity, we're using the piece ID as the share ID
    const shareId = encryptedPiece.id === 'A' ? 1 : encryptedPiece.id === 'B' ? 2 : 3;

    return {
      id: shareId,
      data: decryptedData
    };
  } catch (error) {
    throw new Error(`Failed to decrypt piece ${encryptedPiece.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify recovery configuration before attempting recovery
 * @param config Recovery configuration to verify
 * @returns Validation result with details
 */
export function validateRecoveryConfig(config: RecoveryConfig): {
  isValid: boolean;
  availablePieces: ('A' | 'B' | 'C')[];
  errors: string[];
} {
  const errors: string[] = [];
  const availablePieces: ('A' | 'B' | 'C')[] = [];

  try {
    // Parse recovery code
    parseRecoveryCode(config.recoveryCode);
  } catch (error) {
    errors.push(`Invalid recovery code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check piece A (password)
  if (config.pieces.password) {
    if (config.pieces.password.length < 8) {
      errors.push('Password too short (minimum 8 characters)');
    } else {
      availablePieces.push('A');
    }
  }

  // Check piece B (biometric)
  if (config.pieces.biometricHash) {
    if (config.pieces.biometricHash.length < 16) {
      errors.push('Biometric hash too short (minimum 16 bytes)');
    } else {
      availablePieces.push('B');
    }
  }

  // Check piece C (guardian signatures)
  if (config.pieces.guardianSignatures) {
    if (config.pieces.guardianSignatures.length < 3) {
      errors.push('Insufficient guardian signatures (need 3 of 5)');
    } else {
      // In a real implementation, we'd verify the signatures here
      availablePieces.push('C');
    }
  }

  const isValid = errors.length === 0 && availablePieces.length >= 2;

  return {
    isValid,
    availablePieces,
    errors
  };
}

/**
 * Generate a test recovery setup for development/testing
 * @param password Test password
 * @returns Complete test setup
 */
export async function generateTestSetup(password: string = 'test-password-123'): Promise<{
  masterKey: Uint8Array;
  config: RecoverySetupConfig;
  result: RecoverySetupResult;
}> {
  const masterKey = generateRandomKey();
  const biometricHash = generateRandomKey().slice(0, 32); // Simulate biometric data

  // Generate test guardian addresses
  const guardianAddresses = Array.from({ length: 5 }, (_, i) =>
    `0x${'1'.repeat(40 - i.toString().length)}${i}`
  );

  const config: RecoverySetupConfig = {
    masterKey,
    password,
    biometricHash,
    guardianAddresses
  };

  const result = await setupRecovery(config);

  return {
    masterKey,
    config,
    result
  };
}

/**
 * Estimate the total size of encrypted pieces for storage planning
 * @param masterKeyLength Length of the master key in bytes
 * @returns Estimated storage requirements
 */
export function estimateStorageSize(masterKeyLength: number = 32): {
  pieceSize: number;
  totalSize: number;
  costEstimate: string;
} {
  // Each share will be approximately the same size as the master key
  // Plus encryption overhead (IV, tag, salt, version)
  const overhead = 12 + 16 + 32 + 4; // IV + tag + salt + version
  const pieceSize = masterKeyLength + overhead;
  const totalSize = pieceSize * 3;

  return {
    pieceSize,
    totalSize,
    costEstimate: `~$0.01-0.03 on Avail DA for ${totalSize} bytes`
  };
}