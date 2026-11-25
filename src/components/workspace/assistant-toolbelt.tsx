"use client";

import { useState } from "react";
import { ArrowLeftRight, ArrowRight, Check, ChevronDown, Copy, ExternalLink, QrCode, ReceiptText, RefreshCw, Send, ShieldAlert, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assistantReceipt, bridgeCheckpoints, guideTo, type AssistantGuide } from "@/lib/assistant-tools";
import { CHAINS } from "@/lib/chains";
import type { TransactionRecord } from "@/types";

const shortcuts = [
  { label: "Plan a swap", guide: "swapAmount", icon: ArrowLeftRight },
  { label: "Send USDC", guide: "sendRecipient", icon: Send },
  { label: "Create payment link", guide: "receiveAddress", icon: QrCode },
] as const;

const stepLabels = { pending: "Waiting", active: "In progress", success: "Confirmed", error: "Failed", noop: "Skipped" };
const stepColors = {
  pending: "bg-muted-foreground/45", active: "bg-warning", success: "bg-accent", error: "bg-danger", noop: "bg-muted-foreground/45",
};

export function transactionStatus(tx: TransactionRecord) {
  if (tx.executionMode === "demo") return "Demo transaction";
  if (tx.status === "success") return "Confirmed";
  if (tx.status === "retryable" || (tx.type === "bridge" && tx.retryable)) return "Needs review";
  if (tx.status === "error") return "Failed";
  if (tx.type === "bridge") {
    const active = bridgeCheckpoints(tx).find(step => step.state === "active");
    if (active) return `${active.label} in progress`;
  }
  return tx.txHash ? "Waiting for confirmation" : "In progress";
}

export function AssistantToolbelt({ onGuide, disabled }: { onGuide: (guide: AssistantGuide) => void; disabled?: boolean }) {
  return (
    <div role="group" aria-label="Assistant quick actions" className="flex flex-wrap gap-1.5">
      {shortcuts.map(({ label, guide, icon: Icon }) => (
        <Button key={guide} type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onGuide(guide)} className="min-h-10 gap-1.5 px-2.5 text-xs">
          <Icon aria-hidden="true" className="size-3.5 text-accent" /> {label}
        </Button>
      ))}
    </div>
  );
}

export function AssistantNetworkNotice({ scope, actual, expected, busy, error, onSwitch }: {
  scope: string; actual: string; expected: string; busy: boolean; error?: string | null; onSwitch: () => void;
}) {
  return (
    <div className="space-y-1.5 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2.5" data-assistant-network-conflict>
      <p role="status" className="flex items-center gap-2 text-xs font-semibold text-warning"><ShieldAlert aria-hidden="true" className="size-3.5" /> Network mismatch</p>
      <p className="text-xs text-muted-foreground">{scope}: {actual}. Required: {expected}.</p>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onSwitch} className="min-h-10 text-xs">
        {busy ? "Switching network…" : `Switch to ${expected}`}
      </Button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function AssistantQuoteNotice() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2">
      <span role="status" className="text-xs text-warning">Swap quote expired</span>
      <Button type="button" size="sm" variant="outline" onClick={() => guideTo("refreshQuote")} className="min-h-10 text-xs">
        <RefreshCw aria-hidden="true" className="size-3.5" /> Refresh quote
      </Button>
    </div>
  );
}

export function AssistantTransactionCard({ tx, disabled, onGuide }: {
  tx: TransactionRecord; disabled?: boolean; onGuide: (guide: AssistantGuide) => void;
}) {
  const [copiedHash, setCopiedHash] = useState<string>();
  const [copyError, setCopyError] = useState<string>();
  const receipt = assistantReceipt(tx);
  const isBridge = tx.type === "bridge";
  const needsRecovery = isBridge && (tx.status === "error" || tx.status === "retryable" || tx.retryable) && Boolean(tx.fromChain && tx.toChain);
  const status = transactionStatus(tx);
  const isConfirmed = status === "Confirmed";
  const from = tx.fromChain ? CHAINS[tx.fromChain]?.label : undefined;
  const to = tx.toChain ? CHAINS[tx.toChain]?.label : undefined;

  async function copyHash(hash: string) {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setCopyError(undefined);
    } catch { setCopyError("Could not copy. Select the hash to copy it manually."); }
  }

  return (
    <section aria-label={isBridge ? "Bridge Scout" : "Transaction receipt"} className="rounded-xl border border-border bg-background px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
        <span className="inline-flex items-center gap-2 font-semibold text-foreground">
          {isBridge ? <Waypoints aria-hidden="true" className="size-3.5 text-accent" /> : <ReceiptText aria-hidden="true" className={`size-3.5 ${isConfirmed ? "text-accent" : "text-muted-foreground"}`} />}
          {isBridge ? "Bridge Scout" : "Transaction status"}
        </span>
        <span role="status" className={isConfirmed ? "text-accent" : "text-muted-foreground"}>{status}</span>
      </div>
      {isBridge && (
        <>
          {from && to && <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">{from}<ArrowRight aria-hidden="true" className="size-3" />{to}</p>}
          <ol aria-label="Bridge checkpoints" className="mt-2.5 grid grid-cols-4 gap-1.5">
            {bridgeCheckpoints(tx).map(({ label, state }) => (
              <li key={label} className="min-w-0 text-[10px] leading-tight text-muted-foreground" aria-current={state === "active" ? "step" : undefined}>
                <span aria-hidden="true" className={`mb-1 block h-0.5 rounded-full ${stepColors[state]}`} />
                <span className="block break-words text-foreground">{label}</span>{stepLabels[state]}
              </li>
            ))}
          </ol>
        </>
      )}
      {needsRecovery && <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onGuide("bridgeRecovery")} className="mt-2 min-h-10 text-xs">Open recovery</Button>}
      {receipt && (
        <details className="group mt-2 border-t border-border pt-1">
          <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-1 text-xs text-foreground [&::-webkit-details-marker]:hidden">
            {receipt.scope}<ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground group-open:rotate-180" />
          </summary>
          <div className="space-y-2 pb-1">
            <p className="text-xs text-muted-foreground">{tx.amount} {tx.token}{tx.tokenOut ? ` → ${tx.tokenOut}` : ""}{receipt.chain ? ` · ${CHAINS[receipt.chain]?.label}` : ""}</p>
            <code className="block select-all break-all text-[11px] text-muted-foreground">{receipt.hash}</code>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void copyHash(receipt.hash)} className="min-h-10 text-xs">
                {copiedHash === receipt.hash ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
                {copiedHash === receipt.hash ? "Hash copied" : "Copy hash"}
              </Button>
              {receipt.explorerUrl && <Button asChild variant="ghost" size="sm" className="min-h-10 text-xs"><a href={receipt.explorerUrl} target="_blank" rel="noopener noreferrer">Explorer<ExternalLink aria-hidden="true" className="size-3.5" /></a></Button>}
            </div>
            {copyError && <p role="alert" className="text-xs text-danger">{copyError}</p>}
          </div>
        </details>
      )}
    </section>
  );
}
