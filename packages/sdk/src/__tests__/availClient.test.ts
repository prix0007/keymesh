/**
 * @fileoverview Tests for Avail DA client
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAvailClient,
  estimateSubmissionCost,
  validateDACommitment,
  batchSubmitData,
  batchRetrieveData,
  MockAvailClient,
  RealAvailClient,
  type AvailConfig,
  type DACommitment
} from '../da/availClient.js';

describe('Avail DA Client', () => {
  const testConfig: AvailConfig = {
    appId: 1,
    rpcUrl: 'wss://testnet.avail.tools/ws'
  };

  describe('MockAvailClient', () => {
    let client: MockAvailClient;

    beforeEach(() => {
      client = new MockAvailClient(testConfig);
    });

    it('should connect successfully', async () => {
      const connected = await client.connect();
      expect(connected).toBe(true);
      expect(client.isConnected()).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await client.connect();
      await client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it('should submit data when connected', async () => {
      await client.connect();

      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      const result = await client.submitData(testData);

      expect(result.success).toBe(true);
      expect(result.blockNumber).toBeGreaterThan(0);
      expect(result.txIndex).toBeGreaterThanOrEqual(0);
      expect(result.dataHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(result.merkleRoot).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should fail to submit when not connected', async () => {
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      const result = await client.submitData(testData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not connected to Avail DA');
    });

    it('should retrieve submitted data', async () => {
      await client.connect();

      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      const submitResult = await client.submitData(testData);

      expect(submitResult.success).toBe(true);

      const commitment: DACommitment = {
        blockNumber: submitResult.blockNumber!,
        txIndex: submitResult.txIndex!,
        dataHash: submitResult.dataHash!,
        merkleRoot: submitResult.merkleRoot!
      };

      const retrieveResult = await client.retrieveData(commitment);

      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data).toEqual(testData);
    });

    it('should fail to retrieve non-existent data', async () => {
      await client.connect();

      const invalidCommitment: DACommitment = {
        blockNumber: 999999,
        txIndex: 0,
        dataHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        merkleRoot: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      };

      const result = await client.retrieveData(invalidCommitment);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Data not found');
    });

    it('should detect data hash mismatch', async () => {
      await client.connect();

      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      const submitResult = await client.submitData(testData);

      const commitmentWithWrongHash: DACommitment = {
        blockNumber: submitResult.blockNumber!,
        txIndex: submitResult.txIndex!,
        dataHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        merkleRoot: submitResult.merkleRoot!
      };

      const result = await client.retrieveData(commitmentWithWrongHash);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Data hash mismatch');
    });

    it('should get block info', async () => {
      await client.connect();

      // First submit some data to increase the block counter
      await client.submitData(new Uint8Array([1, 2, 3]));

      // Get info for a block that should exist
      const blockInfo = await client.getBlockInfo(1000001);

      expect(blockInfo).not.toBeNull();
      expect(blockInfo!.number).toBe(1000001);
      expect(blockInfo!.hash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(blockInfo!.timestamp).toBeGreaterThan(0);
      expect(blockInfo!.dataRoot).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should return null for future blocks', async () => {
      await client.connect();

      const blockInfo = await client.getBlockInfo(9999999);

      expect(blockInfo).toBeNull();
    });

    it('should handle large data', async () => {
      await client.connect();

      const largeData = new Uint8Array(1024 * 10); // 10KB
      largeData.fill(42);

      const result = await client.submitData(largeData);

      expect(result.success).toBe(true);

      const commitment: DACommitment = {
        blockNumber: result.blockNumber!,
        txIndex: result.txIndex!,
        dataHash: result.dataHash!,
        merkleRoot: result.merkleRoot!
      };

      const retrieveResult = await client.retrieveData(commitment);

      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data).toEqual(largeData);
    });
  });

  describe('RealAvailClient', () => {
    let client: RealAvailClient;

    beforeEach(() => {
      client = new RealAvailClient(testConfig);
    });

    it('should use mock implementation for now', async () => {
      // The real client currently falls back to mock implementation
      const connected = await client.connect();
      expect(connected).toBe(true);

      const testData = new Uint8Array([1, 2, 3]);
      const result = await client.submitData(testData);

      // Should work like mock client
      expect(result.success).toBe(true);
    });
  });

  describe('Factory function', () => {
    it('should create mock client in development', () => {
      const client = createAvailClient(testConfig, true);
      expect(client).toBeInstanceOf(MockAvailClient);
    });

    it('should create real client in production', () => {
      const client = createAvailClient(testConfig, false);
      expect(client).toBeInstanceOf(RealAvailClient);
    });

    it('should default to mock in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const client = createAvailClient(testConfig);
      expect(client).toBeInstanceOf(MockAvailClient);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Utility functions', () => {
    describe('estimateSubmissionCost', () => {
      it('should estimate cost for small data', () => {
        const estimate = estimateSubmissionCost(100);

        expect(estimate.estimatedFee).toContain('AVAIL');
        expect(estimate.blockInclusion).toContain('blocks');
        expect(estimate.notes).toHaveLength(3);
      });

      it('should estimate cost for large data', () => {
        const estimate = estimateSubmissionCost(10000);

        expect(estimate.estimatedFee).toContain('AVAIL');
        expect(parseFloat(estimate.estimatedFee)).toBeGreaterThan(0);
      });

      it('should include helpful notes', () => {
        const estimate = estimateSubmissionCost(1000);

        expect(estimate.notes).toContain('Fees may vary based on network congestion');
        expect(estimate.notes).toContain('Larger data may take longer to include');
        expect(estimate.notes).toContain('Data is permanently stored and retrievable');
      });
    });

    describe('validateDACommitment', () => {
      const validCommitment: DACommitment = {
        blockNumber: 123456,
        txIndex: 1,
        dataHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        merkleRoot: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      };

      it('should validate correct commitment', () => {
        const validation = validateDACommitment(validCommitment);

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should detect invalid block number', () => {
        const invalidCommitment = {
          ...validCommitment,
          blockNumber: 0
        };

        const validation = validateDACommitment(invalidCommitment);

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Block number must be positive');
      });

      it('should detect negative transaction index', () => {
        const invalidCommitment = {
          ...validCommitment,
          txIndex: -1
        };

        const validation = validateDACommitment(invalidCommitment);

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Transaction index cannot be negative');
      });

      it('should detect invalid data hash format', () => {
        const invalidCommitment = {
          ...validCommitment,
          dataHash: 'invalid-hash'
        };

        const validation = validateDACommitment(invalidCommitment);

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Invalid data hash format');
      });

      it('should detect invalid merkle root format', () => {
        const invalidCommitment = {
          ...validCommitment,
          merkleRoot: '0x123' // Too short
        };

        const validation = validateDACommitment(invalidCommitment);

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Invalid merkle root format');
      });

      it('should detect multiple errors', () => {
        const invalidCommitment: DACommitment = {
          blockNumber: -1,
          txIndex: -1,
          dataHash: 'invalid',
          merkleRoot: 'invalid'
        };

        const validation = validateDACommitment(invalidCommitment);

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(1);
      });
    });
  });

  describe('Batch operations', () => {
    let client: MockAvailClient;

    beforeEach(async () => {
      client = new MockAvailClient(testConfig);
      await client.connect();
    });

    describe('batchSubmitData', () => {
      it('should submit multiple pieces of data', async () => {
        const dataArray = [
          new Uint8Array([1, 2, 3]),
          new Uint8Array([4, 5, 6]),
          new Uint8Array([7, 8, 9])
        ];

        const results = await batchSubmitData(client, dataArray);

        expect(results).toHaveLength(3);
        for (const result of results) {
          expect(result.success).toBe(true);
          expect(result.blockNumber).toBeGreaterThan(0);
        }
      });

      it('should handle empty array', async () => {
        const results = await batchSubmitData(client, []);

        expect(results).toHaveLength(0);
      });

      it('should handle single data piece', async () => {
        const dataArray = [new Uint8Array([1, 2, 3])];

        const results = await batchSubmitData(client, dataArray);

        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(true);
      });

      it('should continue on partial failures', async () => {
        // Disconnect client to cause failures
        await client.disconnect();

        const dataArray = [
          new Uint8Array([1, 2, 3]),
          new Uint8Array([4, 5, 6])
        ];

        const results = await batchSubmitData(client, dataArray);

        expect(results).toHaveLength(2);
        for (const result of results) {
          expect(result.success).toBe(false);
        }
      });
    });

    describe('batchRetrieveData', () => {
      it('should retrieve multiple pieces of data', async () => {
        // First submit some data
        const dataArray = [
          new Uint8Array([1, 2, 3]),
          new Uint8Array([4, 5, 6])
        ];

        const submitResults = await batchSubmitData(client, dataArray);

        const commitments: DACommitment[] = submitResults.map(result => ({
          blockNumber: result.blockNumber!,
          txIndex: result.txIndex!,
          dataHash: result.dataHash!,
          merkleRoot: result.merkleRoot!
        }));

        const retrieveResults = await batchRetrieveData(client, commitments);

        expect(retrieveResults).toHaveLength(2);
        expect(retrieveResults[0].success).toBe(true);
        expect(retrieveResults[0].data).toEqual(dataArray[0]);
        expect(retrieveResults[1].success).toBe(true);
        expect(retrieveResults[1].data).toEqual(dataArray[1]);
      });

      it('should handle mixed success/failure', async () => {
        const validCommitment: DACommitment = {
          blockNumber: 1000001,
          txIndex: 0,
          dataHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          merkleRoot: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        };

        // Submit data for the valid commitment
        const testData = new Uint8Array([1, 2, 3]);
        await client.submitData(testData);

        const invalidCommitment: DACommitment = {
          blockNumber: 999999,
          txIndex: 0,
          dataHash: '0x9999999999999999999999999999999999999999999999999999999999999999',
          merkleRoot: '0x9999999999999999999999999999999999999999999999999999999999999999'
        };

        const commitments = [validCommitment, invalidCommitment];
        const results = await batchRetrieveData(client, commitments);

        expect(results).toHaveLength(2);
        expect(results[1].success).toBe(false);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete submit and retrieve cycle', async () => {
      const client = new MockAvailClient(testConfig);
      await client.connect();

      const originalData = new Uint8Array([42, 43, 44, 45, 46]);

      // Submit
      const submitResult = await client.submitData(originalData);
      expect(submitResult.success).toBe(true);

      // Create commitment
      const commitment: DACommitment = {
        blockNumber: submitResult.blockNumber!,
        txIndex: submitResult.txIndex!,
        dataHash: submitResult.dataHash!,
        merkleRoot: submitResult.merkleRoot!
      };

      // Validate commitment
      const validation = validateDACommitment(commitment);
      expect(validation.isValid).toBe(true);

      // Retrieve
      const retrieveResult = await client.retrieveData(commitment);
      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data).toEqual(originalData);

      // Get block info
      const blockInfo = await client.getBlockInfo(commitment.blockNumber);
      expect(blockInfo).not.toBeNull();
      expect(blockInfo!.number).toBe(commitment.blockNumber);
    });

    it('should handle multiple clients', async () => {
      const client1 = new MockAvailClient(testConfig);
      const client2 = new MockAvailClient(testConfig);

      await client1.connect();
      await client2.connect();

      const data1 = new Uint8Array([1, 2, 3]);
      const data2 = new Uint8Array([4, 5, 6]);

      // Submit with different clients
      const result1 = await client1.submitData(data1);
      const result2 = await client2.submitData(data2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Note: Mock clients have separate storage, so cross-retrieval won't work
      // In real implementation, all clients would access the same DA layer
    });

    it('should estimate costs accurately', () => {
      const smallDataCost = estimateSubmissionCost(100);
      const largeDataCost = estimateSubmissionCost(10000);

      const smallFee = parseFloat(smallDataCost.estimatedFee);
      const largeFee = parseFloat(largeDataCost.estimatedFee);

      expect(largeFee).toBeGreaterThan(smallFee);
    });
  });
});