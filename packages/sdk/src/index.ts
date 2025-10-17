/**
 * @fileoverview Keymesh SDK - Main entry point
 * Social recovery key management system with Avail DA integration
 */

// Core key management
export {
  setupRecovery,
  recoverKey,
  decryptPiece,
  validateRecoveryConfig,
  generateTestSetup,
  estimateStorageSize,
  type RecoverySetupConfig,
  type RecoveryConfig,
  type EncryptedPiece,
  type RecoverySetupResult,
  type RecoveryMetadata,
  type DACommitment,
  type RecoveryResult
} from './core/keyManager.js';

// Cryptographic utilities
export {
  hashPassword,
  hashBiometric,
  deriveGuardianKey,
  encryptData,
  decryptData,
  generateRandomKey,
  secureWipe,
  serializeBundle,
  deserializeBundle,
  type EncryptedBundle,
  SALT_LENGTH,
  IV_LENGTH,
  TAG_LENGTH,
  KEY_LENGTH
} from './crypto/encryption.js';

// Shamir Secret Sharing
export {
  splitSecret,
  reconstructSecret,
  verifyShares,
  serializeShare,
  deserializeShare,
  generateTestData,
  type Share,
  type ShamirConfig
} from './crypto/shamir.js';

// Recovery code utilities
export {
  generateRecoveryCode,
  parseRecoveryCode,
  validateRecoveryCodeFormat,
  generateRecoveryUrl,
  extractRecoveryCodeFromUrl,
  getRecoveryCodeSummary,
  type RecoveryCodeData,
  type ParsedRecoveryCode
} from './utils/recoveryCode.js';

// Biometric authentication
export {
  createBiometricProvider,
  normalizeBiometricData,
  isBiometricSupported,
  getBiometricCapabilities,
  MockBiometricProvider,
  WebBiometricProvider,
  BiometricProvider,
  BiometricType,
  type BiometricCapabilities,
  type BiometricResult,
  type BiometricConfig
} from './biometric/biometric.js';

// Import BiometricType for use in DEFAULT_CONFIG
import { BiometricType, BiometricProvider, createBiometricProvider } from './biometric/biometric.js';

// Import Avail client for SDK
import { AvailClient, createAvailClient } from './da/availClient.js';

// Import functions for SDK
import { setupRecovery } from './core/keyManager.js';
import { serializeBundle } from './crypto/encryption.js';
import { generateRecoveryCode } from './utils/recoveryCode.js';

// Avail DA client
export {
  createAvailClient,
  estimateSubmissionCost,
  validateDACommitment,
  batchSubmitData,
  batchRetrieveData,
  MockAvailClient,
  RealAvailClient,
  AvailClient,
  type AvailConfig,
  type SubmissionResult,
  type RetrievalResult,
  type BlockInfo
} from './da/availClient.js';

/**
 * Keymesh SDK version
 */
export const VERSION = '0.1.0';

/**
 * Default configuration for the SDK
 */
export const DEFAULT_CONFIG = {
  // Shamir Secret Sharing configuration
  shamir: {
    shares: 3,
    threshold: 2
  },

  // Recovery configuration
  recovery: {
    guardianCount: 5,
    requiredSignatures: 3,
    recoveryDelayDays: 7,
    emergencyDelayDays: 14
  },

  // Avail DA configuration
  avail: {
    appId: 1,
    rpcUrl: 'wss://testnet.avail.tools/ws',
    useMock: true // Set to false for production
  },

  // Biometric configuration
  biometric: {
    preferredType: BiometricType.FINGERPRINT,
    fallbackToPattern: true,
    requireLiveness: false,
    timeout: 60000
  }
} as const;

/**
 * Main Keymesh SDK class that provides a high-level interface
 */
export class KeymeshSDK {
  private availClient: AvailClient | null = null;
  private biometricProvider: BiometricProvider | null = null;

