import { CHAINS } from "@/lib/chains";
import { type PaymentChain } from "@/lib/payment-tools";
import type { TransactionRecord, TxStep } from "@/types";

export const ASSISTANT_GUIDE_EVENT = "ordenfi:assistant-guide";
export const assistantGuides = {
  swapAmount: { tab: "swap", selector: '[aria-label="Amount to pay"], [aria-label="You pay"]', label: "Enter amount" },
  sendAmount: { tab: "send", selector: '[aria-label="Amount (USDC)"]', label: "Enter amount" },
  sendRecipient: { tab: "send", selector: '[aria-label="Recipient address"]', label: "Add recipient" },
  bridgeAmount: { tab: "bridge", selector: '[aria-label="Bridge amount"]', label: "Enter amount" },
  bridgeSource: { tab: "bridge", selector: '[aria-label="Source network"]', label: "Choose source" },
  bridgeDestination: { tab: "bridge", selector: '[aria-label="Destination network"]', label: "Choose destination" },
  receiveAddress: { tab: "receive", selector: "#qr-recipient", label: "Enter receiving address" },
  refreshQuote: { tab: "swap", selector: "[data-assistant-refresh-quote]", label: "Refresh quote" },
  bridgeRecovery: { tab: "bridge", selector: "[data-assistant-recovery]", label: "Open recovery" },
} as const;
export type AssistantGuide = keyof typeof assistantGuides;

export function guideTo(guide: AssistantGuide) {
  window.dispatchEvent(new CustomEvent(ASSISTANT_GUIDE_EVENT, { detail: guide }));
}

export function assistantNetworkConflict(expected: PaymentChain | undefined, connected: boolean, chainId: number | null, mode: "mainnet" | "testnet") {
  if (!expected) return null;
  const requiredId = expected === "Arc_Mainnet" ? 5042 : 5042002;
  const actualId = connected ? chainId : mode === "mainnet" ? 5042 : 5042002;
  if (actualId === requiredId) return null;
  const actual = actualId === 5042 ? "Arc Mainnet" : actualId === 5042002 ? "Arc Testnet" : actualId ? `Chain #${actualId}` : "Unknown wallet network";
  return { expected: CHAINS[expected].label, actual, scope: connected ? "Wallet" : "Workspace" };
}

export function quoteHasExpired(expiresAt: number | undefined, nowMs: number) {
  return typeof expiresAt === "number" && Number.isSafeInteger(expiresAt) && expiresAt * 1000 <= nowMs;
}

const checkpoints = [
  { label: "Approval", match: /approv|allowance/ },
  { label: "Burn", match: /burn/ },
  { label: "Attestation", match: /attest/ },
  { label: "Destination", match: /mint|receivemessage|destination|forward/ },
];

export function bridgeCheckpoints(tx: TransactionRecord) {
  const steps = [...tx.steps].reverse();
  return checkpoints.map(({ label, match }) => {
    const step = steps.find(step => match.test(step.name.toLowerCase()));
    return { label, state: step?.state ?? "pending" as TxStep["state"] };
  });
}

function validHash(hash: unknown): hash is string {
  return typeof hash === "string" && /^0x[\da-f]{64}$/i.test(hash);
}

export function assistantReceipt(tx: TransactionRecord) {
  if (tx.executionMode === "demo") return null;
  let hash = tx.txHash;
  let chain = tx.toChain ?? tx.fromChain;
  let scope = tx.status === "success" ? "Transaction receipt" : "Transaction hash";
  if (tx.type === "bridge") {
    const steps = [...tx.steps].reverse();
    const destinationStep = steps.find(step => checkpoints[3].match.test(step.name.toLowerCase()) && validHash(step.txHash));
    const destination = tx.bridgeState?.destinationTxHash ?? destinationStep?.txHash;
    const burn = tx.bridgeState?.burnTxHash ?? steps.find(step => checkpoints[1].match.test(step.name.toLowerCase()) && validHash(step.txHash))?.txHash;
    if (validHash(destination)) {
      hash = destination;
      chain = tx.toChain ?? tx.bridgeState?.toChain;
      scope = tx.status === "success" && (destinationStep?.state === "success" || tx.bridgeState?.state === "COMPLETED") ? "Destination receipt" : "Destination transaction";
    } else {
      hash = burn;
      chain = tx.fromChain ?? tx.bridgeState?.fromChain;
      scope = "Source transaction";
    }
  }
  if (!validHash(hash)) return null;
  const explorer = chain ? CHAINS[chain]?.explorer : undefined;
  return { hash, chain, scope, explorerUrl: explorer ? `${explorer}/tx/${hash}` : undefined };
}
