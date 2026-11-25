/**
 * Native USDC transfer on Arc through the selected wallet.
 */

import {
  createPublicClient,
  formatUnits,
  http,
  parseUnits,
  type Address,
} from "viem";
import {
  arcMainnetChain,
  arcTestnetChain,
  getArcNetworkMeta,
  explorerTxUrl,
  IS_ARC_MAINNET,
  ARC_CHAIN_ID,
} from "@/lib/arc-chain";
import {
  getChainId,
  getInjectedProvider,
  requestAccounts,
  switchToArcNetwork,
  type InjectedProvider,
} from "@/sdk/wallet-adapter";
import type { TransactionRecord, TxStep } from "@/types";
import { uid } from "@/lib/utils";
import { isValidTxHash } from "@/lib/tx-verify";

export async function getLiveWalletContext(): Promise<{
  address: Address;
  provider: InjectedProvider;
} | null> {
  try {
    if (typeof window === "undefined") return null;
    const provider = await getInjectedProvider();
    const accounts = await requestAccounts(provider);
    if (!accounts[0]) return null;
    return { address: accounts[0] as Address, provider };
  } catch {
    return null;
  }
}

/** Same-origin /api/rpc proxy URL (browser) or the raw RPC (server). */
function arcRpcUrl(isMainnet?: boolean): string {
  const mainnet = isMainnet ?? IS_ARC_MAINNET;
  if (typeof window !== "undefined") {
    // The proxy supports explicit Arc mainnet and testnet pools. Using the
    // build-time default here can read a different network than the connected wallet.
    return `${window.location.origin}/api/rpc?chain=${mainnet ? "arc_mainnet" : "arc_testnet"}`;
  }
  return mainnet
    ? (process.env.NEXT_PUBLIC_ARC_RPC_URL?.trim() || "https://rpc.mainnet.arc.io")
    : (process.env.NEXT_PUBLIC_ARC_RPC_URL?.trim() || "https://rpc.testnet.arc.io");
}

const ARC_NATIVE_DECIMALS = 18;
const ARC_USDC_GAS_RESERVE = "0.005";

/** Format Arc's native USDC balance, whose RPC representation has 18 decimals. */
export function formatArcNativeUsdcBalance(balance: bigint): string {
  return formatUnits(balance, ARC_NATIVE_DECIMALS);
}

/** True when native USDC covers the send amount plus the network-fee reserve. */
export function hasEnoughArcUsdcBalance(balance: bigint, amount: string): boolean {
  try {
    const amountNative = parseUnits(amount, ARC_NATIVE_DECIMALS);
    const gasReserveNative = parseUnits(ARC_USDC_GAS_RESERVE, ARC_NATIVE_DECIMALS);
    return balance >= amountNative + gasReserveNative;
  } catch {
    return false;
  }
}

async function readArcNativeBalanceRaw(address: Address, isMainnet?: boolean): Promise<bigint> {
  const chain = (isMainnet ?? IS_ARC_MAINNET) ? arcMainnetChain : arcTestnetChain;
  const client = createPublicClient({
    chain,
    transport: http(arcRpcUrl(isMainnet)),
  });
  return client.getBalance({ address });
}

export async function fetchArcNativeBalance(address: Address, isMainnet?: boolean): Promise<string> {
  return formatArcNativeUsdcBalance(await readArcNativeBalanceRaw(address, isMainnet));
}

