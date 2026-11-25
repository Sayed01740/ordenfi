"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Download, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FeeLineItems } from "@/components/ui/fee-line-items";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { BatchFileImport, downloadBatchCsv } from "@/components/pay/batch-file-import";
import { BATCH_RECIPIENT_LIMIT, buildBatchReportCsv, buildUnsentCsv, isBlankBatchRow, reviewBatchRows, type BatchOutcome } from "@/lib/batch-import";
import { explorerTxUrl } from "@/lib/arc-chain";
import { quotePayrollBatchFee } from "@/lib/fees";
import { executeSend } from "@/lib/client-actions";
import { runBatchDisperse } from "@/lib/dapp/disperse";
import { getToken, isDisperseConfigured } from "@/lib/dapp/tokens";
import { paymentChain, runPaymentBatch, type PaymentChain } from "@/lib/payment-tools";
import { isValidTxHash } from "@/lib/tx-verify";
import { useWallet } from "@/providers/wallet-provider";
import { getChainId, getInjectedProvider } from "@/sdk/wallet-adapter";
import { usePilotStore } from "@/store/pilot-store";
import type { PayrollRecipient } from "@/types";

const EMPTY_ROW: PayrollRecipient = { label: "", address: "", amountUsdc: "" };
const NETWORK_NAME = { Arc_Mainnet: "Arc Mainnet", Arc_Testnet: "Arc Testnet" };
const CHAIN_ID = { Arc_Mainnet: 5042, Arc_Testnet: 5042002 } as const;
const STATUS_LABEL = {
  queued: "Unsent",
  awaiting_wallet: "Awaiting confirmation",
  confirmed: "Confirmed",
  failed: "Failed",
  needs_review: "Needs review",
} satisfies Record<BatchOutcome["status"], string>;

type BatchPlan = {
  rows: PayrollRecipient[];
  wallet: string;
  chain: PaymentChain;
  total: string;
  label: string;
};

function walletMatches(plan: BatchPlan) {
  const { walletAddress, walletChainId } = usePilotStore.getState();
  return walletAddress?.toLowerCase() === plan.wallet.toLowerCase() && walletChainId === CHAIN_ID[plan.chain];
}

