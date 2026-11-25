export const BRAND_NAME = "Ordenfi";
export const BRAND_DESCRIPTION = "Swap, send, and bridge stablecoins on Arc. Review every action and confirm it in your wallet.";

// Keep the working deployment until the owner configures a new domain.
const PRIMARY_DEPLOYMENT_URL = "https://ordenfi.vercel.app";

export function resolveBrandUrl(value: string | undefined): string {
  if (!value?.trim()) return PRIMARY_DEPLOYMENT_URL;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return PRIMARY_DEPLOYMENT_URL;
    // Reject obsolete AGFusion domains so legacy environment variables never leak into metadata or links
    if (url.hostname.includes("agfusion")) return PRIMARY_DEPLOYMENT_URL;
    return url.origin;
  } catch {
    return PRIMARY_DEPLOYMENT_URL;
  }
}

export const BRAND_URL = resolveBrandUrl(process.env.NEXT_PUBLIC_APP_URL);
