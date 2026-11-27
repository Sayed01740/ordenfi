"use client";

/**
 * Opt-in Kona Auto-Pilot Agent Vault (browser-local dedicated sub-wallet).
 *
 * Disabled by default: nothing here runs unless the user explicitly enables
 * Auto-Pilot in Kona's UI. Keeps the user's main MetaMask/Rabby wallet
 * completely isolated while allowing policy-capped, signature-free execution
 * on both Arc Mainnet (5042) and Arc Testnet (5042002).
 */

import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { arcMainnetChain, arcTestnetChain, explorerTxUrl } from "@/lib/arc-chain";
import { getInjectedProvider, switchToArcNetwork, type InjectedProvider } from "@/sdk/wallet-adapter";

const VAULT_STORAGE_PREFIX = "ordenfi_autopilot_vault_v1_";

type StoredVault = {
  privateKey: Hex;
  address: Address;
  createdAt: string;
};

function storageKey(ownerAddress?: string | null): string {
  const owner = (ownerAddress || "default").trim().toLowerCase();
  return `${VAULT_STORAGE_PREFIX}${owner}`;
}

export function getStoredAgentVault(ownerAddress?: string | null): StoredVault | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(ownerAddress));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredVault>;
    if (!parsed.privateKey || !parsed.address) return null;
    return parsed as StoredVault;
  } catch {
    return null;
  }
}

export function getOrCreateAgentVault(ownerAddress?: string | null): StoredVault {
  const existing = getStoredAgentVault(ownerAddress);
  if (existing) return existing;
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const vault: StoredVault = {
    privateKey,
    address: account.address,
    createdAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(storageKey(ownerAddress), JSON.stringify(vault));
    } catch {
      /* ignore storage errors */
    }
  }
  return vault;
}

export function clearAgentVault(ownerAddress?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(ownerAddress));
  } catch {
    /* ignore */
  }
}