export function BatchPayrollCard() {
  const walletAddress = usePilotStore(state => state.walletAddress);
  const walletChainId = usePilotStore(state => state.walletChainId);
  const networkMode = usePilotStore(state => state.networkMode);
  const isThinking = usePilotStore(state => state.isThinking);
  const { openConnectModal, switchToArc } = useWallet();
  const [rows, setRows] = useState<PayrollRecipient[]>([EMPTY_ROW]);
  const [label, setLabel] = useState("");
  const [plan, setPlan] = useState<BatchPlan | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [outcomes, setOutcomes] = useState<BatchOutcome[]>([]);
  const [busy, setBusy] = useState(false);
  const [busySwitching, setBusySwitching] = useState(false);
  const [stopPending, setStopPending] = useState(false);
  const [notice, setNotice] = useState("");
  const started = useRef(false);
  const stopRequested = useRef(false);
  const reportHeading = useRef<HTMLHeadingElement>(null);
  const labelInput = useRef<HTMLInputElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const reviewId = useId();
  const fieldId = useId();
  const chain = paymentChain(walletChainId, networkMode);
  const networkReady = walletChainId === CHAIN_ID[chain];
  const draft = useMemo(() => reviewBatchRows(rows), [rows]);
  const issuesByRow = useMemo(() => {
    const issues = new Map<number, Partial<Record<keyof PayrollRecipient, string>>>();
    for (const { index, field, message } of draft.issues) {
      issues.set(index, { ...issues.get(index), [field]: message });
    }
    return issues;
  }, [draft.issues]);
  const confirmed = outcomes.filter(result => result.status === "confirmed").length;
  const unsent = outcomes.filter(result => result.status === "queued").length;
  const hasUnresolved = outcomes.some(result => result.status === "needs_review");

  function updateRow(index: number, field: keyof PayrollRecipient, value: string) {
    setRows(current => current.map((row, i) => i === index ? { ...row, [field]: value } : row));
    setNotice("");
  }

  function reviewBatch() {
    if (!walletAddress) {
      openConnectModal();
      return;
    }
    if (!draft.rows.length || draft.issues.length || !networkReady || isThinking) return;
    setNotice("");
    setPlan({ rows: draft.rows, wallet: walletAddress, chain, total: draft.total, label: label.trim() || "Batch payment" });
    setReviewOpen(true);
  }

  function setOutcome(index: number, outcome: BatchOutcome) {
    setOutcomes(current => current.map((result, i) => i === index ? outcome : result));
  }

  async function runBatch() {
    if (!plan || !reviewOpen || started.current) return;
    const reviewed = plan;
    const store = usePilotStore.getState();
    if (store.isThinking || !walletMatches(plan)) {
      setReviewOpen(false);
      setPlan(null);
      setNotice(store.isThinking ? "Wait for the current action to finish, then review the batch again." : "Your wallet or network changed. Review the batch again.");
      return;
    }

    started.current = true;
    stopRequested.current = false;
    setStopPending(false);
    setBusy(true);
    setReviewOpen(false);
    setOutcomes(plan.rows.map(() => ({ status: "queued" })));
    store.setThinking(true);
    requestAnimationFrame(() => reportHeading.current?.focus());

    const checkBeforePayment = () => {
      if (stopRequested.current) throw new Error("Batch stopped. The remaining payments are unsent.");
      if (!walletMatches(reviewed)) throw new Error("Your wallet or network changed. The remaining payments are unsent.");
    };

    try {
      const isMainnet = plan.chain === "Arc_Mainnet";
      let usedSingleSig = false;

      if (plan.rows.length > 1 && isDisperseConfigured(isMainnet)) {
        try {
          checkBeforePayment();
          const provider = await getInjectedProvider();
          const [accounts, activeChain] = await Promise.all([
            provider.request({ method: "eth_accounts" }) as Promise<string[]>,
            getChainId(provider),
          ]);
          checkBeforePayment();
          if (accounts?.[0]?.toLowerCase() !== plan.wallet.toLowerCase() || activeChain !== CHAIN_ID[plan.chain]) {
            throw new Error("The active wallet account or network changed. The remaining payments are unsent.");
          }
          setOutcomes(plan.rows.map(() => ({ status: "awaiting_wallet" })));
          const tx = await runBatchDisperse({
            token: getToken("USDC", isMainnet),
            rows: plan.rows.map((row) => ({
              label: row.label,
              address: row.address,
              amount: row.amountUsdc,
            })),
            provider,
            expectedChainId: CHAIN_ID[plan.chain],
          });
          usedSingleSig = true;
          const mappedStatus: BatchOutcome["status"] =
            tx.status === "success" ? "confirmed" : tx.status === "error" ? "failed" : "needs_review";
          setOutcomes(
            plan.rows.map(() => ({
              status: mappedStatus,
              hash: tx.txHash,
              detail: tx.message,
            })),
          );
          store.addTransaction(tx);
          store.setActiveTx(tx.id);
          store.refreshBalances();
          setNotice(
            tx.status === "success"
              ? `All ${plan.rows.length} payments confirmed in 1 signature.`
              : tx.message || "Batch transaction did not confirm.",
          );
        } catch (disperseErr) {
          const msg = disperseErr instanceof Error ? disperseErr.message : String(disperseErr);
          // Fall back to sequential sends only if Disperse isn't deployed/configured on this chain yet.
          if (!/not deployed on|not configured/i.test(msg)) {
            usedSingleSig = true;
            setOutcomes(plan.rows.map(() => ({ status: "queued", detail: msg })));
            setNotice(msg);
          }
        }
      }

      if (!usedSingleSig) {
        const result = await runPaymentBatch(plan.rows, async (row, index) => {
          checkBeforePayment();
          const provider = await getInjectedProvider();
          const [accounts, activeChain] = await Promise.all([
            provider.request({ method: "eth_accounts" }) as Promise<string[]>,
            getChainId(provider),
          ]);
          checkBeforePayment();
          if (accounts?.[0]?.toLowerCase() !== plan.wallet.toLowerCase() || activeChain !== CHAIN_ID[plan.chain]) {
            throw new Error("The active wallet account or network changed. The remaining payments are unsent.");
          }
          setOutcome(index, { status: "awaiting_wallet" });
          try {
            const tx = await executeSend({
              amount: row.amountUsdc,
              token: "USDC",
              chain: plan.chain,
              recipient: row.address,
              recipientLabel: `${plan.label} · ${row.label || `Recipient ${index + 1}`}`,
              preferLive: true,
              fromAddress: plan.wallet,
            });
            setOutcome(index, {
              status: tx.status === "success" ? "confirmed" : tx.status === "error" ? "failed" : "needs_review",
              hash: tx.txHash,
              detail: tx.message,
            });
            store.addTransaction(tx);
            store.setActiveTx(tx.id);
            return tx;
          } catch (error) {
            setOutcome(index, { status: "needs_review", detail: error instanceof Error ? error.message : "Check your wallet activity." });
            throw error;
          }
        });
        store.refreshBalances();
        setNotice(result.complete ? "All payments confirmed." : result.error ?? "Batch stopped.");
      }
    } finally {
      setBusy(false);
      store.setThinking(false);
    }
  }

  function newBatch() {
    started.current = false;
    setPlan(null);
    setOutcomes([]);
    setRows([EMPTY_ROW]);
    setLabel("");
    setNotice("");
    requestAnimationFrame(() => labelInput.current?.focus());
  }

  function closeReview() {
    setReviewOpen(false);
    setPlan(null);
  }

  if (plan && outcomes.length > 0) {
    return (
      <section aria-label="Batch results" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{NETWORK_NAME[plan.chain]}</p>
            <h4 ref={reportHeading} tabIndex={-1} className="mt-1 break-words text-lg font-semibold">{plan.label}</h4>
          </div>
          <span className="text-sm font-medium tabular-nums text-accent" role="status">{confirmed} of {plan.rows.length} confirmed</span>
        </div>
        <progress className="block h-2 w-full accent-accent" aria-label="Confirmed payments" value={confirmed} max={plan.rows.length} />
        {notice && <p role="status" className="break-words text-sm text-muted-foreground">{notice}</p>}
        {hasUnresolved && <p className="text-sm text-warning">Check your wallet and Activity timeline before repeating a payment marked Needs review.</p>}
        <ol className="max-h-80 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-background/60">
          {plan.rows.map((row, index) => {
            const outcome = outcomes[index];
            return (
              <li key={row.address} className="min-w-0 space-y-1.5 px-3 py-2.5 text-sm">
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                  <span className="min-w-0 break-words font-medium">{row.label || `Recipient ${index + 1}`}</span>
                  <span className="break-all tabular-nums">{row.amountUsdc} USDC</span>
                </div>
                <p className="break-all font-mono text-xs text-muted-foreground">{row.address}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={outcome.status === "confirmed" ? "text-accent" : "text-muted-foreground"}>{STATUS_LABEL[outcome.status]}</span>
                  {outcome.hash && isValidTxHash(outcome.hash) && (
                    <a className="inline-flex items-center gap-1 rounded text-accent underline-offset-2 hover:underline" href={explorerTxUrl(outcome.hash, plan.chain)} target="_blank" rel="noreferrer">
                      View transaction <ArrowUpRight aria-hidden="true" className="size-3" />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap gap-2">
          {busy ? (
            <Button type="button" size="sm" variant="outline" disabled={stopPending} onClick={() => { stopRequested.current = true; setStopPending(true); }}>
              {stopPending ? "Stopping after current payment…" : "Stop after current payment"}
            </Button>
          ) : (
            <>
              <Button type="button" size="sm" variant="secondary" onClick={() => downloadBatchCsv("ordenfi-batch-report.csv", buildBatchReportCsv(plan.label, plan.chain, plan.rows, outcomes))}>
                <Download aria-hidden="true" className="size-3.5" /> Download report
              </Button>
              {unsent > 0 && <Button type="button" size="sm" variant="outline" onClick={() => downloadBatchCsv("ordenfi-unsent-payments.csv", buildUnsentCsv(plan.rows, outcomes))}>Download {unsent} unsent</Button>}
              <Button type="button" size="sm" variant="ghost" onClick={newBatch}>New batch</Button>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <BatchFileImport draftCount={draft.rows.length} onImport={(imported, append) => {
        setRows(current => append ? [...current.filter(row => !isBlankBatchRow(row)), ...imported] : imported);
        setNotice("");
      }} />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">Payment list</h4>
          <Button type="button" size="sm" variant="outline" disabled={rows.length >= BATCH_RECIPIENT_LIMIT}
            onClick={() => setRows(current => [...current, EMPTY_ROW])}>
            <Plus aria-hidden="true" className="size-3.5" /> Add recipient
          </Button>
        </div>
        <Input ref={labelInput} aria-label="Batch label" placeholder="Batch label (optional)" value={label}
          maxLength={80} onChange={event => setLabel(event.target.value)} />
        <div className="max-h-[25rem] space-y-2 overflow-y-auto p-1">
          {rows.map((row, index) => {
            const issues = issuesByRow.get(index);
            const rowId = `${fieldId}-${index}`;
            return (
              <fieldset key={index} className="min-w-0 rounded-xl border border-border bg-background/60 p-2.5 sm:p-3">
                <legend className="sr-only">Recipient {index + 1}</legend>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Recipient {index + 1}</span>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove recipient ${index + 1}`}
                    disabled={rows.length <= 1} onClick={() => { setRows(current => current.filter((_, i) => i !== index)); setNotice(""); }}>
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Input aria-label={`Recipient ${index + 1} address`} value={row.address} placeholder="Wallet address"
                    className="font-mono text-xs" spellCheck={false} autoComplete="off" autoCapitalize="none"
                    aria-invalid={Boolean(issues?.address)} aria-describedby={issues?.address ? `${rowId}-address` : undefined}
                    onChange={event => updateRow(index, "address", event.target.value)} />
                  {issues?.address && <p id={`${rowId}-address`} className="text-xs text-danger">{issues.address}</p>}
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                    <div className="min-w-0">
                      <Input aria-label={`Recipient ${index + 1} label`} value={row.label} placeholder="Label (optional)"
                        aria-invalid={Boolean(issues?.label)} aria-describedby={issues?.label ? `${rowId}-label` : undefined}
                        onChange={event => updateRow(index, "label", event.target.value)} />
                      {issues?.label && <p id={`${rowId}-label`} className="mt-1 text-xs text-danger">{issues.label}</p>}
                    </div>
                    <div className="min-w-0">
                      <Input aria-label={`Recipient ${index + 1} amount`} value={row.amountUsdc} placeholder="Amount (USDC)"
                        inputMode="decimal" aria-invalid={Boolean(issues?.amountUsdc)} aria-describedby={issues?.amountUsdc ? `${rowId}-amount` : undefined}
                        onChange={event => updateRow(index, "amountUsdc", event.target.value)} />
                      {issues?.amountUsdc && <p id={`${rowId}-amount`} className="mt-1 text-xs text-danger">{issues.amountUsdc}</p>}
                    </div>
                  </div>
                </div>
              </fieldset>
            );
          })}
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-background/60 p-3 sm:p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">{NETWORK_NAME[chain]}</p>
              <p className="mt-1 text-sm font-medium">{draft.rows.length} {draft.rows.length === 1 ? "recipient" : "recipients"}</p>
            </div>
            {draft.rows.length > 0 && issuesByRow.size === 0 && <p className="break-all text-base font-semibold tabular-nums">{draft.total} USDC</p>}
          </div>
          {issuesByRow.size > 0 && <p className="text-xs text-danger">Correct {issuesByRow.size} {issuesByRow.size === 1 ? "row" : "rows"} before reviewing.</p>}
          {notice && <p role="alert" className="break-words text-sm text-warning">{notice}</p>}
          {walletAddress && !networkReady ? (
            <Button type="button" className="w-full" disabled={busySwitching || isThinking} onClick={async () => {
              setBusySwitching(true);
              setNotice("");
              try {
                await switchToArc(CHAIN_ID[chain]);
              } catch (error) {
                setNotice(error instanceof Error ? error.message : "Switch to Arc in your wallet.");
              } finally {
                setBusySwitching(false);
              }
            }}>Switch to {NETWORK_NAME[chain]}</Button>
          ) : (
            <Button type="button" className="w-full" disabled={Boolean(walletAddress) && (!draft.rows.length || issuesByRow.size > 0 || isThinking)}
              onClick={reviewBatch}>{walletAddress ? "Review batch" : "Connect wallet to review"}</Button>
          )}
        </div>
      </div>
      <ModalDialog open={reviewOpen} onDismiss={closeReview} labelledBy={reviewId} initialFocusRef={reviewHeading}>
        {plan && (() => {
          const planSingleSig = plan.rows.length > 1 && isDisperseConfigured(plan.chain === "Arc_Mainnet");
          return (
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-card p-4 shadow-2xl sm:p-5">
            <div>
              <h2 id={reviewId} ref={reviewHeading} tabIndex={-1} className="text-lg font-semibold">Review batch payments</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {planSingleSig
                  ? "Confirm once in your wallet to pay all recipients in a single transaction (plus a one-time USDC approval if needed)."
                  : "Confirm each transfer in your wallet. The batch stops if a transfer fails or remains unconfirmed."}
              </p>
            </div>
            <dl className="space-y-2 rounded-xl border border-border bg-background/60 p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-x-3">
                <dt className="text-muted-foreground">Network</dt><dd>{NETWORK_NAME[plan.chain]}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3">
                <dt className="text-muted-foreground">From</dt><dd className="break-all font-mono text-xs">{plan.wallet}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3">
                <dt className="text-muted-foreground">Payment total</dt><dd className="break-all font-semibold tabular-nums">{plan.total} USDC</dd>
              </div>
            </dl>
            <ol aria-label="Payments to review" tabIndex={0} className="max-h-48 divide-y divide-border overflow-y-auto rounded-xl border border-border">
              {plan.rows.map((row, index) => (
                <li key={row.address} className="space-y-1 px-3 py-2 text-sm">
                  <div className="flex flex-wrap justify-between gap-x-3">
                    <span className="min-w-0 break-words">{row.label || `Recipient ${index + 1}`}</span>
                    <span className="break-all tabular-nums">{row.amountUsdc} USDC</span>
                  </div>
                  <p className="break-all font-mono text-xs text-muted-foreground">{row.address}</p>
                </li>
              ))}
            </ol>
            <FeeLineItems quote={quotePayrollBatchFee(plan.rows.length)} compact />
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeReview}>Edit payments</Button>
              <Button type="button" onClick={() => void runBatch()}>
                {planSingleSig
                  ? `Send ${plan.rows.length} payments (1 signature)`
                  : `Start ${plan.rows.length} ${plan.rows.length === 1 ? "payment" : "payments"}`}
              </Button>
            </div>
          </div>
          );
        })()}
      </ModalDialog>
    </div>
  );
}
