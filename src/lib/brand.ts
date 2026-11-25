export const BRAND_NAME = "Ordenfi";
export const BRAND_DESCRIPTION = "Swap, send, and bridge stablecoins on Arc. Review every action and confirm it in your wallet.";

// Primary production custom domain
const PRIMARY_CUSTOM_DOMAIN = "https://ordenfi.xyz";
const FALLBACK_DEPLOYMENT_URL = "https://ordenfi.vercel.app";

export function resolveBrandUrl(value: string | undefined): string {
  if (!value?.trim()) return PRIMARY_CUSTOM_DOMAIN;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return PRIMARY_CUSTOM_DOMAIN;
    // Reject obsolete AGFusion domains so legacy environment variables never leak into metadata or links
    if (url.hostname.includes("agfusion")) return PRIMARY_CUSTOM_DOMAIN;
    return url.origin;
  } catch {
    return PRIMARY_CUSTOM_DOMAIN;
  }
}

export const BRAND_URL = resolveBrandUrl(process.env.NEXT_PUBLIC_APP_URL);
