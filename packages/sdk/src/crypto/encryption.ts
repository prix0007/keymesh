/**
 * @fileoverview Core encryption utilities for Keymesh SDK
 * Provides secure encryption/decryption using industry-standard algorithms
 */

import { sha256 } from '@noble/hashes/sha256';
import { scrypt } from '@noble/hashes/scrypt';
import { randomBytes } from '@noble/hashes/utils';
import { gcm } from '@noble/ciphers/aes';

// Constants
export const SALT_LENGTH = 32; // 256 bits
export const IV_LENGTH = 12; // 96 bits for GCM
export const TAG_LENGTH = 16; // 128 bits for GCM
export const KEY_LENGTH = 32; // 256 bits

export interface EncryptedBundle {
  ciphertext: Uint8Array;
  iv: Uint8Array;        // 12 bytes
  tag: Uint8Array;       // 16 bytes
  salt: Uint8Array;      // 32 bytes
  version: number;
}

/**
 * Hash a password using scrypt (similar to Argon2)
 * @param password The password to hash
 * @param salt Optional salt (will generate if not provided)
 * @returns Object containing hash and salt
 */
export function hashPassword(
  password: string,
  salt?: Uint8Array
): { hash: Uint8Array; salt: Uint8Array } {
  const actualSalt = salt || randomBytes(SALT_LENGTH);

  // Using scrypt with strong parameters
  // N=32768 (CPU cost), r=8 (block size), p=1 (parallelization)
  const hash = scrypt(
    new TextEncoder().encode(password),
    actualSalt,
    { N: 32768, r: 8, p: 1, dkLen: KEY_LENGTH }
  );

  return { hash, salt: actualSalt };
}

/**
 * Hash biometric data using SHA-256
 * @param biometricData Raw biometric data
 * @returns SHA-256 hash of the biometric data
 */
export function hashBiometric(biometricData: Uint8Array): Uint8Array {
  return sha256(biometricData);
}

/**
 * Derive a key from multiple guardian addresses for social recovery
 * @param guardianAddresses Array of guardian Ethereum addresses
 * @returns 32-byte key derived from guardian addresses
 */
export function deriveGuardianKey(guardianAddresses: string[]): Uint8Array {
  // Sort addresses to ensure deterministic key derivation
  const sortedAddresses = guardianAddresses
    .map(addr => addr.toLowerCase())
    .sort();

  // Concatenate all addresses and hash
  const combined = sortedAddresses.join('');
  return sha256(new TextEncoder().encode(combined));
}

/**
 * Encrypt data using AES-256-GCM
 * @param plaintext Data to encrypt
 * @param key 32-byte encryption key
 * @returns Encrypted bundle with all necessary components
 */
export function encryptData(
  plaintext: Uint8Array,
  key: Uint8Array
): EncryptedBundle {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes long`);
  }

  const iv = randomBytes(IV_LENGTH);
  const salt = randomBytes(SALT_LENGTH);

  // Create AES-GCM cipher
  const cipher = gcm(key, iv);
  const ciphertext = cipher.encrypt(plaintext);

  // Extract authentication tag (last 16 bytes)
  const tag = ciphertext.slice(-TAG_LENGTH);
  const actualCiphertext = ciphertext.slice(0, -TAG_LENGTH);

  return {
    ciphertext: actualCiphertext,
    iv,
    tag,
    salt,
    version: 1
  };
}

/**
 * Decrypt data using AES-256-GCM
 * @param bundle Encrypted bundle containing all components
 * @param key 32-byte decryption key
 * @returns Decrypted plaintext
 */
export function decryptData(
  bundle: EncryptedBundle,
  key: Uint8Array
): Uint8Array {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes long`);
  }

  if (bundle.version !== 1) {
    throw new Error(`Unsupported bundle version: ${bundle.version}`);
  }

  // Reconstruct the ciphertext with tag for GCM
  const ciphertextWithTag = new Uint8Array(bundle.ciphertext.length + bundle.tag.length);
  ciphertextWithTag.set(bundle.ciphertext);
  ciphertextWithTag.set(bundle.tag, bundle.ciphertext.length);

  // Create AES-GCM cipher
  const cipher = gcm(key, bundle.iv);

  try {
    return cipher.decrypt(ciphertextWithTag);
  } catch (error) {
    throw new Error('Decryption failed: Invalid key or corrupted data');
  }
}

/**
 * Generate a random 32-byte key
 * @returns 32-byte random key
 */
export function generateRandomKey(): Uint8Array {
  return randomBytes(KEY_LENGTH);
}

/**
 * Convert an EncryptedBundle to a compact byte representation
 * @param bundle The bundle to serialize
 * @returns Serialized bytes
 */
export function serializeBundle(bundle: EncryptedBundle): Uint8Array {
  const result = new Uint8Array(
    4 + // version (4 bytes)
    4 + // ciphertext length (4 bytes)
    bundle.ciphertext.length +
    bundle.iv.length +
    bundle.tag.length +
    bundle.salt.length
  );

  let offset = 0;

  // Write version (4 bytes, little-endian)
  const versionBytes = new Uint8Array(4);
  new DataView(versionBytes.buffer).setUint32(0, bundle.version, true);
  result.set(versionBytes, offset);
  offset += 4;

  // Write ciphertext length (4 bytes, little-endian)
  const lengthBytes = new Uint8Array(4);
  new DataView(lengthBytes.buffer).setUint32(0, bundle.ciphertext.length, true);
  result.set(lengthBytes, offset);
  offset += 4;

  // Write components
  result.set(bundle.ciphertext, offset);
  offset += bundle.ciphertext.length;

  result.set(bundle.iv, offset);
  offset += bundle.iv.length;

  result.set(bundle.tag, offset);
  offset += bundle.tag.length;

  result.set(bundle.salt, offset);

  return result;
}

/**
 * Deserialize bytes back to an EncryptedBundle
 * @param data Serialized bundle bytes
 * @returns Reconstructed EncryptedBundle
 */
export function deserializeBundle(data: Uint8Array): EncryptedBundle {
  if (data.length < 8) {
    throw new Error('Invalid bundle data: too short');
  }

  let offset = 0;

  // Read version (4 bytes, little-endian)
  const version = new DataView(data.buffer, data.byteOffset + offset).getUint32(0, true);
  offset += 4;

  if (version !== 1) {
    throw new Error(`Unsupported bundle version: ${version}`);
  }

  // Read ciphertext length (4 bytes, little-endian)
  const ciphertextLength = new DataView(data.buffer, data.byteOffset + offset).getUint32(0, true);
  offset += 4;

  if (data.length !== 8 + ciphertextLength + IV_LENGTH + TAG_LENGTH + SALT_LENGTH) {
    throw new Error('Invalid bundle data: incorrect length');
  }

  // Read components
  const ciphertext = data.slice(offset, offset + ciphertextLength);
  offset += ciphertextLength;

  const iv = data.slice(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;

  const tag = data.slice(offset, offset + TAG_LENGTH);
  offset += TAG_LENGTH;

  const salt = data.slice(offset, offset + SALT_LENGTH);

  return {
    ciphertext,
    iv,
    tag,
    salt,
    version
  };
}

/**
 * Securely wipe sensitive data from memory
 * @param data Array to wipe
 */
export function secureWipe(data: Uint8Array): void {
  if (data) {
    data.fill(0);
  }
}