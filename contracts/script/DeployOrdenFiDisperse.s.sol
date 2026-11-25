// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {OrdenFiDisperse} from "../src/OrdenFiDisperse.sol";

/**
 * Deploy the OrdenFiDisperse batch-send contract on Arc Testnet.
 *
 * Recommended (pass key on CLI):
 *   forge script script/DeployOrdenFiDisperse.s.sol:DeployOrdenFiDisperse \
 *     --rpc-url https://rpc.testnet.arc.network \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 *
 * After deploy, copy the printed address into the app env:
 *   NEXT_PUBLIC_OrdenFi_DISPERSE_ADDRESS=0x...
 *
 * forge injects the broadcaster from --private-key; no envUint needed.
 */
contract DeployOrdenFiDisperse is Script {
    function run() external {
        console2.log("Deploying OrdenFiDisperse from:", msg.sender);

        vm.startBroadcast();
        OrdenFiDisperse disperse = new OrdenFiDisperse();
        vm.stopBroadcast();

        console2.log("OrdenFiDisperse deployed at:", address(disperse));
        console2.log("Version:", disperse.VERSION());
        console2.log("Set env NEXT_PUBLIC_OrdenFi_DISPERSE_ADDRESS to the address above.");
        console2.log("Explorer: https://testnet.arcscan.app/address/");
        console2.log(address(disperse));
    }
}
