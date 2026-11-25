import { describe, expect, it, vi } from "vitest";
import { encodeAbiParameters } from "viem";
import type { ChainId } from "@/types";
import {
  assertArcMainnetSwapAvailable,
  assertArcTestnetSwapExecution,
  getArcDexSwapQuote,
  runProductionSwap,
} from "@/blockchain/production-swap";

const walletMocks = vi.hoisted(() => ({
  getInjectedProvider: vi.fn(),
}));

vi.mock("@/sdk/wallet-adapter", () => ({
  getInjectedProvider: walletMocks.getInjectedProvider,
  requestAccounts: vi.fn(),
  switchToChainId: vi.fn(),
}));

describe("Arc Mainnet swap execution release gate", () => {
  it("fails closed for Mainnet before wallet access or transaction preparation", () => {
    expect(() => assertArcMainnetSwapAvailable(true)).toThrow(
      /Arc Mainnet swaps are not enabled yet/,
    );
  });

  it.each(["Arc_Mainnet", "Arc"] as const)(
    "rejects %s before requesting a wallet provider or preparing a transaction",
    async (chain) => {
      walletMocks.getInjectedProvider.mockClear();

      await expect(runProductionSwap({
        amount: "1",
        tokenIn: "USDC",
        tokenOut: "EURC",
        chain,
      })).rejects.toThrow(/Arc Mainnet swaps are not enabled yet/);

      expect(walletMocks.getInjectedProvider).not.toHaveBeenCalled();
    },
  );

  it("rejects unknown chain values before requesting a wallet provider", async () => {
    walletMocks.getInjectedProvider.mockClear();

    await expect(runProductionSwap({
      amount: "1",
      tokenIn: "USDC",
      tokenOut: "EURC",
      chain: "Ethereum" as ChainId,
    })).rejects.toThrow(/only supported on Arc Mainnet and Arc Testnet/i);

    expect(walletMocks.getInjectedProvider).not.toHaveBeenCalled();
  });

  it("allows execution only on the exact Arc Testnet chain", () => {
    expect(() => assertArcTestnetSwapExecution("Arc_Testnet")).not.toThrow();
    expect(() => assertArcTestnetSwapExecution("Arc_Mainnet")).toThrow(/restricted to Arc Testnet/);
    expect(() => assertArcTestnetSwapExecution("Arc")).toThrow(/restricted to Arc Testnet/);
  });

  it("continues to allow the Arc Testnet path", () => {
    expect(() => assertArcMainnetSwapAvailable(false)).not.toThrow();
  });
});

describe("Arc Testnet quote", () => {
  it("returns a minimum in whole token units using the selected slippage", async () => {
    const amountOut = 371923n;
    walletMocks.getInjectedProvider.mockResolvedValueOnce({
      request: async ({ method }: { method: string }) => {
        if (method === "eth_chainId") return "0x4cef52";
        if (method === "eth_call") return encodeAbiParameters([{ type: "uint256[]" }], [[500000000000000000n, amountOut]]);
        throw new Error(`Unexpected wallet request: ${method}`);
      },
    });
    await expect(getArcDexSwapQuote({
      amount: "0.50", tokenIn: "USDC", tokenOut: "EURC", chain: "Arc_Testnet", slippageBps: 50,
    })).resolves.toMatchObject({ amountOut: "0.371923", minimumAmountOut: "0.370063", slippageBps: 50 });
  });
});
