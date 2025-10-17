/**
 * @fileoverview Tests for encryption utilities
 */

import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  hashBiometric,
  deriveGuardianKey,
  encryptData,
  decryptData,
  generateRandomKey,
  secureWipe,
  serializeBundle,
  deserializeBundle,
  SALT_LENGTH,
  IV_LENGTH,
  TAG_LENGTH,
  KEY_LENGTH
} from '../crypto/encryption.js';

describe('Encryption Utilities', () => {
  describe('hashPassword', () => {
    it('should hash password with salt', () => {
      const password = 'test-password-123';
      const result = hashPassword(password);

      expect(result.hash).toHaveLength(KEY_LENGTH);
      expect(result.salt).toHaveLength(SALT_LENGTH);
    });

    it('should produce deterministic hash with same salt', () => {
      const password = 'test-password-123';
      const salt = generateRandomKey();

      const result1 = hashPassword(password, salt);
      const result2 = hashPassword(password, salt);

      expect(result1.hash).toEqual(result2.hash);
      expect(result1.salt).toEqual(result2.salt);
    });

    it('should produce different hashes with different salts', () => {
      const password = 'test-password-123';

      const result1 = hashPassword(password);
      const result2 = hashPassword(password);

      expect(result1.hash).not.toEqual(result2.hash);
      expect(result1.salt).not.toEqual(result2.salt);
    });
  });

  describe('hashBiometric', () => {
    it('should hash biometric data consistently', () => {
      const biometricData = new Uint8Array([1, 2, 3, 4, 5]);

      const hash1 = hashBiometric(biometricData);
      const hash2 = hashBiometric(biometricData);

      expect(hash1).toEqual(hash2);
      expect(hash1).toHaveLength(32); // SHA-256 output
    });

    it('should produce different hashes for different data', () => {
      const data1 = new Uint8Array([1, 2, 3, 4, 5]);
      const data2 = new Uint8Array([5, 4, 3, 2, 1]);

      const hash1 = hashBiometric(data1);
      const hash2 = hashBiometric(data2);

      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('deriveGuardianKey', () => {
    it('should derive consistent key from guardian addresses', () => {
      const guardians = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333'
      ];

      const key1 = deriveGuardianKey(guardians);
      const key2 = deriveGuardianKey(guardians);

      expect(key1).toEqual(key2);
      expect(key1).toHaveLength(32);
    });

    it('should be order-independent', () => {
      const guardians1 = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333'
      ];

      const guardians2 = [
        '0x3333333333333333333333333333333333333333',
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222'
      ];

      const key1 = deriveGuardianKey(guardians1);
      const key2 = deriveGuardianKey(guardians2);

      expect(key1).toEqual(key2);
    });

    it('should handle mixed case addresses', () => {
      const guardians1 = ['0xABCDEF1234567890ABCDEF1234567890ABCDEF12'];
      const guardians2 = ['0xabcdef1234567890abcdef1234567890abcdef12'];

      const key1 = deriveGuardianKey(guardians1);
      const key2 = deriveGuardianKey(guardians2);

      expect(key1).toEqual(key2);
    });
  });

  describe('encryptData and decryptData', () => {
    it('should encrypt and decrypt data successfully', () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const key = generateRandomKey();

      const encrypted = encryptData(plaintext, key);
      const decrypted = decryptData(encrypted, key);

      expect(decrypted).toEqual(plaintext);
    });

    it('should produce different ciphertext each time', () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const key = generateRandomKey();

      const encrypted1 = encryptData(plaintext, key);
      const encrypted2 = encryptData(plaintext, key);

      expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toEqual(encrypted2.iv);
    });

    it('should fail with wrong key', () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const key1 = generateRandomKey();
      const key2 = generateRandomKey();

      const encrypted = encryptData(plaintext, key1);

      expect(() => decryptData(encrypted, key2)).toThrow();
    });

    it('should validate key length', () => {
      const plaintext = new Uint8Array([1, 2, 3]);
      const shortKey = new Uint8Array(16); // Too short

      expect(() => encryptData(plaintext, shortKey)).toThrow('Key must be 32 bytes long');
    });

    it('should include all required components', () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const key = generateRandomKey();

      const encrypted = encryptData(plaintext, key);

      expect(encrypted.ciphertext).toHaveLength(5);
      expect(encrypted.iv).toHaveLength(IV_LENGTH);
      expect(encrypted.tag).toHaveLength(TAG_LENGTH);
      expect(encrypted.salt).toHaveLength(SALT_LENGTH);
      expect(encrypted.version).toBe(1);
    });
  });

  describe('generateRandomKey', () => {
    it('should generate 32-byte keys', () => {
      const key = generateRandomKey();
      expect(key).toHaveLength(KEY_LENGTH);
    });

    it('should generate different keys each time', () => {
      const key1 = generateRandomKey();
      const key2 = generateRandomKey();

      expect(key1).not.toEqual(key2);
    });
  });

  describe('secureWipe', () => {
    it('should zero out array contents', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const original = new Uint8Array(data);

      secureWipe(data);

      expect(data).not.toEqual(original);
      expect(Array.from(data)).toEqual([0, 0, 0, 0, 0]);
    });
  });

  describe('serializeBundle and deserializeBundle', () => {
    it('should serialize and deserialize bundle correctly', () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const key = generateRandomKey();

      const bundle = encryptData(plaintext, key);
      const serialized = serializeBundle(bundle);
      const deserialized = deserializeBundle(serialized);

      expect(deserialized).toEqual(bundle);
    });

    it('should handle empty ciphertext', () => {
      const plaintext = new Uint8Array([]);
      const key = generateRandomKey();

      const bundle = encryptData(plaintext, key);
      const serialized = serializeBundle(bundle);
      const deserialized = deserializeBundle(serialized);

      expect(deserialized).toEqual(bundle);
    });

    it('should fail with invalid data', () => {
      const invalidData = new Uint8Array([1, 2, 3]); // Too short

      expect(() => deserializeBundle(invalidData)).toThrow();
    });
  });
});