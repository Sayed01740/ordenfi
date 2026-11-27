"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowDownUp, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleAlert, CircleDashed, Clock3, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { ChainMark } from "@/components/brand/chain-mark";
import { TokenMark } from "@/components/brand/token-mark";
import { useWallet } from "@/providers/wallet-provider";
import { usePilotStore } from "@/store/pilot-store";
import { CHAINS } from "@/lib/chains";
import { getArcNetworkMeta } from "@/lib/arc-chain";
import { cn } from "@/lib/utils";
import { executeBridge } from "@/lib/client-actions";
import { getEvmBridgeChains, getCircleBridgeChains } from "@/lib/cctp-chains";
import {
  bridgeStateToSteps,
  loadBridgeState,
  saveBridgeState,
  type BridgeState,
} from "@/lib/bridge-state";
import { quoteBridgeFee } from "@/lib/fees";
import { formatBalance } from "@/components/dapp/shared";
import { validateUsdcAmount } from "@/lib/payment-tools";
import { isValidTxHash } from "@/lib/tx-verify";
import type { ChainId, TransactionRecord } from "@/types";

type BridgeErrorWithState = Error & {
  bridgeState?: BridgeState;
  bridgeResult?: TransactionRecord["bridgeResult"];
};

type BridgeToken = "USDC" | "EURC" | "cirBTC" | "wETH";
const BRIDGE_TOKENS: BridgeToken[] = ["USDC", "EURC", "cirBTC", "wETH"];
type BridgeReview = {
  from: ChainId;
  to: ChainId;
  amount: string;
  token: BridgeToken;
  speed: "FAST" | "SLOW";
  settlement: "fast-direct" | "auto-relayer";
  wallet: string;
  mainnet: boolean;
  settlementLabel: string;
  feeLabel?: string;
};

const bridgeSelect = "h-12 w-full min-w-0 appearance-none truncate rounded-lg border border-field-border bg-background py-2 pl-10 pr-8 text-sm font-medium text-foreground hover:border-muted-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function NetworkSelect({ label, name, value, opposite, chains, onChange, disabled }: {
  label: string;
  name: string;
  value: ChainId;
  opposite: ChainId;
  chains: ChainId[];
  onChange: (chain: ChainId) => void;
  disabled: boolean;
}) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <span className="relative block">
        <ChainMark chain={value} compact size={19} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2" />
        <select aria-label={name} className={bridgeSelect} value={value} disabled={disabled} onChange={event => onChange(event.target.value as ChainId)}>
          {chains.map(chain => <option key={chain} value={chain} disabled={chain === opposite}>{CHAINS[chain].label}</option>)}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </span>
    </label>
  );
}

