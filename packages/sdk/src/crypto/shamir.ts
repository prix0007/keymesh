/**
 * @fileoverview Shamir Secret Sharing implementation for Keymesh SDK
 * Provides secure secret splitting and reconstruction using Shamir's Secret Sharing Scheme
 */

import { randomBytes } from '@noble/hashes/utils';

export interface Share {
  id: number;
  data: Uint8Array;
}

export interface ShamirConfig {
  shares: number;      // Total number of shares to generate
  threshold: number;   // Minimum shares needed to reconstruct
}

// Galois Field (GF) operations for GF(256)
class GF256 {
  // Pre-computed logarithm and exponential tables for GF(256)
  private static LOG_TABLE: number[] = new Array(256);
  private static EXP_TABLE: number[] = new Array(512); // Extended for easier modulo

  static {
    // Initialize tables for efficient GF(256) operations
    this.initTables();
  }

  private static initTables(): void {
    // Generate GF(256) tables using primitive polynomial 0x11D (x^8 + x^4 + x^3 + x^2 + 1)
    let x = 1;
    for (let i = 0; i < 255; i++) {
      this.EXP_TABLE[i] = x;
      this.LOG_TABLE[x] = i;
      x = (x << 1) ^ (x & 0x80 ? 0x11D : 0);
    }
    // Extend EXP table for easier modulo operations
    for (let i = 255; i < 512; i++) {
      this.EXP_TABLE[i] = this.EXP_TABLE[i - 255];
    }
    this.LOG_TABLE[0] = 255; // Convention: log(0) = 255 (invalid)
  }

  static add(a: number, b: number): number {
    return a ^ b; // Addition in GF(256) is XOR
  }

  static multiply(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return this.EXP_TABLE[this.LOG_TABLE[a] + this.LOG_TABLE[b]];
  }

  static divide(a: number, b: number): number {
    if (a === 0) return 0;
    if (b === 0) throw new Error('Division by zero in GF(256)');
    return this.EXP_TABLE[this.LOG_TABLE[a] - this.LOG_TABLE[b] + 255];
  }

  static power(base: number, exp: number): number {
    if (base === 0) return 0;
    if (exp === 0) return 1;
    return this.EXP_TABLE[(this.LOG_TABLE[base] * exp) % 255];
  }
}

/**
 * Evaluate polynomial at point x using Horner's method
 * @param coefficients Polynomial coefficients (constant term first)
 * @param x Point to evaluate at
 * @returns Polynomial value at x
 */
function evaluatePolynomial(coefficients: number[], x: number): number {
  let result = 0;

  for (let i = coefficients.length - 1; i >= 0; i--) {
    result = GF256.add(GF256.multiply(result, x), coefficients[i]);
  }

  return result;
}

/**
 * Perform Lagrange interpolation to reconstruct the secret
 * @param shares Array of shares to interpolate
 * @returns The secret (constant term of the polynomial)
 */
function lagrangeInterpolation(shares: { x: number; y: number }[]): number {
  let result = 0;

  for (let i = 0; i < shares.length; i++) {
    let numerator = 1;
    let denominator = 1;

    for (let j = 0; j < shares.length; j++) {
      if (i !== j) {
        // For Lagrange interpolation at x=0, we need:
        // numerator = product of (0 - x_j) = product of (-x_j) = product of x_j (in GF256, -x = x)
        numerator = GF256.multiply(numerator, shares[j].x);
        // denominator = product of (x_i - x_j)
        // In GF256, x_i - x_j = x_i + x_j (since subtraction is addition)
        const diff = shares[i].x ^ shares[j].x; // x_i XOR x_j = x_i - x_j in GF256
        if (diff === 0) {
          throw new Error('Shares have duplicate x-coordinates');
        }
        denominator = GF256.multiply(denominator, diff);
      }
    }

    if (denominator === 0) {
      throw new Error('Invalid denominator in Lagrange interpolation');
    }

    const lagrangeBasis = GF256.divide(numerator, denominator);
    const term = GF256.multiply(shares[i].y, lagrangeBasis);
    result = GF256.add(result, term);
  }

  return result;
}

/**
 * Split a secret into multiple shares using Shamir's Secret Sharing
 * @param secret The secret to split (must be at most 64 bytes for efficiency)
 * @param config Sharing configuration
 * @returns Array of shares
 */
