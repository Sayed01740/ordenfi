import { describe, expect, it } from "vitest";
import { createPaymentLink, parsePaymentRequest, runPaymentBatch, paymentChain } from "./payment-tools";

const address = "0x1111111111111111111111111111111111111111";
describe("payment requests", () => {
  it("binds a request to the recipient, precise amount and selected network", () => {
    const url = createPaymentLink("https://example.com", { amount: "1.000001", to: address, memo: "A & B %", chain: "Arc_Mainnet" });
    expect(new URL(url).pathname).toBe("/app");
    expect(parsePaymentRequest(new URL(url).search)).toEqual({ amount: "1.000001", to: address, memo: "A & B %", chain: "Arc_Mainnet" });
  });
  it("rejects zero, excess precision, invalid recipients and unsupported chains", () => {
    for (const amount of ["0", "-1", "Infinity", "1e2", "0.0000001"]) {
      expect(() => createPaymentLink("https://example.com", { amount, to: address, memo: "", chain: "Arc_Testnet" })).toThrow();
    }
    expect(() => parsePaymentRequest("?pay=" + encodeURIComponent("amount=1&to=bad&chain=Arc_Testnet"))).toThrow();
    expect(() => parsePaymentRequest("?pay=" + encodeURIComponent(`amount=1&to=${address}&chain=Base`))).toThrow();
  });
  it("uses an actual Arc wallet network before the preference", () => {
    expect(paymentChain(5042, "testnet")).toBe("Arc_Mainnet");
    expect(paymentChain(5042002, "mainnet")).toBe("Arc_Testnet");
    expect(paymentChain(null, "mainnet")).toBe("Arc_Mainnet");
  });
});
describe("sequential payments", () => {
  it("stops at an unconfirmed transfer and never sends later recipients", async () => {
    const visited: number[] = [];
    const result = await runPaymentBatch([0, 1, 2], async row => { visited.push(row); return { status: row === 0 ? "success" : "pending" }; });
    expect(visited).toEqual([0, 1]);
    expect(result).toMatchObject({ confirmed: 1, complete: false, stoppedAt: 1 });
  });
  it("retains confirmed progress when a later signature is rejected", async () => {
    const result = await runPaymentBatch([0, 1, 2], async row => { if (row === 1) throw new Error("Signature rejected"); return { status: "success" }; });
    expect(result).toMatchObject({ confirmed: 1, complete: false, stoppedAt: 1, error: "Signature rejected" });
  });
  it("completes only after every transfer confirms", async () => {
    expect(await runPaymentBatch([0, 1], async () => ({ status: "success" }))).toMatchObject({ confirmed: 2, complete: true });
  });
});
