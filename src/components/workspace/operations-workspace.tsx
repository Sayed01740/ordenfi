"use client";

import { useEffect, useRef, useState } from "react";
import { WorkspaceAssistant } from "@/components/workspace/workspace-assistant";
import { AssistantWorkspaceProvider } from "@/components/workspace/assistant-workspace-context";
import { assistantNetworkConflict } from "@/lib/assistant-tools";
import { ToolsWorkspace } from "@/components/panels/tools-workspace";
import { TransactionProgress } from "@/components/tx/transaction-progress";
import { LiveOperationPanel } from "@/components/tx/live-operation-panel";
import { UserGuideCard } from "@/components/onboarding/user-guide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePilotStore } from "@/store/pilot-store";
import { cn, shortenAddress } from "@/lib/utils";
import { ArrowRight, Globe, History, ExternalLink } from "lucide-react";
import { executeBridgeRecovery, executeSend } from "@/lib/client-actions";
import { parsePaymentRequest, type PaymentRequest } from "@/lib/payment-tools";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getArcNetworkMeta } from "@/lib/arc-chain";
import { CHAINS } from "@/lib/chains";
import { isValidTxHash } from "@/lib/tx-verify";
import { getInjectedProvider, switchToArcNetwork } from "@/sdk/wallet-adapter";
import type { ChainId, TransactionRecord, TxStep } from "@/types";

function getActivityError(tx: TransactionRecord): { step?: string; message?: string } {
  const failedStep = tx.steps?.find((step) => step.state === "error");
  if (failedStep?.message) return { step: failedStep.name, message: failedStep.message };
  if (tx.message) {
    const parts = tx.message.split(" · ").filter(Boolean);
    const meaningful = parts.find((part) => /error|failed|insufficient|revert|reject|cancel|cannot|could not|not confirmed|retry/i.test(part));
    return { message: meaningful || parts[parts.length - 1] };
  }
  return {};
}
function getActivityDetail(tx: TransactionRecord): string | null {
  const error = getActivityError(tx);
  if (error.step && error.message) return `${error.step}: ${error.message}`;
  if (error.message) return error.message;
  if (tx.status === "error") return "Bridge failed. Select this operation to view the full error and retry.";
  if (tx.retryable) return "Bridge is not confirmed yet. Select this operation to check again.";
  return null;
}

function getBridgeStepChain(tx: TransactionRecord, step: TxStep): ChainId | undefined {
  const name = step.name.toLowerCase();
  if (name.includes("mint") || name.includes("receive") || name.includes("destination")) return tx.toChain;
  return tx.fromChain;
}

function getStepExplorerUrl(tx: TransactionRecord, step: TxStep): string | null {
  if (!step.txHash) return null;
  const chain = tx.type === "bridge" ? getBridgeStepChain(tx, step) : tx.fromChain || tx.toChain;
  const explorer = chain ? CHAINS[chain]?.explorer : undefined;
  return explorer ? `${explorer}/tx/${step.txHash}` : null;
}

function bridgeTxSteps(tx: TransactionRecord): TxStep[] {
  return (tx.steps || []).filter((step) => Boolean(step.txHash));
}

