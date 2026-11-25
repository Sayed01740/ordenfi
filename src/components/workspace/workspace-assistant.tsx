"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowRight, Minus } from "lucide-react";
import { ChatPanel } from "@/components/ai/chat-panel";
import { ASSISTANT_PLAN_EVENT, type AssistantPlan } from "@/lib/assistant-plan";
import { assistantNetworkConflict, assistantReceipt, guideTo, type AssistantGuide } from "@/lib/assistant-tools";
import type { PaymentChain } from "@/lib/payment-tools";
import { usePilotStore } from "@/store/pilot-store";
import { AssistantRobot, type AssistantMood } from "./assistant-robot";
import { AssistantNetworkNotice, AssistantQuoteNotice, AssistantToolbelt, AssistantTransactionCard, transactionStatus } from "./assistant-toolbelt";
import { useAssistantWorkspace } from "./assistant-workspace-context";
import styles from "./assistant-robot.module.css";
import identity from "./kona-identity.json";

const launcherDescription: Record<AssistantMood, string> = {
  idle: "Got a move in mind?",
  thinking: "Working on your request…",
  reply: "Reply ready",
  error: "Check the conversation",
};

export function WorkspaceAssistant({ requestChain, onSwitchNetwork, switchingNetwork, switchError }: {
  requestChain?: PaymentChain;
  onSwitchNetwork: (target: "mainnet" | "testnet") => void;
  switchingNetwork: boolean;
  switchError?: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const [mood, setMood] = useState<AssistantMood>("idle");
  const [unreadReply, setUnreadReply] = useState(false);
  const [revealReply, setRevealReply] = useState(false);
  const [guiding, setGuiding] = useState(false);
  const guideTimer = useRef<number | undefined>(undefined);
  const latestVisibility = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLButtonElement>(null);
  const toggled = useRef(false);
  const { planChain, quoteExpired } = useAssistantWorkspace() ?? {};
  const walletAddress = usePilotStore(state => state.walletAddress);
  const walletChainId = usePilotStore(state => state.walletChainId);
  const networkMode = usePilotStore(state => state.networkMode);
  const busy = usePilotStore(state => state.isThinking);
  const activeTx = usePilotStore(state => state.transactions.find(tx => tx.id === state.activeTxId));
  const recentTx = usePilotStore(state => state.transactions[0]);
  const tx = activeTx ?? recentTx;
  const planConflict = assistantNetworkConflict(planChain, Boolean(walletAddress), walletChainId, networkMode);
  const requestConflict = assistantNetworkConflict(requestChain, Boolean(walletAddress), walletChainId, networkMode);
  const networkConflict = planConflict ?? requestConflict;
  const requiredChain = planConflict ? planChain : requestChain;
  const status = activeTx ? transactionStatus(activeTx) : undefined;
  const pending = Boolean(tx && tx.executionMode !== "demo" && tx.status !== "success" && tx.status !== "error" && tx.status !== "retryable");
  const signal = networkConflict ? "network" : quoteExpired ? "expired" : pending ? "pending" : undefined;
  const receipt = activeTx?.status === "success" ? assistantReceipt(activeTx) : null;
  const receiptReady = Boolean(receipt && (activeTx?.type !== "bridge" || receipt.scope === "Destination receipt"));

  function showGuide(guide: AssistantGuide) {
    setGuiding(true);
    window.clearTimeout(guideTimer.current);
    guideTimer.current = window.setTimeout(() => setGuiding(false), 500);
    guideTo(guide);
  }

  useEffect(() => () => window.clearTimeout(guideTimer.current), []);

  function toggle(next: boolean) {
    toggled.current = true;
    latestVisibility.current = next;
    setRevealReply(next && unreadReply);
    if (next) setUnreadReply(false);
    setVisible(next);
  }

  const updateMood = useCallback((next: AssistantMood) => {
    setMood(next);
    if (next === "reply" && !latestVisibility.current) setUnreadReply(true);
  }, []);

  function trackPointer(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    const launcher = event.currentTarget;
    const face = launcher.firstElementChild?.getBoundingClientRect();
    if (!face) return;
    const clamp = (n: number) => Math.max(-4, Math.min(4, n));
    launcher.style.setProperty("--gaze-x", `${clamp((event.clientX - face.left - face.width / 2) / 8)}px`);
    launcher.style.setProperty("--gaze-y", `${clamp((event.clientY - face.top - face.height / 2) / 9)}px`);
  }

  function resetGaze(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.style.removeProperty("--gaze-x");
    event.currentTarget.style.removeProperty("--gaze-y");
  }

  const launcherMood = mood === "reply" && !unreadReply ? "idle" : mood;
  const launcherStatus = launcherMood !== "idle" ? launcherDescription[launcherMood] :
    networkConflict ? "Network mismatch" : quoteExpired ? "Swap quote expired" : status ?? launcherDescription.idle;
  const launcherTone = unreadReply ? "reply" : launcherMood === "idle" && (networkConflict || quoteExpired) ? "warning" : undefined;
  const launcherAction = unreadReply ? "Read reply" : launcherTone === "warning" ? "Open details" : `Ask ${identity.name}`;

  useEffect(() => {
    if (toggled.current) (visible ? closeRef.current : restoreRef.current)?.focus();
  }, [visible]);

  return (
    <aside className="operations-assistant-column" data-workspace-assistant aria-label="AI assistant">
      <section id="workspace-assistant" hidden={!visible} className="assistant-surface" aria-label={`${identity.name}, ${identity.descriptor}`}>
        <button ref={closeRef} type="button" className="assistant-close" onClick={() => toggle(false)} aria-label="Hide assistant" aria-controls="workspace-assistant" aria-expanded={visible}>
          <Minus aria-hidden="true" size={19} />
        </button>
        <ChatPanel
          avatar={visible ? <AssistantRobot mood={mood === "idle" && receiptReady ? "reply" : mood} docked guiding={guiding} receipt={receiptReady} signal={signal} /> : undefined}
          assistantName={identity.name}
          tools={visible ? (
            <div role="region" aria-label="Assistant tools and live status" className="max-h-48 space-y-2 overflow-y-auto overscroll-contain border-b border-border px-4 py-2.5 scrollbar-thin sm:px-6 lg:max-h-60">
              <AssistantToolbelt onGuide={showGuide} disabled={busy} />
              {networkConflict && (
                <AssistantNetworkNotice
                  {...networkConflict}
                  busy={switchingNetwork || busy}
                  error={switchError}
                  onSwitch={() => onSwitchNetwork(requiredChain === "Arc_Mainnet" ? "mainnet" : "testnet")}
                />
              )}
              {quoteExpired && <AssistantQuoteNotice />}
              {tx && <AssistantTransactionCard key={tx.id} tx={tx} onGuide={showGuide} disabled={busy} />}
            </div>
          ) : undefined}
          onAssistantMoodChange={updateMood}
          onReviewPlan={(plan: AssistantPlan) => window.dispatchEvent(new CustomEvent(ASSISTANT_PLAN_EVENT, { detail: plan }))}
          onGuide={showGuide}
          revealReply={revealReply}
          visible={visible}
        />
      </section>
      {!visible && (
        <button
          ref={restoreRef}
          data-assistant-restore
          type="button"
          className={styles.launcher}
          onClick={() => toggle(true)}
          onPointerMove={trackPointer}
          onPointerLeave={resetGaze}
          aria-label="Open assistant"
          aria-describedby="assistant-launcher-status"
          aria-expanded="false"
          aria-controls="workspace-assistant"
        >
          <AssistantRobot mood={launcherMood === "idle" && receiptReady ? "reply" : launcherMood} unread={unreadReply} resting={toggled.current} receipt={receiptReady} signal={unreadReply ? undefined : signal} />
          <span className={styles.bubble} data-tone={launcherTone}>
            <span id="assistant-launcher-status" className={styles.status} aria-live="polite">{launcherStatus}</span>
            <span className={styles.prompt} aria-hidden="true">
              {launcherAction}<ArrowRight aria-hidden="true" size={13} className={styles.arrow} />
            </span>
          </span>
        </button>
      )}
    </aside>
  );
}