function getArcRpcProxyUrl(isMainnet: boolean): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/rpc?chain=${isMainnet ? "arc_mainnet" : "arc_testnet"}`;
  }
  return isMainnet ? "https://rpc.mainnet.arc.io" : "https://rpc.testnet.arc.io";
}

export async function fetchAgentVaultBalance(
  vaultAddress: Address,
  isMainnet: boolean,
): Promise<string> {
  const chain = isMainnet ? arcMainnetChain : arcTestnetChain;
  const client = createPublicClient({
    chain,
    transport: http(getArcRpcProxyUrl(isMainnet)),
  });
  const bal = await client.getBalance({ address: vaultAddress });
  return formatEther(bal);
}

/**
 * Fund the local Agent Vault from the user's main connected wallet (1 standard signature).
 */
export async function fundAgentVault(
  ownerAddress: string,
  amountUsdc: string,
  isMainnet: boolean,
): Promise<{ txHash: string; explorerUrl: string }> {
  const vault = getOrCreateAgentVault(ownerAddress);
  const provider = await getInjectedProvider();
  const targetChainId = isMainnet ? 5042 : 5042002;
  await switchToArcNetwork(provider, targetChainId);

  const wei = parseEther(amountUsdc);
  const txHash = (await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: ownerAddress,
        to: vault.address,
        value: `0x${wei.toString(16)}`,
      },
    ],
  })) as string;

  return {
    txHash,
    explorerUrl: explorerTxUrl(txHash, targetChainId),
  };
}

/**
 * Sweep all remaining USDC from the Agent Vault back to the owner's main wallet.
 */
export async function withdrawAgentVault(
  ownerAddress: string,
  isMainnet: boolean,
): Promise<{ txHash: string; explorerUrl: string; amount: string }> {
  const vault = getStoredAgentVault(ownerAddress);
  if (!vault) throw new Error("No Agent Vault found.");
  const account = privateKeyToAccount(vault.privateKey);
  const chain = isMainnet ? arcMainnetChain : arcTestnetChain;
  const rpcUrl = getArcRpcProxyUrl(isMainnet);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  const balance = await publicClient.getBalance({ address: account.address });
  const gasPrice = await publicClient.getGasPrice();
  const gasLimit = 21_000n;
  const feeReserve = gasPrice * gasLimit * 2n;
  if (balance <= feeReserve) {
    throw new Error("Agent Vault balance is too low to cover withdrawal gas.");
  }
  const sendValue = balance - feeReserve;
  const txHash = await walletClient.sendTransaction({
    to: ownerAddress as Address,
    value: sendValue,
    gas: gasLimit,
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 25_000 }).catch(() => {});

  return {
    txHash,
    explorerUrl: explorerTxUrl(txHash, chain.id),
    amount: formatEther(sendValue),
  };
}

/**
 * Execute a native USDC send directly from the Agent Vault without wallet popups.
 */
export async function executeAgentVaultSend(params: {
  ownerAddress?: string | null;
  recipient: Address;
  amount: string;
  isMainnet: boolean;
}): Promise<{ txHash: string; explorerUrl: string; from: Address }> {
  const vault = getStoredAgentVault(params.ownerAddress);
  if (!vault) {
    throw new Error("Agent Vault is not initialized. Enable Auto-Pilot and fund the vault first.");
  }
  const account: PrivateKeyAccount = privateKeyToAccount(vault.privateKey);
  const chain = params.isMainnet ? arcMainnetChain : arcTestnetChain;
  const rpcUrl = getArcRpcProxyUrl(params.isMainnet);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  const value = parseEther(params.amount);
  const balance = await publicClient.getBalance({ address: account.address });
  const gasReserve = parseEther("0.002");
  if (balance < value + gasReserve) {
    throw new Error(
      `Insufficient Agent Vault balance (${formatEther(balance)} USDC). Fund the vault or use manual wallet confirmation.`,
    );
  }

  const txHash = await walletClient.sendTransaction({
    to: params.recipient,
    value,
    gas: 21_000n,
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 25_000 }).catch(() => {});
  return {
    txHash,
    explorerUrl: explorerTxUrl(txHash, chain.id),
    from: account.address,
  };
}

/**
 * Create an EIP-1193 InjectedProvider backed by the local Agent Vault.
 * Enables existing Swap & Bridge flows to execute without MetaMask popups
 * when Auto-Pilot is ON.
 */
export function createAgentVaultProvider(
  ownerAddress: string | null | undefined,
  initialIsMainnet: boolean,
): InjectedProvider {
  const vault = getStoredAgentVault(ownerAddress);
  if (!vault) throw new Error("Agent Vault not initialized.");
  const account = privateKeyToAccount(vault.privateKey);
  let activeChainId = initialIsMainnet ? 5042 : 5042002;

  const getClient = () => {
    const isMain = activeChainId === 5042;
    const chain = isMain ? arcMainnetChain : arcTestnetChain;
    return createWalletClient({
      account,
      chain,
      transport: http(getArcRpcProxyUrl(isMain)),
    });
  };

  return {
    request: async ({ method, params }) => {
      switch (method) {
        case "eth_accounts":
        case "eth_requestAccounts":
          return [account.address];
        case "eth_chainId":
          return `0x${activeChainId.toString(16)}`;
        case "wallet_switchEthereumChain": {
          const p = (Array.isArray(params) ? params[0] : params) as { chainId?: string } | undefined;
          if (p?.chainId) {
            const parsed = parseInt(p.chainId, 16);
            if (parsed === 5042 || parsed === 5042002) {
              activeChainId = parsed;
            }
          }
          return null;
        }
        case "wallet_addEthereumChain":
          return null;
        case "personal_sign": {
          const arr = Array.isArray(params) ? params : [];
          const msg = String(arr[0] || "");
          return account.signMessage({
            message: msg.startsWith("0x") ? { raw: msg as Hex } : msg,
          });
        }
        case "eth_signTypedData_v4": {
          const arr = Array.isArray(params) ? params : [];
          const rawTyped = typeof arr[1] === "string" ? JSON.parse(arr[1]) : arr[1];
          return account.signTypedData(rawTyped);
        }
        case "eth_sendTransaction": {
          const tx = (Array.isArray(params) ? params[0] : params) as {
            to?: Address;
            data?: Hex;
            value?: string;
            gas?: string;
          };
          const client = getClient();
          return client.sendTransaction({
            to: tx.to,
            data: tx.data,
            value: tx.value ? BigInt(tx.value) : 0n,
            gas: tx.gas ? BigInt(tx.gas) : undefined,
          });
        }
        default:
          throw new Error(`Agent Vault provider does not support ${method}`);
      }
    },
  };
}