function getTxExplorerHref(tx: TransactionRecord): string | null {
  if (tx.explorerUrl && /^https?:\/\//i.test(tx.explorerUrl)) return tx.explorerUrl;
  if (!tx.txHash || !isValidTxHash(tx.txHash)) return null;
  const chain = tx.toChain || tx.fromChain;
  const explorer = chain ? CHAINS[chain]?.explorer : undefined;
  return explorer ? `${explorer}/tx/${tx.txHash}` : null;
}

export function OperationsWorkspace() {
  const {
    transactions,
    activeTxId,
    setActiveTx,
    addTransaction,
    setThinking,
    walletAddress,
    walletChainId,
    networkMode,
    setNetworkMode,
    setWallet,
    refreshBalances,
    loadServerTransactions,
    addMessage,
  } = usePilotStore();
  const effectiveChainId =
    walletChainId === 5042 || walletChainId === 5042002
      ? walletChainId
      : networkMode === "mainnet"
        ? 5042
        : 5042002;
  const detectedMeta = getArcNetworkMeta(effectiveChainId);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const active = transactions.find((t) => t.id === activeTxId) || transactions[0];
  const [guideOpen, setGuideOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<"guide" | "tools" | null>(null);
  const [payRequest, setPayRequest] = useState<PaymentRequest | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [payConfirm, setPayConfirm] = useState(false);
  const payAttempt = useRef(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => { if (walletAddress) { refreshBalances(); void loadServerTransactions(walletAddress); } }, [walletAddress, refreshBalances, loadServerTransactions]);

  useEffect(() => {
    try {
      const request = parsePaymentRequest(window.location.search);
      if (!request) return;
      setPayRequest(request);
      addMessage({ id: `msg_pay_${Date.now()}`, role: "assistant", content: `**Payment request**\n\n• Amount: **${request.amount} USDC**\n• To: \`${request.to}\`\n• Network: ${request.chain === "Arc_Mainnet" ? "Arc Mainnet" : "Arc Testnet"}\n• Memo: ${request.memo}\n\nConnect your wallet and review the request before signing.`, createdAt: new Date().toISOString() });
    } catch (error) { setPayError(error instanceof Error ? error.message : "Invalid payment request."); }
  }, [addMessage]);

  useEffect(() => {
    function revealTarget(hash: string) {
      if (hash !== "#guide" && hash !== "#tools") return;
      if (hash === "#guide") setGuideOpen(true);
      setPendingTarget(hash === "#guide" ? "guide" : "tools");
    }
    function onHashChange() { revealTarget(window.location.hash); }
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search) revealTarget(url.hash);
    }
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    // Capture also handles repeated hashes before Next Link intercepts navigation.
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    if (!pendingTarget || (pendingTarget === "guide" && !guideOpen)) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(pendingTarget);
      if (!target?.getClientRects().length) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      setPendingTarget(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingTarget, guideOpen]);

  async function retryActive() {
    if (active?.type !== "bridge" || !active.fromChain || !active.toChain) return;
    setThinking(true);
    try {
      const tx = await executeBridgeRecovery({ amount: active.amount || "0", fromChain: active.fromChain, toChain: active.toChain, token: active.token || "USDC", recipient: active.recipient, failedTx: active, txId: active.id });
      addTransaction(tx); setActiveTx(tx.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Bridge recovery failed.";
      addMessage({ id: `msg_bridge_retry_${Date.now()}`, role: "assistant", content: `**Bridge retry failed:** ${message}`, createdAt: new Date().toISOString() });
    } finally { setThinking(false); }
  }

  async function switchNetworkMode(target: "mainnet" | "testnet") {
    if (switchingNetwork) return;
    setSwitchingNetwork(true);
    setSwitchError(null);
    try {
      if (walletAddress) {
        const provider = await getInjectedProvider();
        const chainId = await switchToArcNetwork(provider, target === "mainnet" ? 5042 : 5042002);
        const currentAddress = usePilotStore.getState().walletAddress;
        if (currentAddress) setWallet(currentAddress, chainId);
      }
      setNetworkMode(target);
    } catch (error) {
      setSwitchError(error instanceof Error ? error.message : "Could not switch networks.");
    } finally {
      setSwitchingNetwork(false);
    }
  }

  async function fulfillPayRequest() {
    if (!payRequest || !walletAddress || payAttempt.current) return;
    const to = payRequest.to;
    const wallet = usePilotStore.getState();
    const conflict = assistantNetworkConflict(payRequest.chain, Boolean(wallet.walletAddress), wallet.walletChainId, wallet.networkMode);
    if (conflict) { setPayConfirm(false); setPayError(`Switch to ${conflict.expected} before paying this request.`); return; }
    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) return;
    payAttempt.current = true;
    setPayConfirm(false);
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("pay");
    window.history.replaceState(window.history.state, "", cleanUrl);
    setPayBusy(true);
    setPayError(null);
    setThinking(true);
    try {
      const tx = await executeSend({ amount: payRequest.amount, token: "USDC", chain: payRequest.chain, recipient: to, recipientLabel: payRequest.memo || "Payment request", preferLive: true, fromAddress: walletAddress });
      addTransaction(tx);
      setActiveTx(tx.id);
      if (tx.status === "success") setPayRequest(null);
      else { setPayRequest(null); setPayError(tx.message || "Payment not confirmed. Check activity before sending again."); }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment failed. Please try again.";
      setPayError(message);
      addMessage({ id: `msg_payerr_${Date.now()}`, role: "assistant", content: `**Payment failed:** ${message}`, createdAt: new Date().toISOString() });
    } finally {
      payAttempt.current = false;
      setPayBusy(false);
      setThinking(false);
    }
  }

  const paymentConflict = assistantNetworkConflict(payRequest?.chain, Boolean(walletAddress), walletChainId, networkMode);

  return (
    <div className="operations-workspace">
      <header className="operations-heading">
        <div>
          <h1>Your money. In order.</h1>
          <p>Swap, send, bridge, and track every move in one place.</p>
        </div>
        <div role="group" aria-label="Network mode" className="operations-network">
          <Globe aria-hidden="true" size={16} />
          {(["mainnet", "testnet"] as const).map(mode => <button key={mode} type="button" aria-pressed={mode === "mainnet" ? detectedMeta.isMainnet : detectedMeta.isTestnet} disabled={switchingNetwork} onClick={() => void switchNetworkMode(mode)}>{mode === "mainnet" ? "Mainnet" : "Testnet"}</button>)}
        </div>
      </header>

      {payRequest && <div className="operations-payment-request">
        <span>Payment Request: <strong>{payRequest.amount} USDC</strong> · {payRequest.chain === "Arc_Mainnet" ? "Arc Mainnet" : "Arc Testnet"}{payRequest.to && <span className="ml-2 text-xs">to <code className="font-mono">{shortenAddress(payRequest.to, 4)}</code></span>}</span>
        <Button size="sm" disabled={!walletAddress || payBusy || Boolean(paymentConflict)} onClick={() => setPayConfirm(true)}>{payBusy ? "Signing…" : "Pay request"}</Button>
        {paymentConflict && <p role="status" className="basis-full text-xs text-warning">Switch to {paymentConflict.expected} to pay this request.</p>}
      </div>}
      {payError && <p role="alert" className="mb-4 text-sm text-danger">{payError}</p>}
      <ConfirmDialog open={payConfirm && Boolean(payRequest)} title="Review payment request" summary={payRequest ? `Send ${payRequest.amount} USDC to ${payRequest.to} on ${payRequest.chain === "Arc_Mainnet" ? "Arc Mainnet" : "Arc Testnet"}. Memo: ${payRequest.memo}` : ""} busy={payBusy} mode="live" onCancel={() => setPayConfirm(false)} onConfirm={() => void fulfillPayRequest()} />

      <AssistantWorkspaceProvider><div className="operations-grid">
        <div className="operations-action-column" data-workspace-actions>
          <ToolsWorkspace defaultTab="swap" />
          <LiveOperationPanel />
          {active && <TransactionProgress tx={active} onRetry={active.type === "bridge" && (active.status === "error" || active.retryable) ? () => void retryActive() : undefined} />}
          <UserGuideCard open={guideOpen} onOpenChange={setGuideOpen} />
        </div>
        <WorkspaceAssistant requestChain={payRequest?.chain} onSwitchNetwork={target => void switchNetworkMode(target)} switchingNetwork={switchingNetwork} switchError={switchError} />
      </div></AssistantWorkspaceProvider>

      <section className="operations-activity" aria-label="Recent activity">
          <Card className="w-full overflow-hidden border-white/[0.08] bg-card/95 ">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
                    <History aria-hidden="true" className="h-3.5 w-3.5" />
                  </span>
                  <CardTitle className="truncate font-display text-sm font-medium tracking-tight text-foreground">
                    Activity timeline
                  </CardTitle>
                </div>
                <a href="#tools" className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-accent hover:bg-muted transition-colors">
                  Operate <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {transactions.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  No recent transactions.
                </p>
              )}
              {transactions.slice(0, 8).map((tx) => {
                const isActive = active?.id === tx.id;
                const detail = getActivityDetail(tx);
                const isBridgeError = tx.type === "bridge" && (tx.status === "error" || tx.retryable);
                const childSteps = tx.type === "bridge" ? bridgeTxSteps(tx) : [];
                const txExplorerHref = getTxExplorerHref(tx);
                return (
                  <div
                    key={tx.id}
                    className={cn(
                      "rounded-xl border p-3 transition-colors",
                      isActive
                        ? "border-accent/40 bg-accent/5 shadow-sm"
                        : "border-border bg-muted/60 hover:bg-muted"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveTx(tx.id)}
                      className="flex min-w-0 w-full min-h-10 items-center justify-between gap-2 text-left text-sm"
                    >
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="truncate capitalize font-semibold text-foreground">
                          {tx.type.replace("_", " ")} · {tx.amount} {tx.token}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {tx.status}
                          {tx.recipient ? ` · ${shortenAddress(tx.recipient)}` : tx.toChain ? ` · ${tx.toChain.replace(/_/g, " ")}` : ""}
                        </div>
                        {isBridgeError && detail && (
                          <div className="mt-1 truncate text-xs leading-4 text-red-400" title={detail}>
                            {detail}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={tx.status === "success" ? "success" : tx.status === "error" ? "danger" : "cyan"}
                        className="shrink-0 text-xs font-mono"
                      >
                        {tx.status}
                      </Badge>
                    </button>
                    {txExplorerHref && childSteps.length === 0 && (
                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                        <span className="truncate font-mono text-[11px] text-muted-foreground">
                          {tx.txHash ? `Tx: ${shortenAddress(tx.txHash, 4)}` : "On-chain receipt"}
                        </span>
                        <a
                          href={txExplorerHref}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent/10 hover:underline transition-colors"
                          title={tx.txHash || txExplorerHref}
                        >
                          View on explorer
                          <ExternalLink aria-hidden="true" className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {childSteps.length > 0 && (
                      <div className="mt-2.5 border-t border-border/80 pt-2 space-y-1.5">
                        {childSteps.map((step, index) => {
                          const href = getStepExplorerUrl(tx, step);
                          return (
                            <div
                              key={`${step.name}-${step.txHash}-${index}`}
                              className="flex min-w-0 items-center gap-2 rounded-lg bg-card/80 border border-border/50 px-2.5 py-1.5"
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 shrink-0 rounded-full",
                                  step.state === "success" ? "bg-emerald-400" : step.state === "error" ? "bg-red-400" : "bg-amber-400"
                                )}
                              />
                              <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
                                {step.name}
                              </span>
                              {href ? (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex shrink-0 items-center gap-1 font-mono text-xs text-accent hover:underline"
                                  title={step.txHash}
                                >
                                  {shortenAddress(step.txHash || "", 3)}
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              ) : step.txHash ? (
                                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                  {shortenAddress(step.txHash, 3)}
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
      </section>
    </div>
  );
}