  constructor(private config: Partial<typeof DEFAULT_CONFIG> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the SDK with Avail DA and biometric providers
   */
  async initialize(): Promise<boolean> {
    try {
      // Initialize Avail DA client
      this.availClient = createAvailClient(
        this.config.avail || DEFAULT_CONFIG.avail,
        this.config.avail?.useMock ?? true
      );

      const availConnected = await this.availClient.connect();
      if (!availConnected) {
        console.warn('Failed to connect to Avail DA, using mock client');
      }

      // Initialize biometric provider
      this.biometricProvider = createBiometricProvider();
      const biometricAvailable = await this.biometricProvider.isAvailable();
      if (!biometricAvailable) {
        console.warn('Biometric authentication not available');
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize Keymesh SDK:', error);
      return false;
    }
  }

  /**
   * Set up social recovery for a user
   */
  async setupUserRecovery(
    masterKey: Uint8Array,
    password: string,
    guardianAddresses: string[],
    biometricData?: Uint8Array
  ): Promise<RecoverySetupResult> {
    const config: RecoverySetupConfig = {
      masterKey,
      password,
      guardianAddresses,
      biometricHash: biometricData
    };

    const result = await setupRecovery(config);

    // Store encrypted pieces on Avail DA
    if (this.availClient) {
      const commitments: DACommitment[] = [];

      for (const piece of result.pieces) {
        const serializedPiece = serializeBundle(piece.encryptedData);
        const submissionResult = await this.availClient.submitData(serializedPiece);

        if (submissionResult.success && submissionResult.blockNumber && submissionResult.txIndex) {
          commitments.push({
            blockNumber: submissionResult.blockNumber,
            txIndex: submissionResult.txIndex,
            dataHash: submissionResult.dataHash!,
            merkleRoot: submissionResult.merkleRoot!
          });
        }
      }

      // Update recovery code with DA commitments
      const updatedRecoveryCode = generateRecoveryCode(result.metadata, commitments);

      return {
        ...result,
        recoveryCode: updatedRecoveryCode
      };
    }

    return result;
  }

  /**
   * Recover a user's key using available pieces
   */
  async recoverUserKey(
    recoveryCode: string,
    password?: string,
    biometricData?: Uint8Array,
    guardianSignatures?: string[]
  ): Promise<RecoveryResult> {
    const config: RecoveryConfig = {
      recoveryCode,
      pieces: {
        password,
        biometricHash: biometricData,
        guardianSignatures
      }
    };

    // For now, use the basic recovery function
    // In a full implementation, this would fetch pieces from Avail DA
    return recoverKey(config);
  }

  /**
   * Enroll biometric data
   */
  async enrollBiometric(): Promise<BiometricResult> {
    if (!this.biometricProvider) {
      return {
        success: false,
        error: 'Biometric provider not initialized'
      };
    }

    return this.biometricProvider.enroll(this.config.biometric);
  }

  /**
   * Authenticate with biometrics
   */
  async authenticateBiometric(): Promise<BiometricResult> {
    if (!this.biometricProvider) {
      return {
        success: false,
        error: 'Biometric provider not initialized'
      };
    }

    return this.biometricProvider.authenticate(this.config.biometric);
  }

  /**
   * Get SDK status and capabilities
   */
  async getStatus(): Promise<{
    version: string;
    availConnected: boolean;
    biometricAvailable: boolean;
    capabilities: BiometricCapabilities;
  }> {
    const capabilities = this.biometricProvider
      ? await this.biometricProvider.getCapabilities()
      : { fingerprint: false, faceID: false, voiceID: false, touchID: false };

    const biometricAvailable = this.biometricProvider
      ? await this.biometricProvider.isAvailable()
      : false;

    return {
      version: VERSION,
      availConnected: this.availClient?.isConnected() ?? false,
      biometricAvailable,
      capabilities
    };
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup(): Promise<void> {
    if (this.availClient) {
      await this.availClient.disconnect();
      this.availClient = null;
    }

    this.biometricProvider = null;
  }
}

/**
 * Create a new Keymesh SDK instance
 */
export function createKeymeshSDK(config?: Partial<typeof DEFAULT_CONFIG>): KeymeshSDK {
  return new KeymeshSDK(config);
}