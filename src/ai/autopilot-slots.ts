/**
 * Multi-turn slot-filling engine for Kona Auto-Pilot mode.
 *
 * Only invoked when Auto-Pilot is explicitly enabled by the user.
 * Asks for missing transaction fields (token, chain, amount, recipient)
 * across turns and produces an executable ActionPreview once complete.
 */

import { resolveChain } from "@/lib/chains";
import type { ActionPreview, ChainId } from "@/types";

export type AutopilotDraft = {
  type: "send" | "swap" | "bridge";
  amount?: string;
  tokenIn?: string;
  tokenOut?: string;
  fromChain?: ChainId;
  toChain?: ChainId;
  recipient?: string;
};

export type AutopilotTurnResult =
  | { status: "passthrough" }
  | { status: "cancelled"; reply: string }
  | { status: "ask"; draft: AutopilotDraft; reply: string }
  | { status: "ready"; draft: AutopilotDraft; preview: ActionPreview };

const SWAP_TOKEN_REGEX = /\b(USDC|EURC|cirBTC|wETH)\b/gi;

function normalizeToken(raw: string): string {
  const u = raw.trim().toUpperCase();
  if (u === "CIRBTC") return "cirBTC";
  if (u === "WETH") return "wETH";
  return u;
}

function extractAmount(text: string): string | undefined {
  const m =
    text.match(/\$\s*([\d,]+(?:\.\d+)?)/i) ||
    text.match(/([\d,]+(?:\.\d+)?)\s*(?:usdc|eurc|cirbtc|weth|usd)/i) ||
    text.match(/^\s*([\d,]+(?:\.\d+)?)\s*$/) ||
    text.match(/\b([\d,]+(?:\.\d+)?)\b/);
  if (!m) return undefined;
  const cleaned = m[1].replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? cleaned : undefined;
}

function extractAddress(text: string): string | undefined {
  const m = text.match(/0x[a-fA-F0-9]{40}/);
  return m ? m[0] : undefined;
}

function extractSwapTokens(text: string): { tokenIn?: string; tokenOut?: string } {
  const pair = text.match(
    /\b(USDC|EURC|cirBTC|wETH)\s*(?:to|→|->|for|into)\s*(USDC|EURC|cirBTC|wETH)\b/i,
  );
  if (pair) {
    return {
      tokenIn: normalizeToken(pair[1]),
      tokenOut: normalizeToken(pair[2]),
    };
  }
  const matches = Array.from(text.matchAll(SWAP_TOKEN_REGEX)).map((m) => normalizeToken(m[1]));
  if (matches.length >= 2 && matches[0] !== matches[1]) {
    return { tokenIn: matches[0], tokenOut: matches[1] };
  }
  if (matches.length === 1) {
    return { tokenIn: matches[0] };
  }
  return {};
}

function extractBridgeChains(
  text: string,
  isMainnet: boolean,
): { fromChain?: ChainId; toChain?: ChainId } {
  const arcDefault: ChainId = isMainnet ? "Arc_Mainnet" : "Arc_Testnet";
  const peerDefault: ChainId = isMainnet ? "Base" : "Base_Sepolia";

  const mapChain = (raw: string): ChainId | undefined => {
    const r = raw.trim().toLowerCase();
    if (r.includes("arc")) return arcDefault;
    if (r.includes("base")) return peerDefault;
    if (r.includes("eth")) return isMainnet ? "Ethereum" : "Ethereum_Sepolia";
    if (r.includes("arb")) return isMainnet ? "Arbitrum" : "Arbitrum_Sepolia";
    if (r.includes("opt") || r === "op") return isMainnet ? "Optimism" : "Optimism_Sepolia";
    return resolveChain(raw);
  };

  const fromTo = text.match(/\bfrom\s+([a-z0-9_\s]+?)\s+to\s+([a-z0-9_\s]+?)(?:\s|$|,|\.)/i);
  if (fromTo) {
    return { fromChain: mapChain(fromTo[1]), toChain: mapChain(fromTo[2]) };
  }
  const arrow = text.match(/\b(arc|base|ethereum|eth|arbitrum|arb|optimism|op)\s*(?:to|→|->)\s*(arc|base|ethereum|eth|arbitrum|arb|optimism|op)\b/i);
  if (arrow) {
    return { fromChain: mapChain(arrow[1]), toChain: mapChain(arrow[2]) };
  }
  const toOnly = text.match(/\b(?:to|onto)\s+(arc|base|ethereum|eth|arbitrum|arb|optimism|op)\b/i);
  const fromOnly = text.match(/\bfrom\s+(arc|base|ethereum|eth|arbitrum|arb|optimism|op)\b/i);
  return {
    fromChain: fromOnly ? mapChain(fromOnly[1]) : undefined,
    toChain: toOnly ? mapChain(toOnly[1]) : undefined,
  };
}

function detectIntent(text: string): AutopilotDraft["type"] | null {
  const t = text.toLowerCase();
  if (/\b(swap|convert|exchange)\b/.test(t)) return "swap";
  if (/\b(bridge|cross-?chain)\b/.test(t)) return "bridge";
  if (/\b(send|pay|transfer)\b/.test(t)) return "send";
  return null;
}

