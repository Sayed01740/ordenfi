"use client";

import { useState } from "react";
import { ArrowRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePilotStore } from "@/store/pilot-store";
import { executeBridgeRecovery } from "@/lib/client-actions";
import type { TransactionRecord } from "@/types";
import { CHAINS } from "@/lib/chains";

export function RecoveryPanelBody() {
  const { addTransaction, setActiveTx, setThinking, transactions, activeTxId } =
    usePilotStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The failed bridge to recover: the active tx if it's a failed bridge,
  // otherwise the most recent failed/retryable bridge (Phase 11).
  const failedTx: TransactionRecord | null =
    (transactions.find(
      (t) => t.id === activeTxId && t.type === "bridge" && (t.status === "error" || t.status === "retryable" || t.retryable),
    ) as TransactionRecord | undefined) ??
    (transactions.find(
      (t) => t.type === "bridge" && (t.status === "error" || t.status === "retryable" || t.retryable),
    ) as TransactionRecord | undefined) ??
    null;

  async function run() {
    if (!failedTx?.fromChain || !failedTx.toChain) {
      setError("No failed bridge to recover.");
      return;
    }
    setError(null);
    setBusy(true);
    setThinking(true);
    try {
      // Recover the EXACT failed transaction — never a hardcoded bridge.
      const tx = await executeBridgeRecovery({
        amount: failedTx.amount || "0",
        fromChain: failedTx.fromChain,
        toChain: failedTx.toChain,
        token: failedTx.token || "USDC",
        recipient: failedTx.recipient,
        failedTx,
        txId: failedTx.id,
      });
      addTransaction(tx);
      setActiveTx(tx.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setThinking(false);
    }
  }

  if (!failedTx?.fromChain || !failedTx.toChain) return null;

  return (
    <section aria-label="Bridge recovery" className="mt-5 space-y-3 border-t border-border pt-4">
      <div className="flex items-center gap-2">
        <History className="size-4 text-muted-foreground" aria-hidden="true" />
        <h4 className="text-sm font-semibold">Bridge recovery</h4>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="wrap-anywhere font-medium tabular-nums">{failedTx.amount} {failedTx.token || "USDC"}</span>
        <span className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
          {CHAINS[failedTx.fromChain]?.label ?? failedTx.fromChain}
          <ArrowRight className="size-3.5" aria-label="to" />
          {CHAINS[failedTx.toChain]?.label ?? failedTx.toChain}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Check the original transfer in Activity before starting recovery.</p>
      {error && <p role="alert" className="wrap-anywhere text-sm text-danger">{error}</p>}
      <Button
        size="sm"
        variant="secondary"
        data-assistant-recovery
        disabled={busy}
        type="button"
        onClick={() => void run()}
      >
        {busy ? "Recovering…" : "Resume bridge"}
      </Button>
    </section>
  );
}
