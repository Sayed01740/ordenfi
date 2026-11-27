import { describe, expect, it } from "vitest";
import { processAutopilotTurn } from "./autopilot-slots";

describe("processAutopilotTurn (opt-in slot filling)", () => {
  it("asks for missing token pair and amount for swap across turns", () => {
    const t1 = processAutopilotTurn("I want to swap", null, false);
    expect(t1.status).toBe("ask");
    if (t1.status !== "ask") return;

    const t2 = processAutopilotTurn("USDC to EURC", t1.draft, false);
    expect(t2.status).toBe("ask");
    if (t2.status !== "ask") return;

    const t3 = processAutopilotTurn("2.5", t2.draft, false);
    expect(t3.status).toBe("ready");
    if (t3.status !== "ready") return;
    expect(t3.preview.type).toBe("swap");
    expect(t3.preview.amount).toBe("2.5");
    expect(t3.preview.token).toBe("USDC");
    expect(t3.preview.tokenOut).toBe("EURC");
    expect(t3.preview.toChain).toBe("Arc_Testnet");
  });

  it("asks for missing chains and amount for bridge on Mainnet", () => {
    const t1 = processAutopilotTurn("bridge", null, true);
    expect(t1.status).toBe("ask");
    if (t1.status !== "ask") return;

    const t2 = processAutopilotTurn("Arc to Base", t1.draft, true);
    expect(t2.status).toBe("ask");
    if (t2.status !== "ask") return;

    const t3 = processAutopilotTurn("3 USDC", t2.draft, true);
    expect(t3.status).toBe("ready");
    if (t3.status !== "ready") return;
    expect(t3.preview.fromChain).toBe("Arc_Mainnet");
    expect(t3.preview.toChain).toBe("Base");
    expect(t3.preview.amount).toBe("3");
  });

  it("handles send slot filling and cancel", () => {
    const t1 = processAutopilotTurn("send 1 USDC", null, true);
    expect(t1.status).toBe("ask");
    if (t1.status !== "ask") return;

    const cancelled = processAutopilotTurn("cancel", t1.draft, true);
    expect(cancelled.status).toBe("cancelled");

    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    const t2 = processAutopilotTurn(addr, t1.draft, true);
    expect(t2.status).toBe("ready");
    if (t2.status !== "ready") return;
    expect(t2.preview.recipient).toBe(addr);
    expect(t2.preview.amount).toBe("1");
  });
});