export function splitSecret(
  secret: Uint8Array,
  config: ShamirConfig = { shares: 3, threshold: 2 }
): Share[] {
  const { shares: numShares, threshold } = config;

  if (threshold < 2) {
    throw new Error('Threshold must be at least 2');
  }

  if (threshold > numShares) {
    throw new Error('Threshold cannot be greater than number of shares');
  }

  if (numShares > 255) {
    throw new Error('Maximum 255 shares supported');
  }

  if (secret.length === 0) {
    throw new Error('Secret cannot be empty');
  }

  if (secret.length > 64) {
    throw new Error('Secret too large (max 64 bytes supported)');
  }

  const result: Share[] = [];

  // Generate coefficient matrix: one set of coefficients for each byte position
  const coefficientMatrix: number[][] = [];
  for (let byteIndex = 0; byteIndex < secret.length; byteIndex++) {
    const coefficients: number[] = [secret[byteIndex]]; // Secret byte is the constant term

    // Generate random coefficients for polynomial of degree (threshold - 1)
    for (let i = 1; i < threshold; i++) {
      coefficients.push(randomBytes(1)[0]);
    }

    coefficientMatrix.push(coefficients);
  }

  // Generate shares by evaluating polynomials at different points
  for (let shareId = 1; shareId <= numShares; shareId++) {
    const shareData = new Uint8Array(secret.length);

    for (let byteIndex = 0; byteIndex < secret.length; byteIndex++) {
      // Evaluate polynomial for this byte at shareId
      shareData[byteIndex] = evaluatePolynomial(coefficientMatrix[byteIndex], shareId);
    }

    result.push({
      id: shareId,
      data: shareData
    });
  }

  return result;
}

/**
 * Reconstruct a secret from shares using Lagrange interpolation
 * @param shares Array of shares (must have at least threshold shares)
 * @returns The reconstructed secret
 */
export function reconstructSecret(shares: Share[]): Uint8Array {
  if (shares.length < 2) {
    throw new Error('At least 2 shares required for reconstruction');
  }

  // Validate all shares have the same length
  const secretLength = shares[0].data.length;
  for (const share of shares) {
    if (share.data.length !== secretLength) {
      throw new Error('All shares must have the same length');
    }
  }

  const secret = new Uint8Array(secretLength);

  // Reconstruct each byte independently
  for (let byteIndex = 0; byteIndex < secretLength; byteIndex++) {
    const points = shares.map(share => ({
      x: share.id,
      y: share.data[byteIndex]
    }));

    secret[byteIndex] = lagrangeInterpolation(points);
  }

  return secret;
}

/**
 * Verify that shares can reconstruct to a valid secret
 * @param shares Array of shares to verify
 * @returns True if shares are valid and consistent
 */
export function verifyShares(shares: Share[]): boolean {
  try {
    if (shares.length < 2) {
      return false;
    }

    // Check for duplicate share IDs
    const ids = new Set(shares.map(s => s.id));
    if (ids.size !== shares.length) {
      return false;
    }

    // Check share ID range (1-255)
    for (const share of shares) {
      if (share.id < 1 || share.id > 255) {
        return false;
      }
    }

    // Try to reconstruct with different subsets to verify consistency
    // We need at least 2 shares for any reconstruction
    if (shares.length >= 2) {
      // For verification, try different combinations and check consistency
      // For systems with higher thresholds, use minimum required shares
      const minShares = Math.min(shares.length, 2); // Use 2 shares for basic verification

      if (shares.length >= 3) {
        // Test with two different 2-share combinations
        const subset1 = [shares[0], shares[1]];
        const subset2 = [shares[0], shares[2]];

        try {
          const secret1 = reconstructSecret(subset1);
          const secret2 = reconstructSecret(subset2);

          // Check if both subsets reconstruct to the same secret
          if (secret1.length !== secret2.length) {
            return false;
          }

          for (let i = 0; i < secret1.length; i++) {
            if (secret1[i] !== secret2[i]) {
              return false;
            }
          }
        } catch {
          // If reconstruction fails, shares might be invalid
          return false;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Serialize a share to bytes for storage or transmission
 * @param share The share to serialize
 * @returns Serialized bytes
 */
export function serializeShare(share: Share): Uint8Array {
  const result = new Uint8Array(1 + 2 + share.data.length);

  result[0] = share.id;

  // Store data length as 2 bytes (big-endian)
  result[1] = (share.data.length >> 8) & 0xFF;
  result[2] = share.data.length & 0xFF;

  result.set(share.data, 3);

  return result;
}

/**
 * Deserialize bytes back to a share
 * @param data Serialized share bytes
 * @returns Reconstructed share
 */
export function deserializeShare(data: Uint8Array): Share {
  if (data.length < 3) {
    throw new Error('Invalid share data: too short');
  }

  const id = data[0];

  if (id < 1 || id > 255) {
    throw new Error(`Invalid share ID: ${id}`);
  }

  // Read data length (2 bytes, big-endian)
  const dataLength = (data[1] << 8) | data[2];

  if (data.length !== 3 + dataLength) {
    throw new Error('Invalid share data: length mismatch');
  }

  const shareData = data.slice(3);

  return {
    id,
    data: shareData
  };
}

/**
 * Generate test data for verifying the implementation
 * @param secretLength Length of test secret in bytes
 * @returns Test data with secret and shares
 */
export function generateTestData(secretLength: number = 32) {
  const secret = randomBytes(secretLength);
  const shares = splitSecret(secret, { shares: 5, threshold: 3 });

  return {
    secret,
    shares,
    // Test reconstruction with different combinations
    reconstructed1: reconstructSecret([shares[0], shares[1], shares[2]]),
    reconstructed2: reconstructSecret([shares[1], shares[3], shares[4]]),
    reconstructed3: reconstructSecret([shares[0], shares[4]])
  };
}