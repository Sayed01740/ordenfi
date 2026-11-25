import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InjectedProvider } from "@/sdk/wallet-adapter";
import { liveSendUsdcOnArc } from "./live-send";

const rpc = vi.hoisted(() => ({ balance: vi.fn(), receipt: vi.fn(), transaction: vi.fn() }));
vi.mock("viem", async importOriginal => ({
  ...await importOriginal<typeof import("viem")>(),
  createPublicClient: () => ({ getBalance: rpc.balance, waitForTransactionReceipt: rpc.receipt, getTransaction: rpc.transaction }),
}));
vi.mock("@/lib/circle-proxy", () => ({ installCircleApiProxy: () => {} }));

const sender = "0x1111111111111111111111111111111111111111";
const recipient = "0x2222222222222222222222222222222222222222";
const hash = "0x" + "1".repeat(64);
const blockHash = "0x" + "2".repeat(64);
const transaction = { hash, blockHash, from: sender, to: recipient, value: 10n ** 18n, input: "0x" };

describe("reviewed Arc payment network", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } });
    rpc.balance.mockResolvedValue(10n ** 20n);
    rpc.receipt.mockResolvedValue({ status: "success", transactionHash: hash, blockHash });
    rpc.transaction.mockResolvedValue(transaction);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("switches to the reviewed chain and includes it in the signing payload", async () => {
    let walletChain = "0x4cef52";
    let signed: Record<string, unknown> | undefined;
    const provider = { request: async ({ method, params }: { method: string; params?: unknown[] }) => {
      if (method === "eth_chainId") return walletChain;
      if (method === "eth_requestAccounts") return [sender];
      if (method === "wallet_switchEthereumChain") { walletChain = (params![0] as { chainId: string }).chainId; return null; }
      if (method === "eth_accounts") return [sender];
      if (method === "eth_sendTransaction") { signed = params![0] as Record<string, unknown>; return hash; }
      throw new Error(`Unexpected wallet call: ${method}`);
    } } as InjectedProvider;
    const result = await liveSendUsdcOnArc({ amount: "1", recipient, fromAddress: sender, provider, expectedChainId: 5042 });
    expect(signed).toMatchObject({ chainId: "0x13b2", from: sender, to: recipient });
    expect(result).toMatchObject({ status: "success", fromChain: "Arc_Mainnet" });
  });

  it.each([
    { to: sender },
    { from: recipient },
    { value: 1n },
    { blockHash: hash },
    { input: "0x01" },
  ])("keeps the payment unconfirmed when the mined transfer differs (%#)", async (difference) => {
    rpc.transaction.mockResolvedValueOnce({ ...transaction, ...difference });
    const provider = { request: async ({ method }: { method: string }) => {
      if (method === "eth_chainId") return "0x13b2";
      if (method === "eth_requestAccounts") return [sender];
      if (method === "eth_sendTransaction") return hash;
      throw new Error(`Unexpected wallet call: ${method}`);
    } } as InjectedProvider;
    const result = await liveSendUsdcOnArc({ amount: "1", recipient, provider, expectedChainId: 5042 });
    expect(result).toMatchObject({ status: "retryable", txHash: hash, retryable: true });
  });

  it("refuses to sign if the wallet changes network during the balance check", async () => {
    let walletChain = "0x13b2";
    let signed = false;
    rpc.balance.mockImplementationOnce(async () => { walletChain = "0x1"; return 10n ** 20n; });
    const provider = { request: async ({ method }: { method: string }) => {
      if (method === "eth_chainId") return walletChain;
      if (method === "eth_requestAccounts") return [sender];
      if (method === "eth_sendTransaction") { signed = true; return "0x" + "1".repeat(64); }
      throw new Error(`Unexpected wallet call: ${method}`);
    } } as InjectedProvider;
    await expect(liveSendUsdcOnArc({ amount: "1", recipient, provider, expectedChainId: 5042 })).rejects.toThrow("Wallet network changed");
    expect(signed).toBe(false);
  });
});
