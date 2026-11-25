import { getArcTokens } from "@/lib/dapp/tokens";
import { validatePayment, type PaymentChain } from "@/lib/payment-tools";
import type { ActionPreview } from "@/types";

type SwapToken = "USDC" | "EURC" | "cirBTC";
type PaymentDraft = { amount: string; chain: PaymentChain };

export type AssistantSendPlan = PaymentDraft & { type: "send"; recipient: string };
export type AssistantSwapPlan = PaymentDraft & { type: "swap"; tokenIn: SwapToken; tokenOut: SwapToken };
export type AssistantPlan = AssistantSendPlan | AssistantSwapPlan;

export const ASSISTANT_PLAN_EVENT = "ordenfi:review-assistant-plan";

function swapToken(value?: string): SwapToken | undefined {
  if (typeof value !== "string") return undefined;
  switch (value.toUpperCase()) {
    case "USDC": return "USDC";
    case "EURC": return "EURC";
    case "CIRBTC": return "cirBTC";
  }
}

export function getAssistantPlan(preview: ActionPreview): AssistantPlan | null {
  if (!preview.canExecute || preview.executed) return null;
  const chain = preview.toChain;
  if (chain !== "Arc_Mainnet" && chain !== "Arc_Testnet") return null;
  const amount = typeof preview.amount === "string" ? preview.amount.trim() : "";
  if (!amount) return null;

  if (preview.type === "send" && swapToken(preview.token) === "USDC") {
    const recipient = typeof preview.recipient === "string" ? preview.recipient.trim() : "";
    if (!recipient) return null;
    try { validatePayment(amount, recipient); }
    catch { return null; }
    return { type: "send", chain, amount, recipient };
  }

  if (preview.type !== "swap") return null;
  const tokenIn = swapToken(preview.token);
  const tokenOut = swapToken(preview.tokenOut);
  if (!tokenIn || !tokenOut || tokenIn === tokenOut) return null;
  const decimals = getArcTokens(chain === "Arc_Mainnet")[tokenIn].decimals;
  if (!/^\d+(\.\d+)?$/.test(amount) || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return null;
  if ((amount.split(".")[1]?.length ?? 0) > decimals) return null;
  return { type: "swap", chain, amount, tokenIn, tokenOut };
}
