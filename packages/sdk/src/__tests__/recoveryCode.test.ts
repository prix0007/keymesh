/**
 * @fileoverview Tests for recovery code utilities
 */

import { describe, it, expect } from 'vitest';
import {
  generateRecoveryCode,
  parseRecoveryCode,
  validateRecoveryCodeFormat,
  generateRecoveryUrl,
  extractRecoveryCodeFromUrl,
  getRecoveryCodeSummary,
  type RecoveryCodeData,
  type DACommitment,
  type RecoveryMetadata
} from '../utils/recoveryCode.js';

describe('Recovery Code Utilities', () => {
  const mockMetadata: RecoveryMetadata = {
    userAddress: '0x1234567890123456789012345678901234567890',
    guardianAddresses: [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '0x3333333333333333333333333333333333333333',
      '0x4444444444444444444444444444444444444444',
      '0x5555555555555555555555555555555555555555'
    ],
    createdAt: Date.now(),
    version: 1
  };

  const mockDACommitments: DACommitment[] = [
    {
      blockNumber: 123456,
      txIndex: 1,
      dataHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      merkleRoot: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    },
    {
      blockNumber: 123457,
      txIndex: 2,
      dataHash: '0x2345678901bcdef02345678901bcdef02345678901bcdef02345678901bcdef0',
      merkleRoot: '0xbcdef02345678901bcdef02345678901bcdef02345678901bcdef02345678901'
    },
    {
      blockNumber: 123458,
      txIndex: 3,
      dataHash: '0x3456789012cdef013456789012cdef013456789012cdef013456789012cdef01',
      merkleRoot: '0xcdef013456789012cdef013456789012cdef013456789012cdef013456789012'
    }
  ];

  describe('generateRecoveryCode', () => {
    it('should generate recovery code with metadata only', () => {
      const recoveryCode = generateRecoveryCode(mockMetadata, []);

      expect(recoveryCode).toMatch(/^keymesh:/);
      expect(recoveryCode.length).toBeGreaterThan(8);
    });

    it('should generate recovery code with DA commitments', () => {
      const recoveryCode = generateRecoveryCode(mockMetadata, mockDACommitments);

      expect(recoveryCode).toMatch(/^keymesh:/);
      expect(recoveryCode.length).toBeGreaterThan(8);
    });

    it('should handle metadata without user address', () => {
      const metadataWithoutUser = {
        ...mockMetadata,
        userAddress: undefined
      };

      const recoveryCode = generateRecoveryCode(metadataWithoutUser, []);

      expect(recoveryCode).toMatch(/^keymesh:/);
    });

    it('should throw on invalid input', () => {
      const invalidMetadata = {
        ...mockMetadata,
        guardianAddresses: [] // Empty
      };

      expect(() => generateRecoveryCode(invalidMetadata, []))
        .toThrow('Failed to generate recovery code');
    });
  });

  describe('parseRecoveryCode', () => {
    it('should parse valid recovery code', () => {
      const recoveryCode = generateRecoveryCode(mockMetadata, mockDACommitments);
      const parsed = parseRecoveryCode(recoveryCode);

      expect(parsed.metadata.guardianAddresses).toEqual(mockMetadata.guardianAddresses);
      expect(parsed.metadata.version).toBe(mockMetadata.version);
      expect(parsed.metadata.userAddress).toBe(mockMetadata.userAddress);
      expect(parsed.daCommitments).toHaveLength(mockDACommitments.length);
      expect(parsed.rawData).toBeInstanceOf(Uint8Array);
    });

    it('should handle recovery code without DA commitments', () => {
      const recoveryCode = generateRecoveryCode(mockMetadata, []);
      const parsed = parseRecoveryCode(recoveryCode);

      expect(parsed.metadata.guardianAddresses).toEqual(mockMetadata.guardianAddresses);
      expect(parsed.daCommitments).toHaveLength(0);
    });

    it('should reject codes without prefix', () => {
      expect(() => parseRecoveryCode('invalid-code'))
        .toThrow('Invalid recovery code format: missing keymesh prefix');
    });

    it('should reject empty codes', () => {
      expect(() => parseRecoveryCode(''))
        .toThrow('Failed to parse recovery code');
    });

    it('should reject invalid base58', () => {
      expect(() => parseRecoveryCode('keymesh:invalid-base58-@#$'))
        .toThrow('Failed to parse recovery code');
    });
  });

  describe('validateRecoveryCodeFormat', () => {
    it('should validate correct format', () => {
      const recoveryCode = generateRecoveryCode(mockMetadata, []);
      const validation = validateRecoveryCodeFormat(recoveryCode);

      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should detect empty code', () => {
      const validation = validateRecoveryCodeFormat('');

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('Recovery code is empty');
    });

    it('should detect missing prefix', () => {
      const validation = validateRecoveryCodeFormat('no-prefix-here');

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('Missing keymesh prefix');
    });

    it('should detect empty data', () => {
      const validation = validateRecoveryCodeFormat('keymesh:');

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('Empty recovery code data');
    });

    it('should detect invalid base58', () => {
      const validation = validateRecoveryCodeFormat('keymesh:invalid-base58-@#$');

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('Invalid Base58 encoding');
    });
  });

  describe('generateRecoveryUrl and extractRecoveryCodeFromUrl', () => {
    it('should generate and extract recovery URL', () => {
      const recoveryCode = generateRecoveryCode(mockMetadata, []);
      const url = generateRecoveryUrl(recoveryCode);

      expect(url).toMatch(/^https:\/\/keymesh\.xyz\/recover\?code=/);

      const extractedCode = extractRecoveryCodeFromUrl(url);
      expect(extractedCode).toBe(recoveryCode);
    });

    it('should handle special characters in recovery code', () => {
      const recoveryCode = generateRecoveryCode(mockMetadata, mockDACommitments);
      const url = generateRecoveryUrl(recoveryCode);
      const extractedCode = extractRecoveryCodeFromUrl(url);

      expect(extractedCode).toBe(recoveryCode);
    });

    it('should reject URLs without code parameter', () => {
      expect(() => extractRecoveryCodeFromUrl('https://keymesh.xyz/recover'))
        .toThrow('No recovery code found in URL');
    });

    it('should reject invalid URLs', () => {
      expect(() => extractRecoveryCodeFromUrl('not-a-url'))
        .toThrow('Failed to extract recovery code from URL');
    });
  });

  describe('getRecoveryCodeSummary', () => {
    it('should provide summary for valid code', () => {
      const recoveryCode = generateRecoveryCode(mockMetadata, mockDACommitments);
      const summary = getRecoveryCodeSummary(recoveryCode);

      expect(summary.isValid).toBe(true);
      expect(summary.guardianCount).toBe(5);
      expect(summary.hasUserAddress).toBe(true);
      expect(summary.commitmentCount).toBe(3);
      expect(summary.createdAt).toBeInstanceOf(Date);
      expect(summary.version).toBe(1);
      expect(summary.error).toBeUndefined();
    });

    it('should handle code without user address', () => {
      const metadataWithoutUser = {
        ...mockMetadata,
        userAddress: undefined
      };
      const recoveryCode = generateRecoveryCode(metadataWithoutUser, []);
      const summary = getRecoveryCodeSummary(recoveryCode);

      expect(summary.isValid).toBe(true);
      expect(summary.hasUserAddress).toBe(false);
      expect(summary.commitmentCount).toBe(0);
    });

    it('should handle invalid codes', () => {
      const summary = getRecoveryCodeSummary('invalid-code');

      expect(summary.isValid).toBe(false);
      expect(summary.error).toContain('Failed to parse recovery code');
    });
  });

  describe('Round-trip testing', () => {
    it('should maintain data integrity through generation and parsing', () => {
      const originalData: RecoveryCodeData = {
        metadata: mockMetadata,
        daCommitments: mockDACommitments
      };

      const recoveryCode = generateRecoveryCode(originalData.metadata, originalData.daCommitments);
      const parsed = parseRecoveryCode(recoveryCode);

      // Check metadata
      expect(parsed.metadata.userAddress).toBe(originalData.metadata.userAddress);
      expect(parsed.metadata.guardianAddresses).toEqual(originalData.metadata.guardianAddresses);
      expect(parsed.metadata.version).toBe(originalData.metadata.version);
      expect(parsed.metadata.createdAt).toBe(originalData.metadata.createdAt);

      // Check DA commitments
      expect(parsed.daCommitments).toHaveLength(originalData.daCommitments.length);
      for (let i = 0; i < originalData.daCommitments.length; i++) {
        expect(parsed.daCommitments[i]).toEqual(originalData.daCommitments[i]);
      }
    });

    it('should handle edge cases', () => {
      // Single guardian (edge case, normally 5)
      const edgeMetadata: RecoveryMetadata = {
        guardianAddresses: ['0x1111111111111111111111111111111111111111'],
        createdAt: 1,
        version: 1
      };

      const recoveryCode = generateRecoveryCode(edgeMetadata, []);
      const parsed = parseRecoveryCode(recoveryCode);

      expect(parsed.metadata.guardianAddresses).toEqual(edgeMetadata.guardianAddresses);
      expect(parsed.metadata.createdAt).toBe(1);
    });

    it('should handle maximum timestamp', () => {
      const maxTimestamp = Date.now() + 1000000000; // Far future
      const futureMetadata: RecoveryMetadata = {
        ...mockMetadata,
        createdAt: maxTimestamp
      };

      const recoveryCode = generateRecoveryCode(futureMetadata, []);
      const parsed = parseRecoveryCode(recoveryCode);

      expect(parsed.metadata.createdAt).toBe(maxTimestamp);
    });
  });

  describe('Security considerations', () => {
    it('should produce different codes for same data', () => {
      // Due to random salt in the encoding, same data should produce different codes
      const code1 = generateRecoveryCode(mockMetadata, []);
      const code2 = generateRecoveryCode(mockMetadata, []);

      expect(code1).not.toBe(code2);

      // But both should parse to the same data
      const parsed1 = parseRecoveryCode(code1);
      const parsed2 = parseRecoveryCode(code2);

      expect(parsed1.metadata).toEqual(parsed2.metadata);
    });

    it('should not leak sensitive information in errors', () => {
      try {
        parseRecoveryCode('keymesh:invalid');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '';
        expect(errorMessage).not.toContain('0x');
        expect(errorMessage).not.toContain('guardian');
        expect(errorMessage).not.toContain('address');
      }
    });
  });
});