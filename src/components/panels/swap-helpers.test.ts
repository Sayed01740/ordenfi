import { describe, expect, it } from "vitest";
import { formatSwapRate } from "./swap-helpers";

describe("formatSwapRate", () => {
  it("uses the full input amount, including amounts below one millionth", () => {
    expect(formatSwapRate("0.00000001", "0.00125")).toBe((125_000).toLocaleString());
  });

  it("keeps a small positive exchange rate visible", () => {
    expect(formatSwapRate("100", "0.00025")).toBe((0.0000025).toLocaleString(undefined, {
      maximumSignificantDigits: 6,
    }));
  });

  it("omits the rate when a quote is missing or cannot be displayed", () => {
    expect(formatSwapRate("0", "1")).toBeNull();
    expect(formatSwapRate("1", undefined)).toBeNull();
    expect(formatSwapRate("1", "0")).toBeNull();
  });
});
