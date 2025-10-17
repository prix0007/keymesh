//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { SocialRecovery } from "../contracts/SocialRecovery.sol";

/**
 * @notice Simple deployment script for SocialRecovery contract
 * @dev Run with: forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
 */
contract DeployScript is ScaffoldETHDeploy {
    function run() external {
        uint256 deployerPrivateKey = setupLocalhostEnv();

        vm.startBroadcast(deployerPrivateKey);

        // Deploy the single SocialRecovery contract
        SocialRecovery socialRecovery = new SocialRecovery();

        console.logString("SocialRecovery deployed at:");
        console.logAddress(address(socialRecovery));

        vm.stopBroadcast();

        // Export deployments for the frontend
        exportDeployments();
    }
}