// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {OrdenFiEscrow} from "../src/OrdenFiEscrow.sol";

/**
 * Deploy OrdenFiEscrow on Arc Testnet.
 *
 * Usage:
 *   forge script script/DeployOrdenFiEscrow.s.sol:DeployOrdenFiEscrow \
 *     --rpc-url https://rpc.testnet.arc.network \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 *
 * Set env:
 *   NEXT_PUBLIC_OrdenFi_ESCROW_ADDRESS=0x...
 */
contract DeployOrdenFiEscrow is Script {
    function run() external {
        console2.log("Deploying OrdenFiEscrow from:", msg.sender);

        vm.startBroadcast();
        // arbitrator: msg.sender, feeBps: 50 (0.5%), feeRecipient: msg.sender
        OrdenFiEscrow escrow = new OrdenFiEscrow(msg.sender, 50, msg.sender);
        vm.stopBroadcast();

        console2.log("OrdenFiEscrow deployed at:", address(escrow));
        console2.log("Version:", escrow.VERSION());
        console2.log("Set NEXT_PUBLIC_OrdenFi_ESCROW_ADDRESS in .env.local to the address above.");
    }
}
