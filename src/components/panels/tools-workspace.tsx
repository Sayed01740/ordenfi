"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeftRight,
  ChevronDown,
  CreditCard,
  MoreHorizontal,
  QrCode,
  Send,
  ShieldAlert,
  Users,
  Wallet,
  Waypoints,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePilotStore } from "@/store/pilot-store";
import {
  BridgePanelBody,
  SendPanelBody,
} from "@/components/panels/action-panels";
import { SwapCard } from "@/components/dapp/swap-card";
import { SWAP_HANDOFF_EVENT } from "@/lib/swap-handoff";
import { ASSISTANT_PLAN_EVENT, type AssistantPlan } from "@/lib/assistant-plan";
import { ASSISTANT_GUIDE_EVENT, assistantGuides, assistantNetworkConflict, type AssistantGuide } from "@/lib/assistant-tools";
import { useAssistantWorkspace } from "@/components/workspace/assistant-workspace-context";
import { Button } from "@/components/ui/button";

const RecoveryPanelBody = dynamic(
  () => import("@/components/panels/action-panels").then((m) => m.RecoveryPanelBody),
  { ssr: false },
);
const QrPayCard = dynamic(
  () => import("@/components/pay/qr-pay").then((m) => m.QrPayCard),
  { ssr: false },
);
const BatchPayrollCard = dynamic(
  () => import("@/components/pay/batch-payroll").then((m) => m.BatchPayrollCard),
  { ssr: false },
);
const RiskOracleCard = dynamic(
  () => import("@/components/pay/risk-oracle").then((m) => m.RiskOracleCard),
  { ssr: false },
);
const OnrampCard = dynamic(
  () => import("@/components/pay/onramp-card").then((m) => m.OnrampCard),
  { ssr: false },
);
const UnifiedBalanceCard = dynamic(
  () => import("@/components/balance/unified-balance").then((m) => m.UnifiedBalanceCard),
  { ssr: false },
);

type TabId = "send" | "swap" | "bridge" | "receive" | "batch" | "more";

const TABS: Array<{
  id: TabId;
  label: string;
  short: string;
  icon: typeof Send;
}> = [
  {
    id: "swap",
    label: "Swap",
    short: "Exchange",
    icon: ArrowLeftRight,
  },
  {
    id: "send",
    label: "Send",
    short: "USDC Transfer",
    icon: Send,
  },
  {
    id: "bridge",
    label: "Bridge",
    short: "Cross-Chain",
    icon: Waypoints,
  },
  { id: "receive", label: "Receive", short: "Payment links & QR", icon: QrCode },
  { id: "batch", label: "Batch Payments", short: "Sequential USDC payments", icon: Users },
  {
    id: "more",
    label: "More",
    short: "Utilities",
    icon: MoreHorizontal,
  },
];

/**
 * Reset every transaction amount field rendered inside the money-tools workspace
 * after a newly completed transaction. The transaction components remain the
 * source of truth for validation and execution; this only clears their local
 * form values after a confirmed success.
 */
function TransactionAmountResetter() {
  const transactions = usePilotStore((s) => s.transactions);
  const initialized = useRef(false);
  const seenSuccessIds = useRef(new Set<string>());

  useEffect(() => {
    const successfulIds = transactions
      .filter((tx) => tx.status === "success")
      .map((tx) => tx.id);

    if (!initialized.current) {
      successfulIds.forEach((id) => seenSuccessIds.current.add(id));
      initialized.current = true;
      return;
    }

    const newSuccess = successfulIds.filter((id) => !seenSuccessIds.current.has(id));
    if (!newSuccess.length) return;
    newSuccess.forEach((id) => seenSuccessIds.current.add(id));

    const root = document.getElementById("tools");
    if (!root) return;

    const inputs = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="number"]'))
      .filter((input) => input.getAttribute("aria-label") !== "Custom slippage percentage" && !input.closest("#tools-panel-batch, #tools-panel-receive"));

    for (const input of inputs) {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "0");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, [transactions]);

  return null;
}

/**
 * Shared action tools in the left column of the unified workspace.
 */
