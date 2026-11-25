"use client";

import { useState } from "react";
import { ArrowRight, Check, Clock, Fuel, Route } from "lucide-react";
import type { ActionPreview } from "@/types";
import { Button } from "@/components/ui/button";
import { formatUsdc } from "@/lib/fees";
import { CHAINS } from "@/lib/chains";
import { usePilotStore } from "@/store/pilot-store";
import { getAssistantPlan, type AssistantPlan } from "@/lib/assistant-plan";
import { assistantGuides, type AssistantGuide } from "@/lib/assistant-tools";

function LiveSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      className={`agfusion-live-loader inline-flex shrink-0 ${className}`}
      aria-label="Loading"
    >
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function ActionPreviewCard({ preview, onExecute, onReviewPlan, onGuide, busy = false }: {
  preview: ActionPreview;
  onExecute: () => void;
  onReviewPlan?: (plan: AssistantPlan) => void;
  onGuide?: (guide: AssistantGuide) => void;
  busy?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const walletType = usePilotStore((s) => s.walletType);
  const walletAddress = usePilotStore((s) => s.walletAddress);
  const done = Boolean(preview.executed);
  const cta = preview.type === "swap" ? "Confirm Swap" : preview.type === "send" ? "Confirm Send" : preview.type === "bridge" ? "Confirm Bridge" : "Confirm";
  const draft = onReviewPlan ? getAssistantPlan(preview) : null;
  let missingField: AssistantGuide | undefined;
  if (onGuide && !preview.canExecute && !done) {
    if (preview.type === "send") missingField = Number(preview.amount) > 0 ? "sendRecipient" : "sendAmount";
    if (preview.type === "swap" && !(Number(preview.amount) > 0)) missingField = "swapAmount";
    if (preview.type === "bridge") {
      if (!preview.toChain || preview.fromChain === preview.toChain) missingField = "bridgeDestination";
      else if (!preview.fromChain) missingField = "bridgeSource";
      else if (!(Number(preview.amount) > 0)) missingField = "bridgeAmount";
    }
  }

  async function ensureWalletServerSession() {
    try {
      const current = await fetch("/api/auth/me", { cache: "no-store" });
      const currentData = await current.json().catch(() => ({}));
      if (currentData?.authenticated === true) return;

      const { getActiveWalletMeta } = await import("@/sdk/active-wallet");
      const meta = getActiveWalletMeta();
      const isCircle = walletType === "circle" || meta?.uuid === "circle-pw";

      if (isCircle) {
        const targetAddr = walletAddress || meta?.address;
        if (!targetAddr) return;
        const { getCircleSession } = await import("@/sdk/circle-pw");
        const circleSession = getCircleSession();
        if (!circleSession?.userToken) return;

        await fetch("/api/auth/circle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userToken: circleSession.userToken,
            walletId: circleSession.wallets?.[0]?.id || "",
            address: targetAddr,
          }),
        }).catch(() => {});
      }
    } catch {
      // Best-effort session sync; never block wallet transaction execution
    }
  }

  async function confirmAndExecute() {
    if (!preview.canExecute || done || busy || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      void ensureWalletServerSession();
      let confirmToken = preview.confirmToken;
      if (!confirmToken) {
        try {
          const issueResponse = await fetch("/api/ai/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "issue", preview, wallet: walletAddress }),
          });
          const issueData = await issueResponse.json().catch(() => ({}));
          if (issueResponse.ok && issueData?.confirmToken) {
            confirmToken = String(issueData.confirmToken);
          }
        } catch {}
      }
      if (confirmToken) {
        await fetch("/api/ai/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmToken, preview, wallet: walletAddress }),
        }).catch(() => {});
      }
      onExecute();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirmation failed.");
    } finally {
      setConfirming(false);
    }
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3  shadow-accent/5">
      <div>
        <div className="text-xs font-semibold text-accent mb-1">Action Plan</div>
        <div className="font-semibold text-foreground text-base">{preview.title}</div>
        {preview.type === "bridge" && preview.fromChain && preview.toChain && <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-medium text-foreground">{String(preview.fromChain).includes("Arc") ? "Arc" : String(preview.fromChain).includes("Base") ? "Base" : preview.fromChain}<span className="text-accent">→</span>{String(preview.toChain).includes("Arc") ? "Arc" : String(preview.toChain).includes("Base") ? "Base" : preview.toChain}</div>}
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{preview.summary}</p>
      </div>
      {draft && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-background px-3 py-2 text-xs">
          <strong className="tabular-nums text-foreground">
            {draft.type === "swap" ? `${draft.amount} ${draft.tokenIn} → ${draft.tokenOut}` : `${draft.amount} USDC`}
          </strong>
          <span className="text-muted-foreground">{CHAINS[draft.chain].label}</span>
        </div>
      )}
      {preview.plan && preview.plan.length > 0 && <ol className="space-y-1.5">{preview.plan.map((step, i) => <li key={step.id} className="flex items-start gap-2 text-xs text-muted-foreground"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/15 text-xs font-mono text-accent">{i + 1}</span><span>{step.label}{step.detail && <span className="text-muted-foreground/80"> · {step.detail}</span>}</span></li>)}</ol>}
      {preview.route && preview.route.length > 0 && <div className="flex flex-wrap items-center gap-1.5 text-xs"><Route className="h-3.5 w-3.5 text-accent" />{preview.route.map((hop, i) => <span key={i} className="flex items-center gap-1.5">{i > 0 && <ArrowRight className="h-3 w-3 text-slate-600" />}<span className="rounded-md bg-muted border border-border px-2 py-0.5 text-foreground">{hop}</span></span>)}</div>}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400">{typeof preview.estimatedFeeUsd === "number" && <span className="inline-flex items-center gap-1"><Fuel className="h-3 w-3 text-amber-300" />~{formatUsdc(preview.estimatedFeeUsd)} gas</span>}{preview.estimatedTime && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3 text-emerald-300" />{preview.estimatedTime}</span>}{preview.fromChain && preview.toChain && <span>{CHAINS[preview.fromChain]?.short} → {CHAINS[preview.toChain]?.short}</span>}</div>
      {missingField ? (
        <Button size="lg" className="w-full text-sm font-semibold h-11" disabled={busy} onClick={() => missingField && onGuide?.(missingField)} type="button">
          {assistantGuides[missingField].label}<ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      ) : draft ? (
        <Button size="lg" className="w-full text-sm font-semibold h-11" disabled={busy} onClick={() => onReviewPlan?.(draft)} type="button">
          Review in {draft.type === "swap" ? "Swap" : "Send"}<ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      ) : (
        <Button size="lg" className="w-full text-sm font-semibold h-11" disabled={!preview.canExecute || done || busy || confirming} onClick={(e) => { e.preventDefault(); e.stopPropagation(); void confirmAndExecute(); }} type="button">
          {done ? <><Check className="h-4 w-4" />Executed</> : busy || confirming ? <><LiveSpinner />{confirming ? "Authorizing…" : "Confirming in wallet…"}</> : preview.canExecute ? cta : "Missing details"}
        </Button>
      )}
      {error && <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-200">{error}</div>}
    </div>
  );
}
