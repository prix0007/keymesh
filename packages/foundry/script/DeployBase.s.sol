//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { SocialRecovery } from "../contracts/SocialRecovery.sol";

/**
 * @title DeployBase
 * @notice Deployment script specifically for Base mainnet
 * @dev This script deploys the Keymesh social recovery system to Base mainnet
 *
 * Usage:
 * 1. Set your private key in .env file: DEPLOYER_PRIVATE_KEY=your_private_key
 * 2. Ensure you have ETH on Base mainnet for gas fees
 * 3. Run: forge script script/DeployBase.s.sol --rpc-url base --broadcast --verify
 *
 * Security Notes:
 * - Never commit private keys to version control
 * - Use a dedicated deployment wallet with minimal funds
 * - Verify contracts on Basescan after deployment
 */
contract DeployBase is ScaffoldETHDeploy {
    // Base mainnet chain ID
    uint256 constant BASE_CHAIN_ID = 8453;

    // Minimum ETH balance required for deployment (0.01 ETH)
    uint256 constant MIN_DEPLOYER_BALANCE = 0.01 ether;

    error InsufficientBalance(uint256 balance, uint256 required);
    error WrongChain(uint256 currentChainId, uint256 expectedChainId);
    error DeploymentFailed(string reason);

    event DeploymentStarted(address deployer, uint256 chainId);
    event ContractDeployed(string contractName, address contractAddress);
    event DeploymentCompleted(uint256 gasUsed, uint256 totalCost);

    function run() external {
        // Pre-deployment checks
        _preDeploymentChecks();

        // Setup deployment environment
        uint256 deployerPrivateKey = _getDeployerPrivateKey();
        address deployerAddress = vm.addr(deployerPrivateKey);

        emit DeploymentStarted(deployerAddress, block.chainid);

        // Start recording gas usage
        uint256 initialGas = gasleft();

        vm.startBroadcast(deployerPrivateKey);

        try this._deployContracts() returns (address socialRecoveryAddress) {
            vm.stopBroadcast();

            // Calculate deployment costs
            uint256 gasUsed = initialGas - gasleft();
            uint256 totalCost = gasUsed * tx.gasprice;

            // Log deployment success
            console.logString("=== KEYMESH DEPLOYMENT TO BASE MAINNET SUCCESSFUL ===");
            console.logString("SocialRecovery deployed at:");
            console.logAddress(socialRecoveryAddress);
            console.logString("Deployer:");
            console.logAddress(deployerAddress);
            console.logString("Chain ID:");
            console.logUint(block.chainid);
            console.logString("Gas Used:");
            console.logUint(gasUsed);
            console.logString("Total Cost (ETH):");
            console.logUint(totalCost);
            console.logString("===============================================");

            emit DeploymentCompleted(gasUsed, totalCost);

            // Export deployments for frontend
            _recordDeployment("SocialRecovery", socialRecoveryAddress);
            exportDeployments();

        } catch Error(string memory reason) {
            vm.stopBroadcast();
            revert DeploymentFailed(reason);
        } catch {
            vm.stopBroadcast();
            revert DeploymentFailed("Unknown deployment error");
        }
    }

    /**
     * @notice Deploys all contracts (called via try-catch for better error handling)
     */
    function _deployContracts() external returns (address) {
        // Deploy SocialRecovery contract
        SocialRecovery socialRecovery = new SocialRecovery();

        emit ContractDeployed("SocialRecovery", address(socialRecovery));

        // Verify contract was deployed successfully
        if (address(socialRecovery).code.length == 0) {
            revert DeploymentFailed("SocialRecovery contract deployment failed");
        }

        return address(socialRecovery);
    }

    /**
     * @notice Pre-deployment safety checks
     */
    function _preDeploymentChecks() internal view {
        // Verify we're on Base mainnet
        if (block.chainid != BASE_CHAIN_ID) {
            revert WrongChain(block.chainid, BASE_CHAIN_ID);
        }

        // Check deployer has sufficient balance
        address deployer = vm.addr(_getDeployerPrivateKey());
        if (deployer.balance < MIN_DEPLOYER_BALANCE) {
            revert InsufficientBalance(deployer.balance, MIN_DEPLOYER_BALANCE);
        }

        console.logString("Pre-deployment checks passed:");
        console.logString("- Chain ID verified (Base mainnet)");
        console.logString("- Deployer balance sufficient");
        console.logAddress(deployer);
        console.logUint(deployer.balance);
    }

    /**
     * @notice Gets deployer private key with validation
     */
    function _getDeployerPrivateKey() internal view returns (uint256) {
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        if (privateKey == 0) {
            revert InvalidPrivateKey("DEPLOYER_PRIVATE_KEY not set or invalid");
        }

        return privateKey;
    }

    /**
     * @notice Records deployment for frontend integration
     */
    function _recordDeployment(string memory name, address addr) internal {
        deployments.push(Deployment({ name: name, addr: addr }));
    }
}