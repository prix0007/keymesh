/**
 * @fileoverview Tests for biometric authentication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createBiometricProvider,
  normalizeBiometricData,
  isBiometricSupported,
  getBiometricCapabilities,
  MockBiometricProvider,
  WebBiometricProvider,
  BiometricType,
  type BiometricConfig
} from '../biometric/biometric.js';

describe('Biometric Authentication', () => {
  describe('MockBiometricProvider', () => {
    let provider: MockBiometricProvider;

    beforeEach(() => {
      provider = new MockBiometricProvider();
    });

    it('should report capabilities', async () => {
      const capabilities = await provider.getCapabilities();

      expect(capabilities.fingerprint).toBe(true);
      expect(capabilities.faceID).toBe(true);
      expect(capabilities.voiceID).toBe(false);
      expect(capabilities.touchID).toBe(true);
    });

    it('should be available', async () => {
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    it('should enroll biometric data', async () => {
      const result = await provider.enroll({
        preferredType: BiometricType.FINGERPRINT
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.type).toBe(BiometricType.FINGERPRINT);
    });

    it('should authenticate after enrollment', async () => {
      await provider.enroll();

      const result = await provider.authenticate();

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Uint8Array);
    });

    it('should fail authentication without enrollment', async () => {
      const result = await provider.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No biometric data enrolled');
    });

    it('should remove enrollment', async () => {
      await provider.enroll();
      const removed = await provider.remove();

      expect(removed).toBe(true);

      const authResult = await provider.authenticate();
      expect(authResult.success).toBe(false);
    });

    it('should use preferred biometric type', async () => {
      const config: BiometricConfig = {
        preferredType: BiometricType.FACE_ID
      };

      const enrollResult = await provider.enroll(config);
      expect(enrollResult.type).toBe(BiometricType.FACE_ID);

      const authResult = await provider.authenticate(config);
      expect(authResult.type).toBe(BiometricType.FACE_ID);
    });
  });

  describe('WebBiometricProvider', () => {
    let provider: WebBiometricProvider;
    let originalNavigator: any;
    let originalPublicKeyCredential: any;

    beforeEach(() => {
      // Save original values
      originalNavigator = global.navigator;
      originalPublicKeyCredential = global.PublicKeyCredential;

      provider = new WebBiometricProvider();

      // Mock WebAuthn APIs
      Object.defineProperty(global, 'navigator', {
        value: {
          credentials: {
            create: vi.fn(),
            get: vi.fn()
          }
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(global, 'PublicKeyCredential', {
        value: {
          isUserVerifyingPlatformAuthenticatorAvailable: vi.fn()
        },
        writable: true,
        configurable: true
      });
    });

    afterEach(() => {
      // Restore original values
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true
      });

      Object.defineProperty(global, 'PublicKeyCredential', {
        value: originalPublicKeyCredential,
        writable: true,
        configurable: true
      });
    });

    it('should check capabilities based on WebAuthn availability', async () => {
      (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable as any)
        .mockResolvedValue(true);

      const capabilities = await provider.getCapabilities();

      expect(capabilities.fingerprint).toBe(true);
      expect(capabilities.faceID).toBe(true);
      expect(capabilities.touchID).toBe(true);
      expect(capabilities.voiceID).toBe(false);
    });

    it('should detect unavailable WebAuthn', async () => {
      // Remove credentials API
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true
      });

      const capabilities = await provider.getCapabilities();

      expect(capabilities.fingerprint).toBe(false);
      expect(capabilities.faceID).toBe(false);
      expect(capabilities.touchID).toBe(false);
    });

    it('should handle enrollment failure', async () => {
      (navigator.credentials.create as any).mockRejectedValue(
        new Error('User cancelled')
      );

      const result = await provider.enroll();

      expect(result.success).toBe(false);
      expect(result.error).toContain('User cancelled');
    });

    it('should handle authentication failure', async () => {
      const result = await provider.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No biometric credential enrolled');
    });
  });

  describe('Factory functions', () => {
    it('should create appropriate provider for browser environment', () => {
      // Mock browser environment
      const mockNavigator = {};
      Object.defineProperty(global, 'window', {
        value: { navigator: mockNavigator },
        writable: true,
        configurable: true
      });
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true
      });

      const provider = createBiometricProvider();

      expect(provider).toBeInstanceOf(WebBiometricProvider);
    });

    it('should create mock provider for non-browser environment', () => {
      // Mock Node.js environment
      delete (global as any).window;
      delete (global as any).navigator;

      const provider = createBiometricProvider();

      expect(provider).toBeInstanceOf(MockBiometricProvider);
    });

    it('should check biometric support', async () => {
      const supported = await isBiometricSupported();
      expect(typeof supported).toBe('boolean');
    });

    it('should get biometric capabilities', async () => {
      const capabilities = await getBiometricCapabilities();

      expect(capabilities).toHaveProperty('fingerprint');
      expect(capabilities).toHaveProperty('faceID');
      expect(capabilities).toHaveProperty('voiceID');
      expect(capabilities).toHaveProperty('touchID');
    });
  });

  describe('Utility functions', () => {
    describe('normalizeBiometricData', () => {
      it('should return data unchanged if correct length', () => {
        const data = new Uint8Array(32).fill(42);
        const normalized = normalizeBiometricData(data, 32);

        expect(normalized).toEqual(data);
      });

      it('should truncate if data is longer', () => {
        const data = new Uint8Array(64).fill(42);
        const normalized = normalizeBiometricData(data, 32);

        expect(normalized).toHaveLength(32);
        expect(normalized).toEqual(new Uint8Array(32).fill(42));
      });

      it('should pad with zeros if data is shorter', () => {
        const data = new Uint8Array([1, 2, 3, 4, 5]);
        const normalized = normalizeBiometricData(data, 32);

        expect(normalized).toHaveLength(32);
        expect(normalized.slice(0, 5)).toEqual(data);
        expect(normalized.slice(5)).toEqual(new Uint8Array(27).fill(0));
      });

      it('should use default length of 32', () => {
        const data = new Uint8Array([1, 2, 3]);
        const normalized = normalizeBiometricData(data);

        expect(normalized).toHaveLength(32);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete enrollment and authentication flow', async () => {
      const provider = new MockBiometricProvider();

      // Initial state
      expect(await provider.isAvailable()).toBe(true);

      // Enrollment
      const enrollResult = await provider.enroll();
      expect(enrollResult.success).toBe(true);

      // Authentication
      const authResult = await provider.authenticate();
      expect(authResult.success).toBe(true);
      expect(authResult.data).toEqual(enrollResult.data);

      // Removal
      const removed = await provider.remove();
      expect(removed).toBe(true);

      // Authentication should fail after removal
      const authAfterRemoval = await provider.authenticate();
      expect(authAfterRemoval.success).toBe(false);
    });

    it('should handle different biometric types', async () => {
      const provider = new MockBiometricProvider();

      const types = [
        BiometricType.FINGERPRINT,
        BiometricType.FACE_ID,
        BiometricType.TOUCH_ID
      ];

      for (const type of types) {
        const config: BiometricConfig = { preferredType: type };

        const enrollResult = await provider.enroll(config);
        expect(enrollResult.success).toBe(true);
        expect(enrollResult.type).toBe(type);

        const authResult = await provider.authenticate(config);
        expect(authResult.success).toBe(true);
        expect(authResult.type).toBe(type);

        await provider.remove();
      }
    });

    it('should handle timeouts', async () => {
      const provider = new MockBiometricProvider();

      const config: BiometricConfig = {
        timeout: 1000
      };

      // Mock provider doesn't actually use timeout, but should accept it
      const result = await provider.enroll(config);
      expect(result.success).toBe(true);
    });

    it('should provide consistent data normalization', () => {
      const testCases = [
        { input: new Uint8Array([]), expected: 32 },
        { input: new Uint8Array(16), expected: 32 },
        { input: new Uint8Array(32), expected: 32 },
        { input: new Uint8Array(64), expected: 32 }
      ];

      for (const testCase of testCases) {
        const normalized = normalizeBiometricData(testCase.input);
        expect(normalized).toHaveLength(testCase.expected);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle provider initialization errors gracefully', () => {
      // This should not throw
      const provider = createBiometricProvider();
      expect(provider).toBeDefined();
    });

    it('should handle malformed biometric data', () => {
      const malformedData = new Uint8Array([255, 255, 255]);
      const normalized = normalizeBiometricData(malformedData);

      expect(normalized).toHaveLength(32);
      expect(normalized.slice(0, 3)).toEqual(malformedData);
    });

    it('should handle concurrent operations', async () => {
      const provider = new MockBiometricProvider();

      // Concurrent enrollments
      const enrollPromises = [
        provider.enroll(),
        provider.enroll(),
        provider.enroll()
      ];

      const results = await Promise.all(enrollPromises);

      // All should succeed (last one wins)
      for (const result of results) {
        expect(result.success).toBe(true);
      }
    });
  });
});