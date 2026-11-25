import { describe, expect, it } from "vitest";
import { BRAND_NAME, resolveBrandUrl } from "./brand";

describe("Ordenfi public identity", () => {
  it("uses the new name while retaining the custom domain as primary", () => {
    expect(BRAND_NAME).toBe("Ordenfi");
    expect(resolveBrandUrl(undefined)).toBe("https://ordenfi.xyz");
  });

  it("normalizes a configured deployment URL", () => {
    expect(resolveBrandUrl(" https://app.ordenfi.example/ ")).toBe("https://app.ordenfi.example");
  });

  it("rejects obsolete agfusion URLs and normalizes to Ordenfi fallback", () => {
    expect(resolveBrandUrl("https://agfusion.vercel.app")).toBe("https://ordenfi.xyz");
    expect(resolveBrandUrl("https://agfusion.xyz")).toBe("https://ordenfi.xyz");
  });

  it("rejects unsafe schemes and malformed deployment URLs", () => {
    for (const value of ["javascript:alert(1)", "not a url", "file:///tmp/app"]) {
      expect(resolveBrandUrl(value)).toBe("https://ordenfi.xyz");
    }
  });
});
