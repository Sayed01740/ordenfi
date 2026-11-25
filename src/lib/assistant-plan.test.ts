import { describe, expect, it } from "vitest";
import type { ActionPreview } from "@/types";
import { getAssistantPlan } from "./assistant-plan";

const recipient = "0x1111111111111111111111111111111111111111";
const send: ActionPreview = {
  title: "Send USDC", summary: "Review the payment", type: "send", canExecute: true,
  amount: "1.000001", token: "USDC", recipient, toChain: "Arc_Testnet",
};

describe("assistant plan drafts", () => {
  it("retains the original network, amount, and full recipient without carrying execution authority", () => {
    expect(getAssistantPlan({ ...send, confirmToken: "unused" })).toEqual({
      type: "send", chain: "Arc_Testnet", amount: "1.000001", recipient,
    });
  });

  it("does not hand off invalid, completed, or unsupported sends", () => {
    for (const patch of [{ amount: "1.0000001" }, { recipient: "bad" }, { token: "EURC" }, { executed: true }, { toChain: "Base" as const }]) {
      expect(getAssistantPlan({ ...send, ...patch })).toBeNull();
    }
  });

  it("hands off a supported pair using the input token precision", () => {
    const swap: ActionPreview = { ...send, type: "swap", token: "CIRBTC", tokenOut: "USDC", toChain: "Arc_Mainnet", amount: "0.00000001" };
    expect(getAssistantPlan(swap)).toEqual({ type: "swap", tokenIn: "cirBTC", tokenOut: "USDC", chain: "Arc_Mainnet", amount: "0.00000001" });
    expect(getAssistantPlan({ ...swap, tokenOut: "cirBTC" })).toBeNull();
    expect(getAssistantPlan({ ...swap, tokenOut: "ETH" })).toBeNull();
  });
});
