// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {OrdenFiRegistry} from "../src/OrdenFiRegistry.sol";

/**
 * Deploy (recommended — pass key on CLI):
 *   forge script script/DeployOrdenFiRegistry.s.sol:DeployOrdenFiRegistry \
 *     --rpc-url https://rpc.testnet.arc.network \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 *
 * forge injects the broadcaster from --private-key; no envUint needed.
 */
contract DeployOrdenFiRegistry is Script {
    function run() external {
        string memory metadataURI = vm.envOr(
            "OrdenFi_METADATA_URI",
            string("https://OrdenFi.vercel.app/identity/OrdenFi-agent.json")
        );

        console2.log("Metadata:", metadataURI);
        console2.log("Broadcasting from:", msg.sender);

        vm.startBroadcast();
        OrdenFiRegistry reg = new OrdenFiRegistry(metadataURI);
        vm.stopBroadcast();

        console2.log("OrdenFiRegistry deployed at:", address(reg));
        console2.log("Owner:", reg.owner());
        console2.log("Explorer: https://testnet.arcscan.app/address/", address(reg));
    }
}
