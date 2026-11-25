"use client";

import { MotionConfig } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { WalletProvider } from "@/providers/wallet-provider";
import { ARC_EXPLORER, ARC_NETWORK_NAME, IS_ARC_MAINNET } from "@/lib/arc-chain";

export function AppShell({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user"><WalletProvider>
    <div className="ordenfi-shell min-h-screen overflow-x-clip">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="app-content">{children}</main>
      <footer className="ordenfi-footer">
        <div className="footer-identity"><span className="footer-wordmark">Ordenfi</span><span>Stablecoin operations on {ARC_NETWORK_NAME}</span></div>
        <div className="footer-links">
          {!IS_ARC_MAINNET && <a href="https://faucet.circle.com" target="_blank" rel="noreferrer">Faucet<span className="sr-only"> (opens in a new tab)</span></a>}
          <a href={ARC_EXPLORER} target="_blank" rel="noreferrer">Explorer<span className="sr-only"> (opens in a new tab)</span></a>
        </div>
      </footer>
    </div>
  </WalletProvider></MotionConfig>;
}
