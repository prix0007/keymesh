/**
 * @fileoverview Recovery code generation and parsing for Keymesh
 * Creates QR-friendly recovery codes that contain metadata and DA references
 */

import bs58 from 'bs58';
import { RecoveryMetadata, DACommitment } from '../core/keyManager.js';

export interface RecoveryCodeData {
  metadata: RecoveryMetadata;
  daCommitments: DACommitment[];
}

export interface ParsedRecoveryCode {
  metadata: RecoveryMetadata;
  daCommitments: DACommitment[];
  rawData: Uint8Array;
}

/**
 * Generate a recovery code containing metadata and DA commitments
 * @param metadata Recovery metadata
 * @param daCommitments Array of DA commitments for the 3 pieces
 * @returns Base58 encoded recovery code
 */
export function generateRecoveryCode(
  metadata: RecoveryMetadata,
  daCommitments: DACommitment[]
): string {
  try {
    // Validate input
    if (!metadata.guardianAddresses || metadata.guardianAddresses.length === 0) {
      throw new Error('At least one guardian address is required');
    }

    // Create the recovery code data structure
    const codeData: RecoveryCodeData = {
      metadata,
      daCommitments
    };

    // Serialize to bytes
    const serialized = serializeRecoveryCode(codeData);

    // Encode as Base58 for QR code compatibility
    const encoded = bs58.encode(serialized);

    // Add Keymesh prefix for recognition
    return `keymesh:${encoded}`;

  } catch (error) {
    throw new Error(`Failed to generate recovery code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse a recovery code to extract metadata and DA commitments
 * @param recoveryCode The recovery code string
 * @returns Parsed recovery code data
 */
export function parseRecoveryCode(recoveryCode: string): ParsedRecoveryCode {
  try {
    // Check for Keymesh prefix
    if (!recoveryCode.startsWith('keymesh:')) {
      throw new Error('Invalid recovery code format: missing keymesh prefix');
    }

    // Remove prefix and decode Base58
    const encoded = recoveryCode.slice(8); // Remove "keymesh:"
    const decoded = bs58.decode(encoded);

    // Deserialize the data
    const codeData = deserializeRecoveryCode(decoded);

    return {
      metadata: codeData.metadata,
      daCommitments: codeData.daCommitments,
      rawData: decoded
    };

  } catch (error) {
    throw new Error(`Failed to parse recovery code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Serialize recovery code data to bytes
 * @param data Recovery code data to serialize
 * @returns Serialized bytes
 */
function serializeRecoveryCode(data: RecoveryCodeData): Uint8Array {
  // Generate random nonce for security (to make codes different each time)
  const nonce = new Uint8Array(4);
  crypto.getRandomValues(nonce);

  // Calculate required buffer size
  const guardianAddressesBytes = data.metadata.guardianAddresses.length * 20; // 20 bytes per address
  const userAddressBytes = data.metadata.userAddress ? 20 : 0;
  const commitmentBytes = data.daCommitments.length * (4 + 4 + 32 + 32); // blockNumber + txIndex + dataHash + merkleRoot

  const totalSize =
    1 + // version
    4 + // random nonce
    8 + // createdAt timestamp
    1 + // guardian count
    guardianAddressesBytes +
    1 + // user address flag
    userAddressBytes +
    1 + // commitment count
    commitmentBytes;


  const buffer = new Uint8Array(totalSize);
  let offset = 0;

  // Write version
  buffer[offset++] = data.metadata.version;

  // Write random nonce
  buffer.set(nonce, offset);
  offset += 4;

  // Write timestamp (8 bytes, big-endian)
  const timestamp = data.metadata.createdAt;
  // Write timestamp manually to avoid DataView issues
  const timestampHigh = Math.floor(timestamp / 0x100000000);
  const timestampLow = timestamp >>> 0;

  // Write high 32 bits
  buffer[offset++] = (timestampHigh >>> 24) & 0xFF;
  buffer[offset++] = (timestampHigh >>> 16) & 0xFF;
  buffer[offset++] = (timestampHigh >>> 8) & 0xFF;
  buffer[offset++] = timestampHigh & 0xFF;

  // Write low 32 bits
  buffer[offset++] = (timestampLow >>> 24) & 0xFF;
  buffer[offset++] = (timestampLow >>> 16) & 0xFF;
  buffer[offset++] = (timestampLow >>> 8) & 0xFF;
  buffer[offset++] = timestampLow & 0xFF;

  // Write guardian addresses
  buffer[offset++] = data.metadata.guardianAddresses.length;
  for (const address of data.metadata.guardianAddresses) {
    const addressBytes = hexToBytes(address);
    buffer.set(addressBytes, offset);
    offset += 20;
  }

  // Write user address (optional)
  if (data.metadata.userAddress) {
    buffer[offset++] = 1; // User address present
    const userAddressBytes = hexToBytes(data.metadata.userAddress);
    buffer.set(userAddressBytes, offset);
    offset += 20;
  } else {
    buffer[offset++] = 0; // No user address
  }

  // Write DA commitments
  buffer[offset++] = data.daCommitments.length;
  for (const commitment of data.daCommitments) {
    // Block number (4 bytes, big-endian)
    for (let i = 3; i >= 0; i--) {
      buffer[offset++] = (commitment.blockNumber >> (i * 8)) & 0xFF;
    }

    // Transaction index (4 bytes, big-endian)
    for (let i = 3; i >= 0; i--) {
      buffer[offset++] = (commitment.txIndex >> (i * 8)) & 0xFF;
    }

    // Data hash (32 bytes)
    const dataHashBytes = hexToBytes(commitment.dataHash);
    buffer.set(dataHashBytes, offset);
    offset += 32;

    // Merkle root (32 bytes)
    const merkleRootBytes = hexToBytes(commitment.merkleRoot);
    buffer.set(merkleRootBytes, offset);
    offset += 32;
  }

  return buffer;
}

/**
 * Deserialize recovery code data from bytes
 * @param data Serialized recovery code bytes
 * @returns Deserialized recovery code data
 */
function deserializeRecoveryCode(data: Uint8Array): RecoveryCodeData {
  let offset = 0;

  if (data.length < 15) { // Minimum size check (updated for nonce)
    throw new Error('Recovery code data too short');
  }

  // Read version
  const version = data[offset++];
  if (version !== 1) {
    throw new Error(`Unsupported recovery code version: ${version}`);
  }

  // Skip random nonce (4 bytes) - we don't need it for deserialization
  offset += 4;

  // Read timestamp (8 bytes, big-endian)
  const timestampHigh =
    (data[offset] << 24) |
    (data[offset + 1] << 16) |
    (data[offset + 2] << 8) |
    data[offset + 3];
  offset += 4;

  const timestampLow =
    (data[offset] << 24) |
    (data[offset + 1] << 16) |
    (data[offset + 2] << 8) |
    data[offset + 3];
  offset += 4;

  const timestamp = timestampHigh * 0x100000000 + (timestampLow >>> 0);

  // Read guardian addresses
  const guardianCount = data[offset++];
  if (guardianCount < 1 || guardianCount > 255) {
    throw new Error(`Invalid guardian count: ${guardianCount} (must be 1-255)`);
  }

  const guardianAddresses: string[] = [];
  for (let i = 0; i < guardianCount; i++) {
    if (offset + 20 > data.length) {
      throw new Error('Insufficient data for guardian addresses');
    }
    const addressBytes = data.slice(offset, offset + 20);
    guardianAddresses.push(bytesToHex(addressBytes));
    offset += 20;
  }

  // Read user address (optional)
  const hasUserAddress = data[offset++];
  let userAddress: string | undefined;
  if (hasUserAddress) {
    if (offset + 20 > data.length) {
      throw new Error('Insufficient data for user address');
    }
    const userAddressBytes = data.slice(offset, offset + 20);
    userAddress = bytesToHex(userAddressBytes);
    offset += 20;
  }

  // Read DA commitments
  const commitmentCount = data[offset++];
  const daCommitments: DACommitment[] = [];

  for (let i = 0; i < commitmentCount; i++) {
    if (offset + 72 > data.length) { // 4 + 4 + 32 + 32
      throw new Error('Insufficient data for DA commitments');
    }

    // Read block number (4 bytes, big-endian)
    let blockNumber = 0;
    for (let j = 0; j < 4; j++) {
      blockNumber = (blockNumber * 256) + data[offset++];
    }

    // Read transaction index (4 bytes, big-endian)
    let txIndex = 0;
    for (let j = 0; j < 4; j++) {
      txIndex = (txIndex * 256) + data[offset++];
    }

    // Read data hash (32 bytes)
    const dataHashBytes = data.slice(offset, offset + 32);
    const dataHash = bytesToHex(dataHashBytes);
    offset += 32;

    // Read merkle root (32 bytes)
    const merkleRootBytes = data.slice(offset, offset + 32);
    const merkleRoot = bytesToHex(merkleRootBytes);
    offset += 32;

    daCommitments.push({
      blockNumber,
      txIndex,
      dataHash,
      merkleRoot
    });
  }

  const metadata: RecoveryMetadata = {
    userAddress,
    guardianAddresses,
    createdAt: timestamp,
    version
  };

  return {
    metadata,
    daCommitments
  };
}

/**
 * Convert hex string to bytes
 * @param hex Hex string (with or without 0x prefix)
 * @returns Byte array
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string: odd length');
  }

  if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
    throw new Error('Invalid hex string: contains non-hex characters');
  }

  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }

  return bytes;
}

/**
 * Convert bytes to hex string
 * @param bytes Byte array
 * @returns Hex string with 0x prefix
 */
function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate a recovery code format without fully parsing it
 * @param recoveryCode Recovery code to validate
 * @returns Validation result
 */
export function validateRecoveryCodeFormat(recoveryCode: string): {
  isValid: boolean;
  error?: string;
} {
  try {
    if (!recoveryCode) {
      return { isValid: false, error: 'Recovery code is empty' };
    }

    if (!recoveryCode.startsWith('keymesh:')) {
      return { isValid: false, error: 'Missing keymesh prefix' };
    }

    const encoded = recoveryCode.slice(8);
    if (encoded.length === 0) {
      return { isValid: false, error: 'Empty recovery code data' };
    }

    // Try to decode Base58
    try {
      bs58.decode(encoded);
    } catch {
      return { isValid: false, error: 'Invalid Base58 encoding' };
    }

    return { isValid: true };

  } catch (error) {
    return {
      isValid: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Generate a QR code-friendly URL for the recovery code
 * @param recoveryCode Recovery code string
 * @returns URL that can be encoded in QR code
 */
export function generateRecoveryUrl(recoveryCode: string): string {
  // Create a URL that mobile apps can handle
  return `https://keymesh.xyz/recover?code=${encodeURIComponent(recoveryCode)}`;
}

/**
 * Extract recovery code from a recovery URL
 * @param url Recovery URL
 * @returns Recovery code string
 */
export function extractRecoveryCodeFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');

    if (!code) {
      throw new Error('No recovery code found in URL');
    }

    return decodeURIComponent(code);

  } catch (error) {
    throw new Error(`Failed to extract recovery code from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a human-readable summary of recovery code contents
 * @param recoveryCode Recovery code to analyze
 * @returns Summary information
 */
export function getRecoveryCodeSummary(recoveryCode: string): {
  isValid: boolean;
  guardianCount?: number;
  hasUserAddress?: boolean;
  commitmentCount?: number;
  createdAt?: Date;
  version?: number;
  error?: string;
} {
  try {
    const parsed = parseRecoveryCode(recoveryCode);

    return {
      isValid: true,
      guardianCount: parsed.metadata.guardianAddresses.length,
      hasUserAddress: !!parsed.metadata.userAddress,
      commitmentCount: parsed.daCommitments.length,
      createdAt: new Date(parsed.metadata.createdAt),
      version: parsed.metadata.version
    };

  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}