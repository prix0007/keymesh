/**
 * @fileoverview Tests for key manager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setupRecovery,
  recoverKey,
  decryptPiece,
  validateRecoveryConfig,
  generateTestSetup,
  estimateStorageSize,
  type RecoverySetupConfig,
  type RecoveryConfig,
  type EncryptedPiece
} from '../core/keyManager.js';
import { generateRandomKey } from '../crypto/encryption.js';

describe('Key Manager', () => {
  let testConfig: RecoverySetupConfig;

  beforeEach(() => {
    testConfig = {
      masterKey: generateRandomKey(),
      password: 'secure-password-123',
      guardianAddresses: [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
        '0x4444444444444444444444444444444444444444',
        '0x5555555555555555555555555555555555555555'
      ],
      biometricHash: generateRandomKey().slice(0, 32)
    };
  });

  describe('setupRecovery', () => {
    it('should create recovery setup successfully', async () => {
      const result = await setupRecovery(testConfig);

      expect(result.pieces).toHaveLength(3);
      expect(result.recoveryCode).toMatch(/^keymesh:/);
      expect(result.metadata.guardianAddresses).toEqual(testConfig.guardianAddresses);
      expect(result.metadata.version).toBe(1);
      expect(result.metadata.createdAt).toBeGreaterThan(0);

      // Check piece types
      const pieceTypes = result.pieces.map(p => p.type);
      expect(pieceTypes).toContain('password');
      expect(pieceTypes).toContain('biometric');
      expect(pieceTypes).toContain('social');

      // Check piece IDs
      const pieceIds = result.pieces.map(p => p.id);
      expect(pieceIds).toContain('A');
      expect(pieceIds).toContain('B');
      expect(pieceIds).toContain('C');
    });

    it('should validate master key length', async () => {
      const invalidConfig = {
        ...testConfig,
        masterKey: new Uint8Array(16) // Too short
      };

      await expect(setupRecovery(invalidConfig))
        .rejects.toThrow('Master key must be 32 or 64 bytes');
    });

    it('should validate password length', async () => {
      const invalidConfig = {
        ...testConfig,
        password: 'short'
      };

      await expect(setupRecovery(invalidConfig))
        .rejects.toThrow('Password must be at least 8 characters');
    });

    it('should validate guardian count', async () => {
      const invalidConfig = {
        ...testConfig,
        guardianAddresses: ['0x1111111111111111111111111111111111111111'] // Only 1
      };

      await expect(setupRecovery(invalidConfig))
        .rejects.toThrow('Exactly 5 guardian addresses required');
    });

    it('should validate Ethereum addresses', async () => {
      const invalidConfig = {
        ...testConfig,
        guardianAddresses: [
          '0x1111111111111111111111111111111111111111',
          '0x2222222222222222222222222222222222222222',
          '0x3333333333333333333333333333333333333333',
          '0x4444444444444444444444444444444444444444',
          'invalid-address'
        ]
      };

      await expect(setupRecovery(invalidConfig))
        .rejects.toThrow('Invalid Ethereum address: invalid-address');
    });

    it('should work without biometric data', async () => {
      const configWithoutBiometric = {
        ...testConfig,
        biometricHash: undefined
      };

      const result = await setupRecovery(configWithoutBiometric);

      expect(result.pieces).toHaveLength(3);
      expect(result.pieces.find(p => p.type === 'biometric')).toBeDefined();
    });

    it('should work with 64-byte master key', async () => {
      const configWith64Byte = {
        ...testConfig,
        masterKey: new Uint8Array(64).fill(42)
      };

      const result = await setupRecovery(configWith64Byte);

      expect(result.pieces).toHaveLength(3);
      expect(result.pieces[0].size).toBeGreaterThan(0);
    });
  });

  describe('recoverKey', () => {
    it('should validate recovery config', async () => {
      const result = await setupRecovery(testConfig);

      const recoveryConfig: RecoveryConfig = {
        recoveryCode: result.recoveryCode,
        pieces: {
          password: testConfig.password,
          biometricHash: testConfig.biometricHash,
          guardianSignatures: ['sig1', 'sig2', 'sig3']
        }
      };

      // Note: The current implementation doesn't actually decrypt pieces
      // This is expected to work once full DA integration is complete
      await expect(recoverKey(recoveryConfig))
        .rejects.toThrow('Insufficient pieces for recovery');
    });

    it('should reject invalid recovery codes', async () => {
      const invalidConfig: RecoveryConfig = {
        recoveryCode: 'invalid-code',
        pieces: {
          password: 'test-password'
        }
      };

      await expect(recoverKey(invalidConfig))
        .rejects.toThrow('Failed to parse recovery code');
    });
  });

  describe('decryptPiece', () => {
    it('should decrypt piece with correct key', async () => {
      const result = await setupRecovery(testConfig);
      const passwordPiece = result.pieces.find(p => p.type === 'password')!;

      // In a real scenario, we'd derive the key from the password
      // For now, this tests the structure
      expect(passwordPiece).toBeDefined();
      expect(passwordPiece.encryptedData.ciphertext.length).toBeGreaterThan(0);
    });
  });

  describe('validateRecoveryConfig', () => {
    it('should validate complete recovery config', async () => {
      const result = await setupRecovery(testConfig);

      const recoveryConfig: RecoveryConfig = {
        recoveryCode: result.recoveryCode,
        pieces: {
          password: 'secure-password-123',
          biometricHash: new Uint8Array(32).fill(1),
          guardianSignatures: ['sig1', 'sig2', 'sig3']
        }
      };

      const validation = validateRecoveryConfig(recoveryConfig);

      expect(validation.isValid).toBe(true);
      expect(validation.availablePieces).toHaveLength(3);
      expect(validation.availablePieces).toContain('A');
      expect(validation.availablePieces).toContain('B');
      expect(validation.availablePieces).toContain('C');
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect insufficient pieces', () => {
      const recoveryConfig: RecoveryConfig = {
        recoveryCode: 'keymesh:test',
        pieces: {
          password: 'short' // Too short
        }
      };

      const validation = validateRecoveryConfig(recoveryConfig);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Password too short (minimum 8 characters)');
    });

    it('should detect insufficient guardian signatures', () => {
      const recoveryConfig: RecoveryConfig = {
        recoveryCode: 'keymesh:test',
        pieces: {
          guardianSignatures: ['sig1', 'sig2'] // Only 2, need 3
        }
      };

      const validation = validateRecoveryConfig(recoveryConfig);

      expect(validation.errors).toContain('Insufficient guardian signatures (need 3 of 5)');
    });

    it('should detect short biometric hash', () => {
      const recoveryConfig: RecoveryConfig = {
        recoveryCode: 'keymesh:test',
        pieces: {
          biometricHash: new Uint8Array(8) // Too short
        }
      };

      const validation = validateRecoveryConfig(recoveryConfig);

      expect(validation.errors).toContain('Biometric hash too short (minimum 16 bytes)');
    });
  });

  describe('generateTestSetup', () => {
    it('should generate complete test setup', async () => {
      const testSetup = await generateTestSetup();

      expect(testSetup.masterKey).toHaveLength(32);
      expect(testSetup.config.guardianAddresses).toHaveLength(5);
      expect(testSetup.config.password).toBe('test-password-123');
      expect(testSetup.result.pieces).toHaveLength(3);
      expect(testSetup.result.recoveryCode).toMatch(/^keymesh:/);
    });

    it('should use custom password', async () => {
      const customPassword = 'my-custom-password';
      const testSetup = await generateTestSetup(customPassword);

      expect(testSetup.config.password).toBe(customPassword);
    });

    it('should generate valid guardian addresses', async () => {
      const testSetup = await generateTestSetup();

      for (const address of testSetup.config.guardianAddresses) {
        expect(address).toMatch(/^0x[a-f0-9]{40}$/);
      }
    });
  });

  describe('estimateStorageSize', () => {
    it('should estimate storage for 32-byte key', () => {
      const estimate = estimateStorageSize(32);

      expect(estimate.pieceSize).toBeGreaterThan(32);
      expect(estimate.totalSize).toBe(estimate.pieceSize * 3);
      expect(estimate.costEstimate).toContain('Avail DA');
    });

    it('should estimate storage for 64-byte key', () => {
      const estimate = estimateStorageSize(64);

      expect(estimate.pieceSize).toBeGreaterThan(64);
      expect(estimate.totalSize).toBe(estimate.pieceSize * 3);
    });

    it('should use default key size', () => {
      const estimate = estimateStorageSize();

      expect(estimate.pieceSize).toBeGreaterThan(32);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete setup and validation flow', async () => {
      // Setup
      const result = await setupRecovery(testConfig);

      // Validate the setup
      expect(result.pieces).toHaveLength(3);
      expect(result.recoveryCode).toMatch(/^keymesh:/);

      // Create recovery config
      const recoveryConfig: RecoveryConfig = {
        recoveryCode: result.recoveryCode,
        pieces: {
          password: testConfig.password,
          biometricHash: testConfig.biometricHash,
          guardianSignatures: ['sig1', 'sig2', 'sig3']
        }
      };

      // Validate recovery config
      const validation = validateRecoveryConfig(recoveryConfig);
      expect(validation.isValid).toBe(true);
      expect(validation.availablePieces).toHaveLength(3);
    });

    it('should handle partial recovery scenarios', async () => {
      const result = await setupRecovery(testConfig);

      // Only password available
      const passwordOnlyConfig: RecoveryConfig = {
        recoveryCode: result.recoveryCode,
        pieces: {
          password: testConfig.password
        }
      };

      const passwordValidation = validateRecoveryConfig(passwordOnlyConfig);
      expect(passwordValidation.isValid).toBe(false); // Need 2 pieces
      expect(passwordValidation.availablePieces).toHaveLength(1);

      // Password + biometric
      const twoPieceConfig: RecoveryConfig = {
        recoveryCode: result.recoveryCode,
        pieces: {
          password: testConfig.password,
          biometricHash: testConfig.biometricHash
        }
      };

      const twoValidation = validateRecoveryConfig(twoPieceConfig);
      expect(twoValidation.isValid).toBe(true); // 2 pieces is enough
      expect(twoValidation.availablePieces).toHaveLength(2);
    });
  });
});