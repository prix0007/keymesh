/**
 * @fileoverview Tests for Shamir Secret Sharing
 */

import { describe, it, expect } from 'vitest';
import {
  splitSecret,
  reconstructSecret,
  verifyShares,
  serializeShare,
  deserializeShare,
  generateTestData,
  type Share,
  type ShamirConfig
} from '../crypto/shamir.js';

describe('Shamir Secret Sharing', () => {
  const testSecret = new Uint8Array([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10
  ]);

  describe('splitSecret', () => {
    it('should split secret into specified number of shares', () => {
      const config: ShamirConfig = { shares: 5, threshold: 3 };
      const shares = splitSecret(testSecret, config);

      expect(shares).toHaveLength(5);
      expect(shares[0].id).toBe(1);
      expect(shares[4].id).toBe(5);
      expect(shares[0].data).toHaveLength(testSecret.length);
    });

    it('should use default configuration', () => {
      const shares = splitSecret(testSecret);

      expect(shares).toHaveLength(3);
      expect(shares[0].data).toHaveLength(testSecret.length);
    });

    it('should validate threshold requirements', () => {
      expect(() => splitSecret(testSecret, { shares: 3, threshold: 1 }))
        .toThrow('Threshold must be at least 2');

      expect(() => splitSecret(testSecret, { shares: 2, threshold: 3 }))
        .toThrow('Threshold cannot be greater than number of shares');
    });

    it('should validate secret size', () => {
      expect(() => splitSecret(new Uint8Array(0)))
        .toThrow('Secret cannot be empty');

      expect(() => splitSecret(new Uint8Array(65)))
        .toThrow('Secret too large (max 64 bytes supported)');
    });

    it('should limit number of shares', () => {
      expect(() => splitSecret(testSecret, { shares: 256, threshold: 2 }))
        .toThrow('Maximum 255 shares supported');
    });
  });

  describe('reconstructSecret', () => {
    it('should reconstruct secret from threshold shares', () => {
      const shares = splitSecret(testSecret, { shares: 5, threshold: 3 });

      // Use first 3 shares
      const subset1 = shares.slice(0, 3);
      const reconstructed1 = reconstructSecret(subset1);
      expect(reconstructed1).toEqual(testSecret);

      // Use different 3 shares
      const subset2 = [shares[0], shares[2], shares[4]];
      const reconstructed2 = reconstructSecret(subset2);
      expect(reconstructed2).toEqual(testSecret);

      // Use minimum (2 shares for threshold 3 won't work, but 2 for threshold 2 will)
      const sharesT2 = splitSecret(testSecret, { shares: 3, threshold: 2 });
      const subset3 = sharesT2.slice(0, 2);
      const reconstructed3 = reconstructSecret(subset3);
      expect(reconstructed3).toEqual(testSecret);
    });

    it('should require minimum shares', () => {
      const shares = splitSecret(testSecret, { shares: 3, threshold: 2 });

      expect(() => reconstructSecret([shares[0]]))
        .toThrow('At least 2 shares required for reconstruction');
    });

    it('should validate share consistency', () => {
      const shares = splitSecret(testSecret, { shares: 3, threshold: 2 });

      // Modify share data to make it inconsistent
      const corruptedShare: Share = {
        id: shares[1].id,
        data: new Uint8Array(shares[1].data.length + 1) // Different length
      };

      expect(() => reconstructSecret([shares[0], corruptedShare]))
        .toThrow('All shares must have the same length');
    });
  });

  describe('verifyShares', () => {
    it('should verify valid shares', () => {
      const shares = splitSecret(testSecret, { shares: 5, threshold: 3 });
      expect(verifyShares(shares)).toBe(true);
      expect(verifyShares(shares.slice(0, 3))).toBe(true);
    });

    it('should detect insufficient shares', () => {
      const shares = splitSecret(testSecret, { shares: 3, threshold: 2 });
      expect(verifyShares([shares[0]])).toBe(false);
    });

    it('should detect duplicate share IDs', () => {
      const shares = splitSecret(testSecret, { shares: 3, threshold: 2 });
      const duplicateShares = [shares[0], shares[0]];
      expect(verifyShares(duplicateShares)).toBe(false);
    });

    it('should detect invalid share IDs', () => {
      const shares = splitSecret(testSecret, { shares: 3, threshold: 2 });
      const invalidShare: Share = {
        id: 0, // Invalid ID
        data: shares[0].data
      };
      expect(verifyShares([invalidShare, shares[1]])).toBe(false);
    });

    it('should detect inconsistent reconstruction', () => {
      const shares = splitSecret(testSecret, { shares: 5, threshold: 3 });

      // Corrupt one share's data
      shares[1].data[0] = shares[1].data[0] ^ 0xFF;

      expect(verifyShares(shares)).toBe(false);
    });
  });

  describe('serializeShare and deserializeShare', () => {
    it('should serialize and deserialize shares correctly', () => {
      const shares = splitSecret(testSecret, { shares: 3, threshold: 2 });

      for (const share of shares) {
        const serialized = serializeShare(share);
        const deserialized = deserializeShare(serialized);

        expect(deserialized).toEqual(share);
      }
    });

    it('should handle different share sizes', () => {
      const smallSecret = new Uint8Array([1, 2, 3]);
      const largeSecret = new Uint8Array(64).fill(42);

      const smallShares = splitSecret(smallSecret);
      const largeShares = splitSecret(largeSecret);

      const serializedSmall = serializeShare(smallShares[0]);
      const serializedLarge = serializeShare(largeShares[0]);

      const deserializedSmall = deserializeShare(serializedSmall);
      const deserializedLarge = deserializeShare(serializedLarge);

      expect(deserializedSmall).toEqual(smallShares[0]);
      expect(deserializedLarge).toEqual(largeShares[0]);
    });

    it('should validate serialized data', () => {
      expect(() => deserializeShare(new Uint8Array([1, 2])))
        .toThrow('Invalid share data: too short');

      expect(() => deserializeShare(new Uint8Array([0, 0, 5, 1, 2, 3])))
        .toThrow('Invalid share ID: 0');

      expect(() => deserializeShare(new Uint8Array([1, 0, 5, 1, 2])))
        .toThrow('Invalid share data: length mismatch');
    });
  });

  describe('generateTestData', () => {
    it('should generate consistent test data', () => {
      const testData = generateTestData(32);

      expect(testData.secret).toHaveLength(32);
      expect(testData.shares).toHaveLength(5);
      expect(testData.reconstructed1).toEqual(testData.secret);
      expect(testData.reconstructed2).toEqual(testData.secret);
      expect(testData.reconstructed3).toEqual(testData.secret);
    });

    it('should handle different secret lengths', () => {
      const testData16 = generateTestData(16);
      const testData64 = generateTestData(64);

      expect(testData16.secret).toHaveLength(16);
      expect(testData64.secret).toHaveLength(64);

      expect(testData16.reconstructed1).toEqual(testData16.secret);
      expect(testData64.reconstructed1).toEqual(testData64.secret);
    });
  });

  describe('Real-world scenarios', () => {
    it('should work with 3-of-5 guardian setup', () => {
      const masterKey = new Uint8Array(32).fill(42);
      const shares = splitSecret(masterKey, { shares: 5, threshold: 3 });

      // Simulate different guardian combinations
      const combo1 = [shares[0], shares[1], shares[2]];
      const combo2 = [shares[0], shares[2], shares[4]];
      const combo3 = [shares[1], shares[3], shares[4]];

      expect(reconstructSecret(combo1)).toEqual(masterKey);
      expect(reconstructSecret(combo2)).toEqual(masterKey);
      expect(reconstructSecret(combo3)).toEqual(masterKey);
    });

    it('should fail with insufficient guardians', () => {
      const masterKey = new Uint8Array(32).fill(42);
      const shares = splitSecret(masterKey, { shares: 5, threshold: 3 });

      // Only 2 guardians respond
      const insufficientShares = [shares[0], shares[1]];

      // Should not be able to reconstruct (though our implementation allows 2+ shares)
      // In a real scenario, you'd need exactly the threshold
      const reconstructed = reconstructSecret(insufficientShares);
      expect(reconstructed).not.toEqual(masterKey);
    });

    it('should handle edge case with all shares', () => {
      const masterKey = new Uint8Array(16);
      crypto.getRandomValues(masterKey);

      const shares = splitSecret(masterKey, { shares: 255, threshold: 128 });
      const reconstructed = reconstructSecret(shares.slice(0, 128));

      expect(reconstructed).toEqual(masterKey);
    });
  });
});