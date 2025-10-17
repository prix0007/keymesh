//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/**
 * @title SocialRecovery
 * @dev Simple social recovery contract for Keymesh
 * Stores encrypted key pieces and manages guardian-based recovery
 */
contract SocialRecovery {

    // Recovery configuration for each wallet
    struct Recovery {
        string encryptedKeyPieceA;    // Encrypted with password
        string encryptedKeyPieceB;    // Encrypted with biometric
        string encryptedKeyPieceC;    // Encrypted with guardian signatures
        address[] guardians;          // Guardian addresses
        uint256 threshold;            // Number of guardians needed (e.g., 3 of 5)
        uint256 recoveryDelay;        // Security delay in seconds (7 days)
        bool isActive;                // Whether recovery is set up
    }

    // Active recovery requests
    struct RecoveryRequest {
        address wallet;
        uint256 requestTime;
        uint256 approvalCount;
        mapping(address => bool) approvals;
        bool isCompleted;
    }

    // State variables
    mapping(address => Recovery) public recoveries;
    mapping(bytes32 => RecoveryRequest) public recoveryRequests;

    // Events
    event RecoverySetup(address indexed wallet, uint256 guardianCount, uint256 threshold);
    event RecoveryRequested(address indexed wallet, bytes32 indexed requestId);
    event GuardianApproval(bytes32 indexed requestId, address indexed guardian);
    event RecoveryCompleted(address indexed wallet, bytes32 indexed requestId);

    /**
     * @dev Set up social recovery for a wallet
     * @param _encryptedKeyPieceA Password-encrypted key piece
     * @param _encryptedKeyPieceB Biometric-encrypted key piece
     * @param _encryptedKeyPieceC Guardian-encrypted key piece
     * @param _guardians Array of guardian addresses
     * @param _threshold Number of guardians needed for recovery
     */
    function setupRecovery(
        string memory _encryptedKeyPieceA,
        string memory _encryptedKeyPieceB,
        string memory _encryptedKeyPieceC,
        address[] memory _guardians,
        uint256 _threshold
    ) external {
        require(_guardians.length >= _threshold, "Not enough guardians");
        require(_threshold > 0, "Threshold must be positive");

        Recovery storage recovery = recoveries[msg.sender];
        recovery.encryptedKeyPieceA = _encryptedKeyPieceA;
        recovery.encryptedKeyPieceB = _encryptedKeyPieceB;
        recovery.encryptedKeyPieceC = _encryptedKeyPieceC;
        recovery.guardians = _guardians;
        recovery.threshold = _threshold;
        recovery.recoveryDelay = 7 days; // Fixed 7-day delay
        recovery.isActive = true;

        emit RecoverySetup(msg.sender, _guardians.length, _threshold);
    }

    /**
     * @dev Request recovery for a wallet
     * @param _wallet The wallet to recover
     */
    function requestRecovery(address _wallet) external returns (bytes32) {
        require(recoveries[_wallet].isActive, "No recovery setup");

        bytes32 requestId = keccak256(abi.encodePacked(_wallet, block.timestamp, msg.sender));
        RecoveryRequest storage request = recoveryRequests[requestId];

        request.wallet = _wallet;
        request.requestTime = block.timestamp;
        request.approvalCount = 0;
        request.isCompleted = false;

        emit RecoveryRequested(_wallet, requestId);
        return requestId;
    }

    /**
     * @dev Guardian approves a recovery request
     * @param _requestId The recovery request ID
     */
    function approveRecovery(bytes32 _requestId) external {
        RecoveryRequest storage request = recoveryRequests[_requestId];
        require(!request.isCompleted, "Recovery already completed");
        require(!request.approvals[msg.sender], "Already approved");

        Recovery storage recovery = recoveries[request.wallet];
        require(_isGuardian(recovery.guardians, msg.sender), "Not a guardian");

        request.approvals[msg.sender] = true;
        request.approvalCount++;

        emit GuardianApproval(_requestId, msg.sender);

        // Check if threshold is met and delay has passed
        if (request.approvalCount >= recovery.threshold &&
            block.timestamp >= request.requestTime + recovery.recoveryDelay) {
            request.isCompleted = true;
            emit RecoveryCompleted(request.wallet, _requestId);
        }
    }

    /**
     * @dev Get encrypted key pieces for completed recovery
     * @param _requestId The recovery request ID
     */
    function getRecoveryData(bytes32 _requestId) external view returns (
        string memory encryptedKeyPieceA,
        string memory encryptedKeyPieceB,
        string memory encryptedKeyPieceC
    ) {
        RecoveryRequest storage request = recoveryRequests[_requestId];
        require(request.isCompleted, "Recovery not completed");

        Recovery storage recovery = recoveries[request.wallet];
        return (
            recovery.encryptedKeyPieceA,
            recovery.encryptedKeyPieceB,
            recovery.encryptedKeyPieceC
        );
    }

    /**
     * @dev Check if address is a guardian
     */
    function _isGuardian(address[] storage _guardians, address _guardian) internal view returns (bool) {
        for (uint256 i = 0; i < _guardians.length; i++) {
            if (_guardians[i] == _guardian) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Get recovery info for a wallet
     */
    function getRecoveryInfo(address _wallet) external view returns (
        uint256 guardianCount,
        uint256 threshold,
        uint256 recoveryDelay,
        bool isActive
    ) {
        Recovery storage recovery = recoveries[_wallet];
        return (
            recovery.guardians.length,
            recovery.threshold,
            recovery.recoveryDelay,
            recovery.isActive
        );
    }

    /**
     * @dev Get guardians for a wallet
     */
    function getGuardians(address _wallet) external view returns (address[] memory) {
        return recoveries[_wallet].guardians;
    }
}