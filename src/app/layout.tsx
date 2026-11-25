import type { Metadata, Viewport } from "next";
import { Host_Grotesk, JetBrains_Mono } from "next/font/google";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_URL } from "@/lib/brand";
import "./globals.css";
import "./ordenfi-web3-premium.css";

const sans = Host_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-host", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains-mono", display: "swap" });
const title = "Ordenfi — Your money. In order.";

export const metadata: Metadata = {
  metadataBase: new URL(BRAND_URL), title, description: BRAND_DESCRIPTION,
  applicationName: BRAND_NAME, authors: [{ name: BRAND_NAME }],
  keywords: [BRAND_NAME, "Arc Network", "USDC", "stablecoin", "payments", "treasury"],
  icons: { icon: [{ url: "/brand/ordenfi-mark.svg", type: "image/svg+xml" }, { url: "/icon-32.png", sizes: "32x32", type: "image/png" }], apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }], shortcut: ["/favicon.ico"] },
  openGraph: { type: "website", url: BRAND_URL, siteName: BRAND_NAME, title, description: BRAND_DESCRIPTION, images: [{ url: "/og.png", width: 1200, height: 630, alt: "Ordenfi — Your money. In order." }] },
  twitter: { card: "summary_large_image", title, description: BRAND_DESCRIPTION, images: ["/og.png"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#111315" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={sans.variable + " " + mono.variable}><body className="antialiased">{children}</body></html>;
}