export function processAutopilotTurn(
  userMessage: string,
  currentDraft: AutopilotDraft | null,
  isMainnet: boolean,
): AutopilotTurnResult {
  const text = userMessage.trim();
  if (!text) return { status: "passthrough" };

  if (currentDraft && /^(cancel|stop|reset|nevermind|clear)\b/i.test(text)) {
    return {
      status: "cancelled",
      reply: "Auto-Pilot draft cancelled. Tell me what you'd like to do next.",
    };
  }

  const explicitIntent = detectIntent(text);
  const type = explicitIntent ?? currentDraft?.type ?? null;
  if (!type) return { status: "passthrough" };

  // Avoid hijacking pure informational questions like "how do I swap?"
  if (!currentDraft && /^(how|what|why|when|where|explain)\b/i.test(text)) {
    return { status: "passthrough" };
  }

  const draft: AutopilotDraft = currentDraft && (!explicitIntent || explicitIntent === currentDraft.type)
    ? { ...currentDraft }
    : { type };

  const amount = extractAmount(text);
  if (amount) draft.amount = amount;

  const arcChain: ChainId = isMainnet ? "Arc_Mainnet" : "Arc_Testnet";
  const networkLabel = isMainnet ? "Arc Mainnet" : "Arc Testnet";

  if (draft.type === "send") {
    const addr = extractAddress(text);
    if (addr) draft.recipient = addr;

    if (!draft.amount && !draft.recipient) {
      return {
        status: "ask",
        draft,
        reply: `**Auto-Pilot (${networkLabel})** — How much **USDC** do you want to send, and to which **0x address**?\n\nExample: \`1.5 USDC to 0x1234…\``,
      };
    }
    if (!draft.amount) {
      return {
        status: "ask",
        draft,
        reply: `Got recipient \`${draft.recipient}\`. **How much USDC** would you like to send?`,
      };
    }
    if (!draft.recipient) {
      return {
        status: "ask",
        draft,
        reply: `Got **${draft.amount} USDC**. Which **0x wallet address** should I send it to?`,
      };
    }

    return {
      status: "ready",
      draft,
      preview: {
        type: "send",
        title: "Send USDC (Auto-Pilot)",
        summary: `Send ${draft.amount} USDC to ${draft.recipient} on ${networkLabel}`,
        amount: draft.amount,
        token: "USDC",
        toChain: arcChain,
        recipient: draft.recipient,
        estimatedFeeUsd: 0.001,
        estimatedTime: "<1s",
        canExecute: true,
        requiresWallet: true,
      },
    };
  }

  if (draft.type === "swap") {
    const tokens = extractSwapTokens(text);
    if (tokens.tokenIn && tokens.tokenOut) {
      draft.tokenIn = tokens.tokenIn;
      draft.tokenOut = tokens.tokenOut;
    } else if (tokens.tokenIn && !draft.tokenIn) {
      draft.tokenIn = tokens.tokenIn;
    } else if (tokens.tokenIn && draft.tokenIn && !draft.tokenOut && tokens.tokenIn !== draft.tokenIn) {
      draft.tokenOut = tokens.tokenIn;
    }

    if (!draft.tokenIn || !draft.tokenOut) {
      return {
        status: "ask",
        draft,
        reply: `**Auto-Pilot (${networkLabel})** — Which token pair do you want to swap${draft.amount ? ` (**${draft.amount}**)` : ""}?\n\nExample: \`USDC to EURC\` or \`USDC to cirBTC\``,
      };
    }
    if (!draft.amount) {
      return {
        status: "ask",
        draft,
        reply: `Swapping **${draft.tokenIn} → ${draft.tokenOut}** on ${networkLabel}. **How much ${draft.tokenIn}** would you like to swap?`,
      };
    }

    return {
      status: "ready",
      draft,
      preview: {
        type: "swap",
        title: `Swap ${draft.tokenIn} → ${draft.tokenOut} (Auto-Pilot)`,
        summary: `Swap ${draft.amount} ${draft.tokenIn} to ${draft.tokenOut} on ${networkLabel}`,
        amount: draft.amount,
        token: draft.tokenIn,
        tokenOut: draft.tokenOut,
        toChain: arcChain,
        estimatedFeeUsd: 0.02,
        estimatedTime: "~2s",
        canExecute: true,
        requiresWallet: true,
      },
    };
  }

  // Bridge
  const chains = extractBridgeChains(text, isMainnet);
  if (chains.fromChain) draft.fromChain = chains.fromChain;
  if (chains.toChain) draft.toChain = chains.toChain;

  if (!draft.fromChain || !draft.toChain) {
    return {
      status: "ask",
      draft,
      reply: `**Auto-Pilot (${networkLabel})** — Which **source and destination chains** do you want to bridge between?\n\nExample: \`Arc to Base\` or \`from Base to Arc\``,
    };
  }
  if (!draft.amount) {
    return {
      status: "ask",
      draft,
      reply: `Bridging **${draft.fromChain.replace(/_/g, " ")} → ${draft.toChain.replace(/_/g, " ")}**. **How much USDC** would you like to bridge?`,
    };
  }

  return {
    status: "ready",
    draft,
    preview: {
      type: "bridge",
      title: `Bridge ${draft.fromChain.replace(/_/g, " ")} → ${draft.toChain.replace(/_/g, " ")} (Auto-Pilot)`,
      summary: `Bridge ${draft.amount} USDC from ${draft.fromChain} to ${draft.toChain}`,
      amount: draft.amount,
      token: "USDC",
      fromChain: draft.fromChain,
      toChain: draft.toChain,
      estimatedFeeUsd: 0.08,
      estimatedTime: "~18s",
      canExecute: true,
      requiresWallet: true,
    },
  };
}
