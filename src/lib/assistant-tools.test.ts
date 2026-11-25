import { describe, expect, it } from "vitest";
import { assistantNetworkConflict, assistantReceipt, bridgeCheckpoints, quoteHasExpired } from "./assistant-tools";
import type { TransactionRecord } from "@/types";

const burn = `0x${"1".repeat(64)}`;
const mint = `0x${"2".repeat(64)}`;
const bridge: TransactionRecord = {
  id: "bridge", type: "bridge", amount: "1", token: "USDC", status: "attesting",
  fromChain: "Arc_Testnet", toChain: "Base_Sepolia", txHash: burn, createdAt: "2026-11-23", executionMode: "live",
  steps: [{ name: "Approve USDC", state: "noop" }, { name: "Burn USDC", state: "success", txHash: burn }, { name: "Fetch attestation", state: "active" }],
};

describe("assistant transaction signals", () => {
  it("keeps a submitted source hash on its own network while destination is pending", () => {
    expect(assistantReceipt(bridge)).toMatchObject({ hash: burn, scope: "Source transaction", chain: "Arc_Testnet", explorerUrl: `https://testnet.arcscan.app/tx/${burn}` });
    expect(bridgeCheckpoints(bridge).map(step => step.state)).toEqual(["noop", "success", "active", "pending"]);
  });

  it("uses the destination receipt once the bridge has a confirmed mint", () => {
    const complete: TransactionRecord = { ...bridge, status: "success", steps: [...bridge.steps, { name: "Destination Mint", state: "success", txHash: mint }] };
    expect(assistantReceipt(complete)).toMatchObject({ hash: mint, scope: "Destination receipt", chain: "Base_Sepolia" });
    expect(assistantReceipt({ ...complete, executionMode: "demo" })).toBeNull();
  });

  it("keeps a destination hash in its own scope even if verification is still pending", () => {
    expect(assistantReceipt({ ...bridge, txHash: mint, status: "minting", steps: [...bridge.steps, { name: "Destination Mint", state: "active", txHash: mint }] })).toMatchObject({ hash: mint, scope: "Destination transaction", chain: "Base_Sepolia" });
  });

  it("uses the actual wallet chain and preserves an unknown connected network", () => {
    expect(assistantNetworkConflict("Arc_Mainnet", true, 1, "mainnet")?.actual).toBe("Chain #1");
    expect(assistantNetworkConflict("Arc_Testnet", true, null, "testnet")?.actual).toBe("Unknown wallet network");
    expect(assistantNetworkConflict("Arc_Testnet", true, 5042002, "mainnet")).toBeNull();
  });

  it("expires a quote at the server's epoch-second deadline", () => {
    expect(quoteHasExpired(10, 9999)).toBe(false);
    expect(quoteHasExpired(10, 10000)).toBe(true);
    expect(quoteHasExpired(undefined, 10000)).toBe(false);
  });
});
