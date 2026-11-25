"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, ArrowUpRight, Check, MessageSquare, ShieldCheck, X } from "lucide-react";
import { usePilotStore } from "@/store/pilot-store";
import { getArcNetworkMeta } from "@/lib/arc-chain";
import { SwapCard } from "@/components/dapp/swap-card";
import { ChatPanel } from "@/components/ai/chat-panel";

export function StreamlinedHero() {
  const walletAddress = usePilotStore((s) => s.walletAddress);
  const walletChainId = usePilotStore((s) => s.walletChainId);
  const meta = getArcNetworkMeta(walletChainId);
  const [showAi, setShowAi] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLButtonElement>(null);
  const toggled = useRef(false);
  function toggleAssistant(visible: boolean) {
    toggled.current = true;
    setShowAi(visible);
  }
  useEffect(() => {
    if (toggled.current) (showAi ? closeRef.current : restoreRef.current)?.focus();
  }, [showAi]);

  return (
    <div className="ordenfi-workspace">
      <header className="workspace-heading">
        <div>
          <h1>Your money. In order.</h1>
          <p>Swap, send, and bridge stablecoins. Every move stays yours.</p>
        </div>
        <Link href="/dashboard" className="workspace-link">Open workspace <ArrowUpRight aria-hidden="true" size={16} /></Link>
      </header>
      <div className={showAi ? "trading-layout" : "trading-layout trading-layout--solo"}>
        <section className="trade-surface" aria-labelledby="swap-title">
          <div className="trade-toolbar"><h2 id="swap-title"><ArrowLeftRight aria-hidden="true" size={18} /> Swap</h2><span className="network-label">{meta.name}</span></div>
          <div className="trade-body"><SwapCard connected={Boolean(walletAddress)} /></div>
          <div className="trade-assurance"><ShieldCheck aria-hidden="true" size={16} /><span>Your wallet signs. Your funds stay in your control.</span></div>
        </section>
          <section id="ordenfi-assistant" hidden={!showAi} className="assistant-surface" aria-label="Ordenfi assistant">
            <button ref={closeRef} type="button" className="assistant-close" onClick={() => toggleAssistant(false)} aria-label="Hide assistant" aria-controls="ordenfi-assistant" aria-expanded={showAi}><X aria-hidden="true" size={16} /></button>
            <ChatPanel />
          </section>
        {!showAi && <button ref={restoreRef} type="button" className="assistant-restore" onClick={() => toggleAssistant(true)} aria-expanded="false" aria-controls="ordenfi-assistant"><MessageSquare aria-hidden="true" size={18} /> Open assistant</button>}
      </div>
      <div className="workspace-footnotes" aria-label="How Ordenfi works">
        <span><Check aria-hidden="true" size={14} /> Gas paid in USDC</span>
        <span><Check aria-hidden="true" size={14} /> Review before execution</span>
        <Link href="/docs">Understand the flow <ArrowUpRight aria-hidden="true" size={14} /></Link>
      </div>
    </div>
  );
}
