import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { SOCIAL_RECOVERY_ABI, SOCIAL_RECOVERY_ADDRESS } from '@/contracts/SocialRecovery';

export function useSocialRecovery() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Setup recovery function
  const setupRecovery = async (
    encryptedKeyPieceA: string,
    encryptedKeyPieceB: string,
    encryptedKeyPieceC: string,
    guardians: string[],
    threshold: number
  ) => {
    try {
      await writeContract({
        address: SOCIAL_RECOVERY_ADDRESS,
        abi: SOCIAL_RECOVERY_ABI,
        functionName: 'setupRecovery',
        args: [
          encryptedKeyPieceA,
          encryptedKeyPieceB,
          encryptedKeyPieceC,
          guardians as `0x${string}`[],
          BigInt(threshold)
        ],
      });
    } catch (err) {
      console.error('Error setting up recovery:', err);
      throw err;
    }
  };

  // Request recovery function
  const requestRecovery = async (wallet: string) => {
    try {
      await writeContract({
        address: SOCIAL_RECOVERY_ADDRESS,
        abi: SOCIAL_RECOVERY_ABI,
        functionName: 'requestRecovery',
        args: [wallet as `0x${string}`],
      });
    } catch (err) {
      console.error('Error requesting recovery:', err);
      throw err;
    }
  };

  // Approve recovery function
  const approveRecovery = async (requestId: string) => {
    try {
      await writeContract({
        address: SOCIAL_RECOVERY_ADDRESS,
        abi: SOCIAL_RECOVERY_ABI,
        functionName: 'approveRecovery',
        args: [requestId as `0x${string}`],
      });
    } catch (err) {
      console.error('Error approving recovery:', err);
      throw err;
    }
  };

  return {
    setupRecovery,
    requestRecovery,
    approveRecovery,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

// Hook to read recovery info
export function useRecoveryInfo(wallet?: string) {
  return useReadContract({
    address: SOCIAL_RECOVERY_ADDRESS,
    abi: SOCIAL_RECOVERY_ABI,
    functionName: 'getRecoveryInfo',
    args: wallet ? [wallet as `0x${string}`] : undefined,
    query: {
      enabled: !!wallet,
    },
  });
}

// Hook to read guardians
export function useGuardians(wallet?: string) {
  return useReadContract({
    address: SOCIAL_RECOVERY_ADDRESS,
    abi: SOCIAL_RECOVERY_ABI,
    functionName: 'getGuardians',
    args: wallet ? [wallet as `0x${string}`] : undefined,
    query: {
      enabled: !!wallet,
    },
  });
}

// Hook to read recovery data
export function useRecoveryData(requestId?: string) {
  return useReadContract({
    address: SOCIAL_RECOVERY_ADDRESS,
    abi: SOCIAL_RECOVERY_ABI,
    functionName: 'getRecoveryData',
    args: requestId ? [requestId as `0x${string}`] : undefined,
    query: {
      enabled: !!requestId,
    },
  });
}