export function ToolsWorkspace({
  defaultTab = "send",
}: {
  defaultTab?: TabId;
}) {
  const [tab, setTab] = useState<TabId>(defaultTab);
  const [compactNavigation, setCompactNavigation] = useState(false);
  const [draft, setDraft] = useState<{ plan: AssistantPlan; revision: number } | null>(null);
  const [guide, setGuide] = useState<{ target: AssistantGuide } | null>(null);
  const { setPlanChain } = useAssistantWorkspace() ?? {};
  const walletAddress = usePilotStore((state) => state.walletAddress);
  const walletChainId = usePilotStore((state) => state.walletChainId);
  const networkMode = usePilotStore((state) => state.networkMode);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const plan = draft?.plan;
  const planConflict = assistantNetworkConflict(plan?.chain, Boolean(walletAddress), walletChainId, networkMode);

  useEffect(() => {
    setPlanChain?.(plan?.chain);
    return () => setPlanChain?.(undefined);
  }, [plan?.chain, setPlanChain]);

  function chooseTab(next: TabId) {
    setGuide(null);
    if (next !== tab) setDraft(null);
    setTab(next);
  }

  function clearSubmittedDraft() {
    setDraft(current => current === draft ? null : current);
  }

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setCompactNavigation(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Chat agent hands a planned swap to the Swap tab (Mainnet Permit2 flow).
  useEffect(() => {
    const onHandoff = () => {
      setGuide(null);
      setDraft(null);
      setTab("swap");
      document.getElementById("tools")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    };
    window.addEventListener(SWAP_HANDOFF_EVENT, onHandoff);
    return () => window.removeEventListener(SWAP_HANDOFF_EVENT, onHandoff);
  }, []);

  useEffect(() => {
    function reviewPlan(event: Event) {
      const { detail } = event as CustomEvent<AssistantPlan>;
      if (detail?.type !== "send" && detail?.type !== "swap") return;
      setGuide(null);
      setDraft(current => ({ plan: detail, revision: (current?.revision ?? 0) + 1 }));
      setTab(detail.type);
    }
    window.addEventListener(ASSISTANT_PLAN_EVENT, reviewPlan);
    return () => window.removeEventListener(ASSISTANT_PLAN_EVENT, reviewPlan);
  }, []);

  useEffect(() => {
    function openGuide(event: Event) {
      const target = (event as CustomEvent<AssistantGuide>).detail;
      if (!Object.hasOwn(assistantGuides, target)) return;
      const next = assistantGuides[target].tab;
      setDraft(current => current?.plan.type === next ? current : null);
      setTab(next);
      setGuide({ target });
    }
    window.addEventListener(ASSISTANT_GUIDE_EVENT, openGuide);
    return () => window.removeEventListener(ASSISTANT_GUIDE_EVENT, openGuide);
  }, []);

  useEffect(() => {
    if (!guide) return;
    const { selector, tab: targetTab } = assistantGuides[guide.target];
    const panel = document.getElementById(`tools-panel-${targetTab}`);
    if (!panel || panel.hidden) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    let marked: HTMLElement | null = null;
    function pointToField() {
      const field = panel?.querySelector<HTMLElement>(selector);
      if (!field?.getClientRects().length || field.matches(":disabled")) return false;
      marked = field;
      field.dataset.assistantGuided = "true";
      field.focus({ preventScroll: true });
      field.scrollIntoView({ behavior, block: "center" });
      if (guide?.target === "refreshQuote" && field instanceof HTMLButtonElement) field.click();
      return true;
    }
    const observer = new MutationObserver(() => { if (pointToField()) observer.disconnect(); });
    if (!pointToField()) {
      panel.focus({ preventScroll: true });
      panel.scrollIntoView({ behavior, block: "center" });
      observer.observe(panel, { childList: true, subtree: true });
    }
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      marked?.removeAttribute("data-assistant-guided");
      setGuide(current => current === guide ? null : current);
    }, 1600);
    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
      marked?.removeAttribute("data-assistant-guided");
    };
  }, [guide]);

  useEffect(() => {
    if (!draft) return;
    const tool = document.getElementById(`tools-panel-${draft.plan.type}`);
    tool?.focus({ preventScroll: true });
    document.getElementById("tools")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }, [draft]);

  return (
    <section
      id="tools"
      tabIndex={-1}
      aria-labelledby="tools-heading"
      className="operations-tools-layout scroll-mt-24 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
    >
      <TransactionAmountResetter />
      <aside className="operations-actions-sidebar" aria-label="Action navigation">
        <h2 id="tools-heading">Actions</h2>

        <div role="tablist" aria-label="Money tools" aria-orientation={compactNavigation ? "horizontal" : "vertical"} className="operations-action-list">
          {TABS.map((t, index) => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tools-tab-${t.id}`}
                aria-controls={`tools-panel-${t.id}`}
                aria-selected={on}
                title={t.short}
                tabIndex={on ? 0 : -1}
                ref={(node) => { tabRefs.current[index] = node; }}
                onClick={() => chooseTab(t.id)}
                onKeyDown={(event) => {
                  let nextIndex: number;
                  switch (event.key) {
                    case "ArrowDown": if (compactNavigation) return; nextIndex = (index + 1) % TABS.length; break;
                    case "ArrowUp": if (compactNavigation) return; nextIndex = (index - 1 + TABS.length) % TABS.length; break;
                    case "ArrowRight": if (!compactNavigation) return; nextIndex = (index + 1) % TABS.length; break;
                    case "ArrowLeft": if (!compactNavigation) return; nextIndex = (index - 1 + TABS.length) % TABS.length; break;
                    case "Home": nextIndex = 0; break;
                    case "End": nextIndex = TABS.length - 1; break;
                    default: return;
                  }
                  event.preventDefault();
                  chooseTab(TABS[nextIndex].id);
                  tabRefs.current[nextIndex]?.focus();
                }}
                className={cn(
                  "operations-action-item transition-colors duration-150 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
                  on
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium",
                )}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="trade-surface operations-tool-surface">
        <div className="operations-tools-header flex items-center justify-between gap-3">
          <h3 className="text-lg font-medium">{TABS.find(action => action.id === tab)?.label}</h3>
          <span className="text-xs text-muted-foreground">Review before signing</span>
        </div>

      {TABS.map((t) => (
        <div key={t.id} id={`tools-panel-${t.id}`} role="tabpanel" aria-labelledby={`tools-tab-${t.id}`} hidden={tab !== t.id} tabIndex={0} className={cn(t.id === "swap" ? "trade-body" : "p-4 sm:p-5", "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset")}>
          {(tab === t.id || t.id === "batch" || t.id === "receive") && (
            planConflict && t.id === plan?.type ? (
              <div className="space-y-3">
                <p role="status" className="text-sm text-warning">This plan uses {planConflict.expected}. Switch to that network to review it.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setDraft(null)}>Discard plan</Button>
              </div>
            ) :
            t.id === "send" ? <SendPanelBody key={draft?.revision ?? 0} initialPlan={plan?.type === "send" ? plan : undefined} onDraftSubmitted={draft ? clearSubmittedDraft : undefined} /> :
            t.id === "swap" ? <SwapCard key={draft?.revision ?? 0} connected={Boolean(walletAddress)} initialPlan={plan?.type === "swap" ? plan : undefined} onDraftSubmitted={draft ? clearSubmittedDraft : undefined} /> :
            t.id === "bridge" ? <><BridgePanelBody /><RecoveryPanelBody /></> :
            t.id === "receive" ? <QrPayCard embedded /> :
            t.id === "batch" ? <BatchPayrollCard /> : <MoreTools />
          )}
        </div>
      ))}
      </div>
    </section>
  );
}

function MoreTools() {
  return (
    <div className="space-y-2.5">
      <Accordion icon={CreditCard} title="Buy USDC (Fiat Onramp)" plain="Fund your wallet with Debit Card, Apple Pay, Google Pay, or Bank Transfer.">
        <OnrampCard embedded />
      </Accordion>

      <Accordion icon={ShieldAlert} title="Route Risk Analysis" plain="Local route estimate based on amount and network; no live market data.">
        <RiskOracleCard embedded />
      </Accordion>

      <Accordion icon={Wallet} title="Unified Balance" plain="Cross-chain deposit and balance aggregation.">
        <UnifiedBalanceCard embedded />
      </Accordion>

    </div>
  );
}

function Accordion({
  icon: Icon,
  title,
  plain,
  children,
}: {
  icon: typeof Send;
  title: string;
  plain: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card/70 transition-colors hover:border-accent/30">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-start gap-3 px-3.5 py-3 text-left transition-colors motion-reduce:transition-none hover:bg-card focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      >
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
          <Icon aria-hidden="true" className="h-4 w-4 text-accent" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm font-medium tracking-tight text-foreground">{title}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">{plain}</span>
        </span>
        <ChevronDown aria-hidden="true" className={cn("mt-1.5 h-4 w-4 shrink-0 text-slate-400 transition-transform motion-reduce:transition-none", open && "rotate-180 text-accent")} />
      </button>
      <div id={contentId} hidden={!open} className="border-t border-white/[0.08] px-3.5 pb-3.5 pt-3">{open && children}</div>
    </div>
  );
}