export async function matchesNativeArcTransfer(payment: {
  chain: "Arc_Testnet" | "Arc_Mainnet";
  hash: string;
  blockHash: string;
  from: string;
  to: string;
  amount: string;
}): Promise<boolean> {
  if (!isValidTxHash(payment.hash) || !isValidTxHash(payment.blockHash)) return false;
  const isMainnet = payment.chain === "Arc_Mainnet";
  const client = createPublicClient({
    chain: isMainnet ? arcMainnetChain : arcTestnetChain,
    transport: http(arcRpcUrl(isMainnet)),
  });
  try {
    const mined = await client.getTransaction({ hash: payment.hash as `0x${string}` });
    return mined.hash === payment.hash && mined.blockHash === payment.blockHash &&
      mined.from.toLowerCase() === payment.from.toLowerCase() &&
      mined.to?.toLowerCase() === payment.to.toLowerCase() &&
      mined.value === parseUnits(payment.amount, ARC_NATIVE_DECIMALS) && mined.input === "0x";
  } catch {
    return false;
  }
}

export async function liveSendUsdcOnArc(params: {
  amount: string;
  recipient: string;
  recipientLabel?: string;
  onStep?: (steps: TxStep[]) => void;
  /** Optional explicit provider (preferred when caller already has Rabby) */
  provider?: InjectedProvider;
  /** Bind the wallet operation to the network reviewed by the caller. */
  expectedChainId?: 5042 | 5042002;
  /**
   * Pin the sender address (e.g. from the app's wallet store).
   * When provided, the balance check and the `from` field in the transaction
   * always use this address — preventing the batch from accidentally checking
   * a different account that happens to be exposed by the injected wallet.
   */
  fromAddress?: Address;
}): Promise<TransactionRecord> {
  if (typeof window === "undefined") {
    throw new Error("Live send must run in the browser with your connected wallet.");
  }

  const { installCircleApiProxy } = await import("@/lib/circle-proxy");
  installCircleApiProxy();

  const id = uid("tx");
  const provider = params.provider || (await getInjectedProvider());
  const detectedChainId = await getChainId(provider).catch(() => ARC_CHAIN_ID);
  const meta = getArcNetworkMeta(params.expectedChainId ?? detectedChainId);
  const networkName = meta.name;
  const activeChain = meta.isMainnet ? arcMainnetChain : arcTestnetChain;
  const paymentChain = meta.isMainnet ? "Arc_Mainnet" : "Arc_Testnet";

  const steps: TxStep[] = [
    { name: "Connect wallet", state: "active" },
    { name: `Switch to ${networkName}`, state: "pending" },
    { name: "Sign & send USDC", state: "pending" },
    { name: "Confirm finality", state: "pending" },
  ];
  const emit = () => params.onStep?.(steps.map((s) => ({ ...s })));

  emit();

  const accounts = await requestAccounts(provider);
  // Prefer the pinned address from the caller (e.g. store's walletAddress).
  // This ensures the batch always uses — and checks the balance of — the
  // actually-connected funded wallet, not whatever account the injected
  // provider happens to expose at call time.
  const from: Address | undefined = params.fromAddress ?? (accounts[0] as Address | undefined);
  if (!from) throw new Error("No wallet account — connect Rabby or MetaMask first");

  steps[0].state = "success";
  steps[0].nativeTransferSender = from;
  steps[1].state = "active";
  emit();

  await switchToArcNetwork(provider, meta.chainId as 5042 | 5042002);

  steps[1].state = "success";
  steps[2].state = "active";
  emit();

  const to = params.recipient as Address;
  if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
    throw new Error("Invalid recipient address");
  }

  const numericAmount = Number(params.amount);
  if (!params.amount || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Enter a valid USDC amount");
  }

  // eth_getBalance returns native USDC in 18-decimal units. Compare raw
  // integers so a funded wallet is not misclassified by a 6/18-decimal mix-up.
  try {
    const nativeBalRaw = await readArcNativeBalanceRaw(from, meta.isMainnet);
    const minRequiredRaw =
      parseUnits(params.amount, ARC_NATIVE_DECIMALS) +
      parseUnits(ARC_USDC_GAS_RESERVE, ARC_NATIVE_DECIMALS);
    if (!hasEnoughArcUsdcBalance(nativeBalRaw, params.amount)) {
      throw new Error(
        `Insufficient USDC balance on ${networkName} for ${from}. Balance is ${formatArcNativeUsdcBalance(nativeBalRaw)} USDC, but transaction requires at least ${formatArcNativeUsdcBalance(minRequiredRaw)} USDC (including gas reserve). Please fund this wallet on ${networkName}.`
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Insufficient USDC balance on")) {
      throw err;
    }
  }

  // USDC is Arc's native gas asset (18 decimals in the EVM native value field).
  // Sending native value avoids Rabby/MetaMask ERC-20 precompile simulation
  // reverts (#-39000) and requires only 21,000 gas instead of 100,000.
  const nativeWei = parseUnits(params.amount.trim(), 18);

  let hash: `0x${string}`;
  if (params.fromAddress) {
    const activeAccounts = await provider.request({ method: "eth_accounts" }) as string[];
    if (activeAccounts?.[0]?.toLowerCase() !== from.toLowerCase()) {
      throw new Error("Wallet account changed. Review the payment again before signing.");
    }
  }
  if (await getChainId(provider) !== meta.chainId) {
    throw new Error("Wallet network changed. Review the payment again before signing.");
  }
  try {
    hash = String(
      await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to,
            chainId: meta.chainIdHex,
            gas: "0x5208", // 21,000 standard transfer gas
            value: `0x${nativeWei.toString(16)}`,
          },
        ],
      }),
    ) as `0x${string}`;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (/4001|reject|denied|cancel/i.test(message)) {
      throw new Error("USDC transfer cancelled in wallet.");
    }
    throw new Error(message || "Arc USDC transfer failed.");
  }
  if (!isValidTxHash(hash)) throw new Error("The wallet did not return a valid transaction hash. Check wallet activity.");

  steps[2].state = "success";
  steps[2].txHash = hash;
  steps[3].state = "active";
  emit();

  const publicClient = createPublicClient({
    chain: activeChain,
    transport: http(arcRpcUrl(meta.isMainnet)),
  });

  let status: TransactionRecord["status"] = "success";
  let finalityMessage = `Confirmed on ${networkName}`;
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 60_000,
    });
    // A wallet can replace a submitted transaction. Verify the mined payment.
    if (!isValidTxHash(receipt.transactionHash)) throw new Error("The receipt has no valid transaction hash.");
    hash = receipt.transactionHash;
    steps[2].txHash = hash;
    if (receipt.status !== "success") {
      status = "error";
      finalityMessage = `Transaction reverted on ${networkName}`;
      steps[3].state = "error";
      steps[3].message = finalityMessage;
    } else {
      if (await matchesNativeArcTransfer({
        chain: paymentChain, hash, blockHash: receipt.blockHash, from, to, amount: params.amount.trim(),
      })) {
        steps[3].state = "success";
      } else {
        status = "retryable";
        finalityMessage = "Could not verify the reviewed payment. Check wallet activity and the explorer before retrying.";
        steps[3].state = "pending";
        steps[3].message = finalityMessage;
      }
    }
  } catch {
    // A timeout/network failure is not proof of success. Keep the hash and mark
    // the transaction retryable so the UI never lies about on-chain finality.
    status = "retryable";
    finalityMessage = "Submitted. Check the explorer before retrying while payment verification is pending.";
    steps[3].state = "pending";
    steps[3].message = finalityMessage;
  }
  steps[3].txHash = hash;
  emit();

  return {
    id,
    type: "send",
    status,
    retryable: status === "retryable",
    amount: params.amount,
    token: "USDC",
    fromChain: paymentChain,
    toChain: paymentChain,
    recipient: params.recipient,
    recipientLabel: params.recipientLabel,
    feeUsd: 0.04,
    steps,
    txHash: hash,
    explorerUrl: meta.explorer ? `${meta.explorer}/tx/${hash}` : explorerTxUrl(hash),
    createdAt: new Date().toISOString(),
    message: `Live USDC send on ${networkName} — ${finalityMessage}`,
    executionMode: "live",
  };
}
