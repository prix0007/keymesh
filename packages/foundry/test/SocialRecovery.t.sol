//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "forge-std/Test.sol";
import "../contracts/SocialRecovery.sol";

contract SocialRecoveryTest is Test {
    SocialRecovery public socialRecovery;
    address public owner;
    address[] public guardians;

    function setUp() public {
        socialRecovery = new SocialRecovery();
        owner = address(this);

        // Setup test guardians
        guardians.push(address(0x1));
        guardians.push(address(0x2));
        guardians.push(address(0x3));
        guardians.push(address(0x4));
        guardians.push(address(0x5));
    }

    function testSetupRecovery() public {
        socialRecovery.setupRecovery(
            "encrypted_piece_A",
            "encrypted_piece_B",
            "encrypted_piece_C",
            guardians,
            3
        );

        (uint256 guardianCount, uint256 threshold, uint256 recoveryDelay, bool isActive) =
            socialRecovery.getRecoveryInfo(owner);

        assertEq(guardianCount, 5);
        assertEq(threshold, 3);
        assertEq(recoveryDelay, 7 days);
        assertTrue(isActive);
    }

    function testRequestRecovery() public {
        // Setup recovery first
        socialRecovery.setupRecovery(
            "encrypted_piece_A",
            "encrypted_piece_B",
            "encrypted_piece_C",
            guardians,
            3
        );

        // Request recovery
        bytes32 requestId = socialRecovery.requestRecovery(owner);
        assertTrue(requestId != bytes32(0));
    }
}