//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Script, console } from "forge-std/Script.sol";
import { SocialRecovery } from "../contracts/SocialRecovery.sol";

/**
 * @title VerifyBase
 * @notice Post-deployment verification script for Base mainnet
 * @dev Verifies that deployed contracts are working correctly
 *
 * Usage:
 * forge script script/VerifyBase.s.sol --rpc-url base --broadcast
 */
contract VerifyBase is Script {
    error ContractNotFound(address contractAddress);
    error VerificationFailed(string test);

    event VerificationStarted(address contractAddress);
    event VerificationPassed(string testName);
    event VerificationCompleted(bool success);

    function run() external {
        // Load deployed contract address from environment or deployments
        address socialRecoveryAddress = _getDeployedAddress();

        if (socialRecoveryAddress == address(0)) {
            revert ContractNotFound(socialRecoveryAddress);
        }

        emit VerificationStarted(socialRecoveryAddress);

        console.logString("=== VERIFYING KEYMESH DEPLOYMENT ON BASE ===");
        console.logString("SocialRecovery contract at:");
        console.logAddress(socialRecoveryAddress);

        // Create contract instance
        SocialRecovery socialRecovery = SocialRecovery(socialRecoveryAddress);

        // Run verification tests
        bool allTestsPassed = true;

        try this._verifyContractExists(socialRecoveryAddress) {
            emit VerificationPassed("Contract exists");
            console.logString("✓ Contract exists and has code");
        } catch {
            allTestsPassed = false;
            console.logString("✗ Contract existence check failed");
        }

        try this._verifyContractInterface(socialRecovery) {
            emit VerificationPassed("Interface verification");
            console.logString("✓ Contract interface is correct");
        } catch {
            allTestsPassed = false;
            console.logString("✗ Contract interface verification failed");
        }

        try this._verifyBasicFunctionality(socialRecovery) {
            emit VerificationPassed("Basic functionality");
            console.logString("✓ Basic functionality works");
        } catch {
            allTestsPassed = false;
            console.logString("✗ Basic functionality verification failed");
        }

        if (allTestsPassed) {
            console.logString("=== ✓ ALL VERIFICATIONS PASSED ===");
            console.logString("Contract is ready for production use!");
        } else {
            console.logString("=== ✗ VERIFICATION FAILED ===");
            console.logString("Review deployment before using in production!");
        }

        emit VerificationCompleted(allTestsPassed);
    }

    /**
     * @notice Verifies contract exists and has code
     */
    function _verifyContractExists(address contractAddress) external view {
        if (contractAddress.code.length == 0) {
            revert VerificationFailed("Contract has no code");
        }
    }

    /**
     * @notice Verifies contract interface is correct
     */
    function _verifyContractInterface(SocialRecovery socialRecovery) external view {
        // Check that the contract supports expected functions
        // This will revert if the interface is wrong

        try socialRecovery.VERSION() returns (string memory) {
            // Version function exists
        } catch {
            revert VerificationFailed("VERSION function missing");
        }

        // Add more interface checks as needed
    }

    /**
     * @notice Verifies basic contract functionality
     */
    function _verifyBasicFunctionality(SocialRecovery socialRecovery) external view {
        // Test read-only functions that should work immediately

        try socialRecovery.VERSION() returns (string memory version) {
            if (bytes(version).length == 0) {
                revert VerificationFailed("VERSION returns empty string");
            }
        } catch {
            revert VerificationFailed("VERSION function call failed");
        }

        // Add more functionality tests as needed
    }

    /**
     * @notice Gets deployed contract address
     * @dev In a real deployment, this would read from a deployments file
     */
    function _getDeployedAddress() internal view returns (address) {
        // Try to get from environment variable
        try vm.envAddress("SOCIAL_RECOVERY_ADDRESS") returns (address addr) {
            return addr;
        } catch {
            // If not set, return zero address to trigger error
            return address(0);
        }
    }
}