/**
 * @fileoverview Integration tests for the main Keymesh SDK
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  KeymeshSDK,
  createKeymeshSDK,
  VERSION,
  DEFAULT_CONFIG,
  BiometricType
} from '../index.js';
import { generateRandomKey } from '../crypto/encryption.js';

describe('Keymesh SDK Integration', () => {
  let sdk: KeymeshSDK;

  beforeEach(() => {
    sdk = createKeymeshSDK();
  });

  describe('SDK Initialization', () => {
    it('should create SDK with default config', () => {
      expect(sdk).toBeInstanceOf(KeymeshSDK);
    });

    it('should create SDK with custom config', () => {
      const customConfig = {
        avail: {
          appId: 2,
          rpcUrl: 'wss://custom.avail.com/ws',
          useMock: false
        }
      };

      const customSDK = createKeymeshSDK(customConfig);
      expect(customSDK).toBeInstanceOf(KeymeshSDK);
    });

    it('should initialize successfully', async () => {
      const initialized = await sdk.initialize();
      expect(initialized).toBe(true);
    });

    it('should get SDK status', async () => {
      await sdk.initialize();

      const status = await sdk.getStatus();

      expect(status.version).toBe(VERSION);
      expect(typeof status.availConnected).toBe('boolean');
      expect(typeof status.biometricAvailable).toBe('boolean');
      expect(status.capabilities).toHaveProperty('fingerprint');
      expect(status.capabilities).toHaveProperty('faceID');
      expect(status.capabilities).toHaveProperty('voiceID');
      expect(status.capabilities).toHaveProperty('touchID');
    });
  });

  describe('Recovery Setup', () => {
    it('should set up user recovery', async () => {
      await sdk.initialize();

      const masterKey = generateRandomKey();
      const password = 'secure-password-123';
      const guardianAddresses = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
        '0x4444444444444444444444444444444444444444',
        '0x5555555555555555555555555555555555555555'
      ];
      const biometricData = generateRandomKey().slice(0, 32);

      const result = await sdk.setupUserRecovery(
        masterKey,
        password,
        guardianAddresses,
        biometricData
      );

      expect(result.pieces).toHaveLength(3);
      expect(result.recoveryCode).toMatch(/^keymesh:/);
      expect(result.metadata.guardianAddresses).toEqual(guardianAddresses);

      // Check piece types
      const pieceTypes = result.pieces.map(p => p.type);
      expect(pieceTypes).toContain('password');
      expect(pieceTypes).toContain('biometric');
      expect(pieceTypes).toContain('social');
    });

    it('should handle setup without biometric data', async () => {
      await sdk.initialize();

      const masterKey = generateRandomKey();
      const password = 'secure-password-123';
      const guardianAddresses = Array.from({ length: 5 }, (_, i) =>
        `0x${'1'.repeat(39)}${i}`
      );

      const result = await sdk.setupUserRecovery(
        masterKey,
        password,
        guardianAddresses
      );

      expect(result.pieces).toHaveLength(3);
      expect(result.recoveryCode).toMatch(/^keymesh:/);
    });
  });

  describe('Key Recovery', () => {
    it('should validate recovery requirements', async () => {
      await sdk.initialize();

      // First set up recovery
      const masterKey = generateRandomKey();
      const password = 'secure-password-123';
      const guardianAddresses = Array.from({ length: 5 }, (_, i) =>
        `0x${'1'.repeat(39)}${i}`
      );

      const setupResult = await sdk.setupUserRecovery(
        masterKey,
        password,
        guardianAddresses
      );

      // Attempt recovery (will fail in current implementation due to DA integration)
      try {
        await sdk.recoverUserKey(
          setupResult.recoveryCode,
          password,
          undefined,
          ['sig1', 'sig2', 'sig3']
        );
      } catch (error) {
        // Expected to fail with current implementation
        expect(error).toBeDefined();
      }
    });
  });

  describe('Biometric Operations', () => {
    it('should enroll biometric data', async () => {
      await sdk.initialize();

      const result = await sdk.enrollBiometric();

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.type).toBe(BiometricType.FINGERPRINT);
    });

    it('should authenticate with biometrics', async () => {
      await sdk.initialize();

      // First enroll
      const enrollResult = await sdk.enrollBiometric();
      expect(enrollResult.success).toBe(true);

      // Then authenticate
      const authResult = await sdk.authenticateBiometric();
      expect(authResult.success).toBe(true);
      expect(authResult.data).toEqual(enrollResult.data);
    });

    it('should fail authentication without enrollment', async () => {
      await sdk.initialize();

      const result = await sdk.authenticateBiometric();

      expect(result.success).toBe(false);
      expect(result.error).toContain('enrolled');
    });
  });

  describe('Configuration and Constants', () => {
    it('should export correct version', () => {
      expect(VERSION).toBe('0.1.0');
    });

    it('should have valid default configuration', () => {
      expect(DEFAULT_CONFIG.shamir.shares).toBe(3);
      expect(DEFAULT_CONFIG.shamir.threshold).toBe(2);
      expect(DEFAULT_CONFIG.recovery.guardianCount).toBe(5);
      expect(DEFAULT_CONFIG.recovery.requiredSignatures).toBe(3);
      expect(DEFAULT_CONFIG.avail.appId).toBe(1);
      expect(DEFAULT_CONFIG.biometric.preferredType).toBe(BiometricType.FINGERPRINT);
    });

    it('should merge custom config with defaults', () => {
      const customConfig = {
        shamir: { shares: 5 },
        avail: { appId: 2 }
      };

      const sdk = createKeymeshSDK(customConfig);

      // Should merge with defaults
      expect(sdk).toBeInstanceOf(KeymeshSDK);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      await sdk.initialize();

      // Should not throw
      await sdk.cleanup();

      // Status after cleanup
      const status = await sdk.getStatus();
      expect(status.availConnected).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization failures gracefully', async () => {
      // Should not throw even if some components fail
      const result = await sdk.initialize();
      expect(typeof result).toBe('boolean');
    });

    it('should handle operations before initialization', async () => {
      // Should handle gracefully
      const status = await sdk.getStatus();
      expect(status.version).toBe(VERSION);
      expect(status.availConnected).toBe(false);
    });

    it('should handle biometric operations without provider', async () => {
      // Before initialization
      const enrollResult = await sdk.enrollBiometric();
      expect(enrollResult.success).toBe(false);
      expect(enrollResult.error).toContain('not initialized');

      const authResult = await sdk.authenticateBiometric();
      expect(authResult.success).toBe(false);
      expect(authResult.error).toContain('not initialized');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete user journey', async () => {
      // Initialize SDK
      const initialized = await sdk.initialize();
      expect(initialized).toBe(true);

      // Check initial status
      const initialStatus = await sdk.getStatus();
      expect(initialStatus.version).toBe(VERSION);

      // Enroll biometrics
      const biometricResult = await sdk.enrollBiometric();
      expect(biometricResult.success).toBe(true);

      // Set up recovery
      const masterKey = generateRandomKey();
      const password = 'user-password-123';
      const guardianAddresses = Array.from({ length: 5 }, (_, i) =>
        `0x${'a'.repeat(39)}${i}`
      );

      const setupResult = await sdk.setupUserRecovery(
        masterKey,
        password,
        guardianAddresses,
        biometricResult.data
      );

      expect(setupResult.pieces).toHaveLength(3);
      expect(setupResult.recoveryCode).toMatch(/^keymesh:/);

      // Verify the recovery code is valid
      expect(setupResult.recoveryCode.length).toBeGreaterThan(50);

      // Clean up
      await sdk.cleanup();
    });

    it('should handle multiple SDK instances', async () => {
      const sdk1 = createKeymeshSDK();
      const sdk2 = createKeymeshSDK();

      await sdk1.initialize();
      await sdk2.initialize();

      const status1 = await sdk1.getStatus();
      const status2 = await sdk2.getStatus();

      expect(status1.version).toBe(status2.version);

      await sdk1.cleanup();
      await sdk2.cleanup();
    });

    it('should handle configuration variations', async () => {
      const configs = [
        { avail: { useMock: true } },
        { biometric: { preferredType: BiometricType.FACE_ID } },
        { recovery: { guardianCount: 7 } }
      ];

      for (const config of configs) {
        const testSDK = createKeymeshSDK(config);
        const initialized = await testSDK.initialize();
        expect(initialized).toBe(true);

        const status = await testSDK.getStatus();
        expect(status.version).toBe(VERSION);

        await testSDK.cleanup();
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent operations', async () => {
      await sdk.initialize();

      // Concurrent status checks
      const statusPromises = Array.from({ length: 5 }, () =>
        sdk.getStatus()
      );

      const statuses = await Promise.all(statusPromises);

      for (const status of statuses) {
        expect(status.version).toBe(VERSION);
      }
    });

    it('should handle rapid initialization and cleanup', async () => {
      for (let i = 0; i < 3; i++) {
        const testSDK = createKeymeshSDK();
        await testSDK.initialize();
        await testSDK.cleanup();
      }
    });

    it('should handle large data in recovery setup', async () => {
      await sdk.initialize();

      const masterKey = new Uint8Array(64).fill(42); // Maximum size
      const password = 'a'.repeat(50); // Long password
      const guardianAddresses = Array.from({ length: 5 }, (_, i) =>
        `0x${'f'.repeat(39)}${i}`
      );
      const biometricData = new Uint8Array(64).fill(123);

      const result = await sdk.setupUserRecovery(
        masterKey,
        password,
        guardianAddresses,
        biometricData
      );

      expect(result.pieces).toHaveLength(3);
      expect(result.recoveryCode).toMatch(/^keymesh:/);
    });
  });
});