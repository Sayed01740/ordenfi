export const BRAND_NAME = "Ordenfi";
export const BRAND_DESCRIPTION = "Swap, send, and bridge stablecoins on Arc. Review every action and confirm it in your wallet.";

// Keep the working deployment until the owner configures a new domain.
const LEGACY_DEPLOYMENT_URL = "https://agfusion.vercel.app";

export function resolveBrandUrl(value: string | undefined): string {
  if (!value?.trim()) return LEGACY_DEPLOYMENT_URL;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return LEGACY_DEPLOYMENT_URL;
    return url.origin;
  } catch {
    return LEGACY_DEPLOYMENT_URL;
  }
}

export const BRAND_URL = resolveBrandUrl(process.env.NEXT_PUBLIC_APP_URL);