export function BridgePanelBody() {
  const { addTransaction, setActiveTx, setThinking, isThinking, walletAddress, walletType, walletChainId, networkMode, liveBalanceUsdc } =
    usePilotStore();
  const { openConnectModal } = useWallet();
  const effectiveChainId =
    walletChainId === 5042 || walletChainId === 5042002
      ? walletChainId
      : networkMode === "mainnet"
        ? 5042
        : 5042002;
  const meta = getArcNetworkMeta(effectiveChainId);
  const isMainnet = meta.isMainnet;

  const CCTP_BRIDGE_CHAINS: ChainId[] = useMemo(() => {
    return walletType === "circle"
      ? getCircleBridgeChains(isMainnet)
      : getEvmBridgeChains(isMainnet);
  }, [walletType, isMainnet]);

  const defaultFrom: ChainId = isMainnet ? "Arc_Mainnet" : "Arc_Testnet";
  const defaultTo: ChainId = isMainnet ? "Base" : "Base_Sepolia";

  const [amount, setAmount] = useState("");
  const [bridgeToken, setBridgeToken] = useState<BridgeToken>("USDC");
  const [transferSpeed, setTransferSpeed] = useState<"FAST" | "SLOW">("FAST");
  const [from, setFrom] = useState<ChainId>(defaultFrom);
  const [to, setTo] = useState<ChainId>(defaultTo);
  const [bridgeMode, setBridgeMode] = useState<"fast-direct" | "auto-relayer">("fast-direct");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<BridgeReview | null>(null);
  const reviewId = useId();
  const settlementId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const submitting = useRef(false);
  const [liveBridgeState, setLiveBridgeState] = useState<BridgeState | null>(null);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const activeTxId = usePilotStore((s) => s.activeTxId);
  const activeTx = usePilotStore((s) => s.transactions.find((t) => t.type === "bridge" && t.id === (lastTxId || s.activeTxId)));
  const currentBridgeState = activeTx?.bridgeState ?? liveBridgeState;
  const supportsSettlementChoice = bridgeToken === "USDC" && (
    from === "Arc_Mainnet" || from === "Arc_Testnet" || to === "Arc_Mainnet" || to === "Arc_Testnet"
  );
  const settlementLabel = supportsSettlementChoice && bridgeMode === "fast-direct" ? "Manual mint" : "Automatic mint";
  const fee = supportsSettlementChoice && Number(amount) > 0 && Number.isFinite(Number(amount)) ? quoteBridgeFee(amount, bridgeMode) : null;

  // Sync chains if active network flips between testnet and mainnet
  useEffect(() => {
    if (!CCTP_BRIDGE_CHAINS.includes(from)) {
      setFrom(CCTP_BRIDGE_CHAINS[0] ?? defaultFrom);
    }
    if (!CCTP_BRIDGE_CHAINS.includes(to)) {
      const fallbackTo = CCTP_BRIDGE_CHAINS[1] ?? defaultTo;
      setTo(fallbackTo);
    }
  }, [CCTP_BRIDGE_CHAINS, from, to, defaultFrom, defaultTo]);

  // Restore progress of the last bridge from persisted state (Phase 10).
  useEffect(() => {
    const active = activeTxId;
    if (!active) return;
    const st = loadBridgeState(active);
    if (st && st.fromChain === from && st.toChain === to) {
      setLiveBridgeState(st);
      setLastTxId(active);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTxId]);

  function flipDirection() {
    setFrom(to);
    setTo(from);
    setError(null);
  }

  function openReview() {
    if (!walletAddress) {
      openConnectModal();
      return;
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (bridgeToken === "USDC") {
      try {
        validateUsdcAmount(amount);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Enter a valid USDC amount.");
        return;
      }
    }
    if (from === to || !CCTP_BRIDGE_CHAINS.includes(from) || !CCTP_BRIDGE_CHAINS.includes(to)) {
      setError("Choose two different supported networks.");
      return;
    }
    setError(null);
    setReview({
      from, to, amount, token: bridgeToken, speed: transferSpeed, settlement: bridgeMode,
      wallet: walletAddress, mainnet: isMainnet, settlementLabel, feeLabel: fee?.headline,
    });
  }

  async function run() {
    if (!review || submitting.current || usePilotStore.getState().isThinking) return;
    const { from, to, amount, token, speed, settlement, wallet } = review;
    if (wallet.toLowerCase() !== usePilotStore.getState().walletAddress?.toLowerCase() ||
      review.mainnet !== isMainnet || !CCTP_BRIDGE_CHAINS.includes(from) || !CCTP_BRIDGE_CHAINS.includes(to)) {
      setReview(null);
      setError("Your wallet or network changed. Review the bridge again.");
      return;
    }
    submitting.current = true;
    setError(null);
    setBusy(true);
    setThinking(true);
    setReview(null);

    const txId = `tx_${Date.now()}`;
    const initialSteps = [
      { name: "Approval", state: "pending" as const },
      { name: "Burn", state: "pending" as const },
      { name: "Attestation", state: "pending" as const },
      { name: "Destination Mint", state: "pending" as const },
    ];

    const bState: BridgeState = {
      txId,
      walletType: walletType === "circle" ? "circle" : "evm",
      walletAddress: wallet,
      fromChain: from,
      toChain: to,
      token,
      amount,
      state: "INIT",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveBridgeState(bState);
    setLiveBridgeState(bState);
    setLastTxId(txId);

    const placeholderTx = {
      id: txId,
      type: "bridge" as const,
      status: "pending" as const,
      amount,
      token,
      fromChain: from,
      toChain: to,
      steps: initialSteps,
      createdAt: new Date().toISOString(),
      message: `Bridging ${amount} ${token} from ${CHAINS[from].label} to ${CHAINS[to].label}`,
      executionMode: "live" as const,
      bridgeState: bState,
    };

    addTransaction(placeholderTx);
    setActiveTx(txId);

    try {
      const transaction = await executeBridge({
        amount,
        fromChain: from,
        toChain: to,
        token,
        preferLive: true,
        bridgeMode: settlement,
        transferSpeed: speed,
        txId,
      });

      const finalState = transaction.bridgeState ?? loadBridgeState(txId);
      if (finalState) setLiveBridgeState(finalState);
      usePilotStore.getState().updateTransaction(txId, {
        status: transaction.status,
        feeUsd: transaction.feeUsd,
        retryable: transaction.retryable,
        txHash: transaction.txHash,
        explorerUrl: transaction.explorerUrl,
        steps: transaction.steps,
        message: transaction.message,
        bridgeResult: transaction.bridgeResult,
        bridgeState: finalState ?? undefined,
      });
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      setError(err);
      const bridgeErr = e as BridgeErrorWithState | null;
      const partialState = bridgeErr?.bridgeState;
      if (partialState) setLiveBridgeState(partialState);
      usePilotStore.getState().updateTransaction(txId, {
        status: "error",
        message: err,
        retryable: true,
        bridgeResult: bridgeErr?.bridgeResult,
        bridgeState: (partialState ?? (loadBridgeState(txId) as BridgeState | null)) ?? undefined,
        steps: loadBridgeState(txId)
          ? bridgeStateToSteps(loadBridgeState(txId))
          : initialSteps.map((s) =>
              s.state === "pending" ? { ...s, state: "error" as const, message: err } : s,
            ),
      });
    } finally {
      submitting.current = false;
      setBusy(false);
      setThinking(false);
    }
  }

  return (
    <>
      <form aria-label="Bridge funds" className="min-w-0 space-y-5" noValidate onSubmit={event => { event.preventDefault(); openReview(); }}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">Network route</h4>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={flipDirection} aria-label="Reverse bridge direction">
              <ArrowDownUp className="size-3.5" aria-hidden="true" /> Reverse
            </Button>
          </div>
          <div className="grid gap-3 rounded-xl border border-border bg-inset p-3 @container">
            <div className="grid gap-3 @min-[23rem]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @min-[23rem]:items-end">
              <NetworkSelect label="From" name="Source network" value={from} opposite={to} chains={CCTP_BRIDGE_CHAINS} disabled={busy}
                onChange={chain => { setFrom(chain); setError(null); }} />
              <ArrowRight className="mb-4 hidden size-4 text-muted-foreground @min-[23rem]:block" aria-hidden="true" />
              <NetworkSelect label="To" name="Destination network" value={to} opposite={from} chains={CCTP_BRIDGE_CHAINS} disabled={busy}
                onChange={chain => { setTo(chain); setError(null); }} />
            </div>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 rounded-xl border border-border bg-inset p-3">
          <label className="block min-w-0 space-y-1">
            <span className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
              <span>Amount</span>
              {walletAddress && bridgeToken === "USDC" && (from === "Arc_Mainnet" || from === "Arc_Testnet") && (
                <span className="inline-flex items-center gap-1.5 font-normal tabular-nums">
                  <span>{liveBalanceUsdc !== null ? `Avail: ${formatBalance(liveBalanceUsdc)}` : "Loading…"}</span>
                  {liveBalanceUsdc !== null && Number(liveBalanceUsdc) > 0 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(e) => {
                        e.preventDefault();
                        const maxBridge = Math.max(0, Number(liveBalanceUsdc) - 0.01)
                          .toFixed(6)
                          .replace(/\.?0+$/, "");
                        setAmount(maxBridge);
                        setError(null);
                      }}
                      className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-accent hover:bg-accent/15 transition-colors disabled:opacity-50"
                    >
                      Max
                    </button>
                  )}
                </span>
              )}
            </span>
            <Input aria-label="Bridge amount" type="number" inputMode="decimal" min="0" step="any" placeholder="0.00"
              className="h-12 rounded-none border-0 bg-transparent px-0 text-[1.75rem] font-medium tabular-nums sm:text-[2rem]"
              value={amount} disabled={busy} onChange={event => { setAmount(event.target.value); setError(null); }} />
          </label>
          <div className="relative w-29 shrink-0 sm:w-32">
            <TokenMark token={bridgeToken} size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2" />
            <select aria-label="Bridge token" className={bridgeSelect} value={bridgeToken} disabled={busy}
              onChange={event => { setBridgeToken(event.target.value as BridgeToken); setError(null); }}>
              {BRIDGE_TOKENS.map(token => <option key={token} value={token}>{token}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {supportsSettlementChoice && (
          <fieldset disabled={busy} className="min-w-0">
            <legend className="mb-2 text-sm font-semibold">Settlement</legend>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "fast-direct", title: "Manual mint", description: "Approve on the destination." },
                { value: "auto-relayer", title: "Automatic mint", description: "Circle handles the destination." },
              ] as const).map(option => (
                <label key={option.value} className="relative min-w-0 cursor-pointer">
                  <input type="radio" name={settlementId} value={option.value} checked={bridgeMode === option.value}
                    onChange={() => { setBridgeMode(option.value); setError(null); }} className="peer sr-only" />
                  <span className="block h-full rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted peer-checked:border-accent/60 peer-checked:bg-accent/5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:opacity-50">
                    <span className="flex items-center gap-1.5 font-medium">
                      {option.title}
                      {bridgeMode === option.value && <Check className="size-3.5 text-accent" aria-hidden="true" />}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-muted-foreground">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {bridgeToken !== "USDC" && (
          <label className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium">Transfer speed</span>
            <select className="min-h-11 rounded-lg border border-field-border bg-inset px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              value={transferSpeed} disabled={busy} onChange={event => { setTransferSpeed(event.target.value as "FAST" | "SLOW"); setError(null); }}>
              <option value="FAST">Fast</option>
              <option value="SLOW">Standard</option>
            </select>
          </label>
        )}

        <dl className="space-y-2 border-t border-border pt-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Protocol</dt><dd className="text-right">Circle {bridgeToken === "USDC" ? "CCTP" : "CCTPx"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{supportsSettlementChoice ? "Indicative fees" : "Fees"}</dt>
            <dd className="text-right font-medium tabular-nums">{fee?.headline ?? (supportsSettlementChoice ? "Enter an amount" : "Depend on the route")}</dd>
          </div>
        </dl>
        {error && <p role="alert" className="wrap-anywhere rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full font-semibold" disabled={busy || isThinking}>
          {busy ? "Bridge in progress…" : walletAddress ? "Review bridge" : "Connect wallet"}
          {walletAddress ? <ArrowRight className="size-4" aria-hidden="true" /> : <Wallet className="size-4" aria-hidden="true" />}
        </Button>
        <p className="text-center text-xs text-muted-foreground">Review your route before approving in your wallet.</p>
      </form>

      {lastTxId && currentBridgeState && (
        <BridgeProgressStepper state={currentBridgeState} transaction={activeTx} busy={busy} />
      )}

      <ModalDialog open={Boolean(review)} onDismiss={() => setReview(null)} labelledBy={reviewId} initialFocusRef={heading}>
        {review && (
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-5">
            <div>
              <h2 id={reviewId} ref={heading} tabIndex={-1} className="text-lg font-semibold">Review bridge</h2>
              <p className="mt-1 break-all text-3xl font-medium tabular-nums">{review.amount} {review.token}</p>
            </div>
            <dl className="divide-y divide-border rounded-xl border border-border bg-inset px-3 text-sm">
              {([["From", review.from], ["To", review.to]] as const).map(([label, chain]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="flex min-w-0 items-center gap-2 text-right"><ChainMark chain={chain} compact size={18} />{CHAINS[chain].label}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-muted-foreground">{review.token === "USDC" ? "Settlement" : "Transfer speed"}</dt>
                <dd className="text-right">{review.token === "USDC" ? review.settlementLabel : review.speed === "FAST" ? "Fast" : "Standard"}</dd>
              </div>
              {review.feeLabel && <div className="flex justify-between gap-3 py-2.5"><dt className="text-muted-foreground">Indicative fees</dt><dd className="tabular-nums">{review.feeLabel}</dd></div>}
            </dl>
            <p className="text-sm text-muted-foreground">Check the final transaction and network fees in your wallet.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setReview(null)}>Edit bridge</Button>
              <Button type="button" disabled={isThinking} onClick={() => void run()}>Continue in wallet</Button>
            </div>
          </div>
        )}
      </ModalDialog>
    </>
  );
}

function BridgeProgressStepper({ state, transaction, busy }: { state: BridgeState; transaction?: TransactionRecord; busy: boolean }) {
  const steps = transaction?.steps?.length ? transaction.steps : bridgeStateToSteps(state);
  const status = transaction?.status === "success" || state.state === "COMPLETED" ? "Completed"
    : transaction?.status === "error" || state.state === "FAILED" ? "Failed"
    : transaction?.status === "retryable" || state.state === "RECOVERABLE" ? "Needs review"
    : busy ? "In progress" : "Awaiting confirmation";

  return (
    <section aria-label="Bridge progress" className="mt-5 space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Bridge progress</h4>
        <span role="status" className={cn("text-xs font-medium", status === "Completed" ? "text-success" : status === "Failed" ? "text-danger" : "text-muted-foreground")}>{status}</span>
      </div>
      <ol className="divide-y divide-border rounded-xl border border-border bg-inset px-3">
        {steps.map((step, index) => {
          const chain = /mint|destination|receive/i.test(step.name) ? state.toChain : state.fromChain;
          const Icon = step.state === "success" ? Check : step.state === "error" ? CircleAlert : step.state === "active" ? Clock3 : CircleDashed;
          const label = step.state === "success" ? "Confirmed" : step.state === "error" ? "Failed"
            : step.state === "active" ? "In progress" : step.state === "noop" ? "Skipped" : "Pending";
          return (
            <li key={`${step.name}-${index}`} className="flex min-w-0 items-center justify-between gap-2 py-2.5 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <Icon className={cn("size-4 shrink-0", step.state === "success" ? "text-success" : step.state === "error" ? "text-danger" : "text-muted-foreground")} aria-hidden="true" />
                <span className="wrap-anywhere">{step.name}<span className="sr-only">, {label}</span></span>
              </span>
              {step.txHash && isValidTxHash(step.txHash) && CHAINS[chain]?.explorer ? (
                <a href={`${CHAINS[chain].explorer}/tx/${step.txHash}`} target="_blank" rel="noreferrer"
                  aria-label={`View ${step.name} transaction in explorer`} className="flex min-h-8 shrink-0 items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent">
                  Explorer <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
              ) : <span aria-hidden="true" className="shrink-0 text-xs text-muted-foreground">{label}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
