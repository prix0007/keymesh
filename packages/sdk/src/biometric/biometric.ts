/**
 * @fileoverview Biometric interface for Keymesh SDK
 * Provides abstraction layer for various biometric authentication methods
 */

export interface BiometricCapabilities {
  fingerprint: boolean;
  faceID: boolean;
  voiceID: boolean;
  touchID: boolean;
}

export interface BiometricResult {
  success: boolean;
  data?: Uint8Array;
  error?: string;
  type?: BiometricType;
}

export enum BiometricType {
  FINGERPRINT = 'fingerprint',
  FACE_ID = 'faceID',
  VOICE_ID = 'voiceID',
  TOUCH_ID = 'touchID',
  PATTERN = 'pattern'
}

export interface BiometricConfig {
  preferredType?: BiometricType;
  fallbackToPattern?: boolean;
  requireLiveness?: boolean;
  timeout?: number;
}

/**
 * Abstract biometric provider interface
 * Implementations should handle platform-specific biometric operations
 */
export abstract class BiometricProvider {
  abstract getCapabilities(): Promise<BiometricCapabilities>;
  abstract isAvailable(): Promise<boolean>;
  abstract authenticate(config?: BiometricConfig): Promise<BiometricResult>;
  abstract enroll(config?: BiometricConfig): Promise<BiometricResult>;
  abstract remove(): Promise<boolean>;
}

/**
 * Mock biometric provider for testing and development
 */
export class MockBiometricProvider extends BiometricProvider {
  private enrolled: boolean = false;
  private mockData: Uint8Array = new Uint8Array([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
    0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
    0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20
  ]);

  async getCapabilities(): Promise<BiometricCapabilities> {
    return {
      fingerprint: true,
      faceID: true,
      voiceID: false,
      touchID: true
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async authenticate(config?: BiometricConfig): Promise<BiometricResult> {
    if (!this.enrolled) {
      return {
        success: false,
        error: 'No biometric data enrolled'
      };
    }

    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      data: this.mockData,
      type: config?.preferredType || BiometricType.FINGERPRINT
    };
  }

  async enroll(config?: BiometricConfig): Promise<BiometricResult> {
    // Simulate enrollment delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    this.enrolled = true;
    return {
      success: true,
      data: this.mockData,
      type: config?.preferredType || BiometricType.FINGERPRINT
    };
  }

  async remove(): Promise<boolean> {
    this.enrolled = false;
    return true;
  }
}

/**
 * Web-based biometric provider using WebAuthn API
 */
export class WebBiometricProvider extends BiometricProvider {
  private credential: PublicKeyCredential | null = null;

  async getCapabilities(): Promise<BiometricCapabilities> {
    const isWebAuthnSupported = 'credentials' in navigator && 'create' in navigator.credentials;

    if (!isWebAuthnSupported) {
      return {
        fingerprint: false,
        faceID: false,
        voiceID: false,
        touchID: false
      };
    }

    // Check for platform authenticator (built-in biometrics)
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

    return {
      fingerprint: available,
      faceID: available,
      voiceID: false,
      touchID: available
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const capabilities = await this.getCapabilities();
      return capabilities.fingerprint || capabilities.faceID || capabilities.touchID;
    } catch {
      return false;
    }
  }

  async authenticate(config?: BiometricConfig): Promise<BiometricResult> {
    try {
      if (!this.credential) {
        return {
          success: false,
          error: 'No biometric credential enrolled'
        };
      }

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{
            id: this.credential.rawId,
            type: 'public-key'
          }],
          userVerification: 'required',
          timeout: config?.timeout || 60000
        }
      }) as PublicKeyCredential;

      if (!assertion || !assertion.response) {
        return {
          success: false,
          error: 'Authentication failed'
        };
      }

      // Extract biometric data from assertion
      const response = assertion.response as AuthenticatorAssertionResponse;
      const biometricData = new Uint8Array(response.signature);

      return {
        success: true,
        data: biometricData,
        type: BiometricType.FINGERPRINT
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  async enroll(config?: BiometricConfig): Promise<BiometricResult> {
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: {
            name: 'Keymesh',
            id: typeof location !== 'undefined' ? location.hostname : 'localhost'
          },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: 'user@keymesh.xyz',
            displayName: 'Keymesh User'
          },
          pubKeyCredParams: [{
            alg: -7, // ES256
            type: 'public-key'
          }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false
          },
          timeout: config?.timeout || 60000
        }
      }) as PublicKeyCredential;

      if (!credential || !credential.response) {
        return {
          success: false,
          error: 'Enrollment failed'
        };
      }

      this.credential = credential;

      // Extract biometric data from credential
      const response = credential.response as AuthenticatorAttestationResponse;
      const biometricData = new Uint8Array(response.getPublicKey() || new ArrayBuffer(32));

      return {
        success: true,
        data: biometricData,
        type: BiometricType.FINGERPRINT
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Enrollment failed'
      };
    }
  }

  async remove(): Promise<boolean> {
    this.credential = null;
    return true;
  }
}

/**
 * Factory function to create appropriate biometric provider based on environment
 */
export function createBiometricProvider(): BiometricProvider {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined' && 'navigator' in window) {
    return new WebBiometricProvider();
  }

  // Default to mock provider for development/testing
  return new MockBiometricProvider();
}

/**
 * Utility function to normalize biometric data for consistent hashing
 */
export function normalizeBiometricData(data: Uint8Array, length: number = 32): Uint8Array {
  if (data.length === length) {
    return data;
  }

  if (data.length > length) {
    // Truncate if longer
    return data.slice(0, length);
  }

  // Pad with zeros if shorter
  const padded = new Uint8Array(length);
  padded.set(data);
  return padded;
}

/**
 * Check if biometric authentication is supported and available
 */
export async function isBiometricSupported(): Promise<boolean> {
  const provider = createBiometricProvider();
  return provider.isAvailable();
}

/**
 * Get available biometric capabilities
 */
export async function getBiometricCapabilities(): Promise<BiometricCapabilities> {
  const provider = createBiometricProvider();
  return provider.getCapabilities();
}