// Contract ABI and address for SocialRecovery contract
export const SOCIAL_RECOVERY_ABI = [
  {
    "type": "function",
    "name": "setupRecovery",
    "inputs": [
      {"name": "_encryptedKeyPieceA", "type": "string"},
      {"name": "_encryptedKeyPieceB", "type": "string"},
      {"name": "_encryptedKeyPieceC", "type": "string"},
      {"name": "_guardians", "type": "address[]"},
      {"name": "_threshold", "type": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "requestRecovery",
    "inputs": [
      {"name": "_wallet", "type": "address"}
    ],
    "outputs": [
      {"name": "", "type": "bytes32"}
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approveRecovery",
    "inputs": [
      {"name": "_requestId", "type": "bytes32"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getRecoveryData",
    "inputs": [
      {"name": "_requestId", "type": "bytes32"}
    ],
    "outputs": [
      {"name": "encryptedKeyPieceA", "type": "string"},
      {"name": "encryptedKeyPieceB", "type": "string"},
      {"name": "encryptedKeyPieceC", "type": "string"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRecoveryInfo",
    "inputs": [
      {"name": "_wallet", "type": "address"}
    ],
    "outputs": [
      {"name": "guardianCount", "type": "uint256"},
      {"name": "threshold", "type": "uint256"},
      {"name": "recoveryDelay", "type": "uint256"},
      {"name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getGuardians",
    "inputs": [
      {"name": "_wallet", "type": "address"}
    ],
    "outputs": [
      {"name": "", "type": "address[]"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "RecoverySetup",
    "inputs": [
      {"name": "wallet", "type": "address", "indexed": true},
      {"name": "guardianCount", "type": "uint256", "indexed": false},
      {"name": "threshold", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "RecoveryRequested",
    "inputs": [
      {"name": "wallet", "type": "address", "indexed": true},
      {"name": "requestId", "type": "bytes32", "indexed": true}
    ]
  },
  {
    "type": "event",
    "name": "GuardianApproval",
    "inputs": [
      {"name": "requestId", "type": "bytes32", "indexed": true},
      {"name": "guardian", "type": "address", "indexed": true}
    ]
  },
  {
    "type": "event",
    "name": "RecoveryCompleted",
    "inputs": [
      {"name": "wallet", "type": "address", "indexed": true},
      {"name": "requestId", "type": "bytes32", "indexed": true}
    ]
  }
] as const;

// For development, we'll use a placeholder address
// In production, this would be set from deployment artifacts
export const SOCIAL_RECOVERY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3" as const; // Default Anvil contract address