"use client";

import { useEffect, useState } from "react";
import { ArrowDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmountField, ResultBanner, ErrorNote, useArcBalance } from "@/components/dapp/shared";
import { ARC_TOKENS, SWAP_SYMBOLS, getArcTokens, type ArcToken } from "@/lib/dapp/tokens";
import { getArcDexSwapQuote, type QuoteResult } from "@/blockchain/production-swap";
import { executeSwap } from "@/lib/client-actions";
import { usePilotStore } from "@/store/pilot-store";
import { useWallet } from "@/providers/wallet-provider";
import { getArcNetworkMeta } from "@/lib/arc-chain";
import { ProductionSwapPanel } from "@/components/panels/production-swap-panel";
import { formatSwapRate } from "@/components/panels/swap-helpers";
import type { TransactionRecord } from "@/types";
import type { AssistantSwapPlan } from "@/lib/assistant-plan";

const SLIPPAGE_PRESETS = [50, 100, 300];
type QuoteResponse = { key: string; quote: QuoteResult } | { key: string; error: string };

export function SwapCard({ connected, initialPlan, onDraftSubmitted }: {
  connected: boolean;
  initialPlan?: AssistantSwapPlan;
  onDraftSubmitted?: () => void;
}) {
  const { openConnectModal } = useWallet();
  const addTransaction = usePilotStore((s) => s.addTransaction);
  const refreshBalances = usePilotStore((s) => s.refreshBalances);
  const walletChainId = usePilotStore((s) => s.walletChainId);
  const networkMode = usePilotStore((s) => s.networkMode);
  const draftChainId = initialPlan ? (initialPlan.chain === "Arc_Mainnet" ? 5042 : 5042002) : null;
  const effectiveChainId =
    draftChainId ??
    (walletChainId === 5042 || walletChainId === 5042002
      ? walletChainId
      : networkMode === "mainnet"
        ? 5042
        : 5042002);
  const meta = getArcNetworkMeta(effectiveChainId);

  const currentTokens = getArcTokens(meta.isMainnet);
  const swapTokensList: ArcToken[] = SWAP_SYMBOLS.map((s) => currentTokens[s] || ARC_TOKENS[s]);

  const [tokenIn, setTokenIn] = useState<ArcToken>(currentTokens[initialPlan?.tokenIn ?? "USDC"] || ARC_TOKENS.USDC);
  const [tokenOut, setTokenOut] = useState<ArcToken>(currentTokens[initialPlan?.tokenOut ?? "EURC"] || ARC_TOKENS.EURC);
  const [amountIn, setAmountIn] = useState(initialPlan?.amount ?? "");
  const [quoteResponse, setQuoteResponse] = useState<QuoteResponse | null>(null);
  const [slippageBps, setSlippageBps] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TransactionRecord | null>(null);

  const activeTokenIn = currentTokens[tokenIn.symbol] || tokenIn;
  const inBal = useArcBalance(activeTokenIn, meta.isMainnet);
  const paySymbol = tokenIn.symbol;
  const receiveSymbol = tokenOut.symbol;
  const input = Number(amountIn);
  const canQuote = !meta.isMainnet && connected && Number.isFinite(input) && input > 0 && paySymbol !== receiveSymbol;
  const quoteKey = canQuote ? JSON.stringify([amountIn, paySymbol, receiveSymbol, slippageBps]) : null;
  const currentResponse = quoteResponse?.key === quoteKey ? quoteResponse : null;
  const quote = currentResponse && "quote" in currentResponse ? currentResponse.quote : null;
  const quoteError = currentResponse && "error" in currentResponse ? currentResponse.error : null;
  const quoting = canQuote && !currentResponse;

  function flip() {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    if (quote) setAmountIn("");
  }

  function pickIn(t: ArcToken) {
    if (t.symbol === tokenOut.symbol) setTokenOut(tokenIn);
    setTokenIn(t);
  }
  function pickOut(t: ArcToken) {
    if (t.symbol === tokenIn.symbol) setTokenIn(tokenOut);
    setTokenOut(t);
  }

  // Debounced live quote (requires a connected wallet).
  useEffect(() => {
    setResult(null);
    setError(null);
    setQuoteResponse(null);
    if (!quoteKey) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const nextQuote = await getArcDexSwapQuote({
          amount: amountIn,
          tokenIn: paySymbol,
          tokenOut: receiveSymbol,
          chain: "Arc_Testnet",
          slippageBps,
        });
        if (active) setQuoteResponse({ key: quoteKey, quote: nextQuote });
      } catch (error) {
        if (active) setQuoteResponse({ key: quoteKey, error: error instanceof Error ? error.message : "No quote available." });
      }
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [quoteKey, amountIn, paySymbol, receiveSymbol, slippageBps]);

  async function onSwap() {
    if (!quote || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const activeChain = meta.isMainnet ? "Arc_Mainnet" : "Arc_Testnet";
      const tx = await executeSwap({
        amount: amountIn,
        tokenIn: tokenIn.symbol,
        tokenOut: tokenOut.symbol,
        chain: activeChain,
        slippageBps,
      });
      addTransaction(tx);
      if (tx.txHash || tx.status === "success") onDraftSubmitted?.();
      setResult(tx);
      if (tx.status === "success") setAmountIn("");
      refreshBalances();
      void inBal.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Swap failed.");
    } finally {
      setBusy(false);
    }
  }

  if (meta.isMainnet) return <ProductionSwapPanel embedded initialPlan={initialPlan} onDraftSubmitted={onDraftSubmitted} />;

  const rate = formatSwapRate(amountIn, quote?.amountOut);
  const receiveStatus = rate ? `1 ${paySymbol} ≈ ${rate} ${receiveSymbol}`
    : quoting ? "Getting quote…"
    : quoteError ? "Quote unavailable"
    : connected ? "Enter an amount to get a quote"
    : "Connect wallet to get a quote";
  const errorMessage = error ?? quoteError;

  return (
    <div className="space-y-2">
      {initialPlan && <p className="text-xs text-muted-foreground">Assistant draft · {meta.name}. Review the token pair and quote.</p>}
      <AmountField
        label="You pay"
        amount={amountIn}
        onAmountChange={setAmountIn}
        token={tokenIn}
        tokenOptions={swapTokensList}
        onTokenChange={pickIn}
        balance={connected ? inBal.balance : undefined}
        onMax={connected ? () => setAmountIn(inBal.balance) : undefined}
      />

      <div className="relative -my-2.5 z-10 flex justify-center">
        <button
          type="button"
          onClick={flip}
          className="grid h-9 w-9 place-items-center rounded-2xl border border-white/[0.12] bg-card text-muted-foreground   transition-colors hover:border-accent/50 hover:bg-card hover:text-accent"
          aria-label="Switch direction"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      </div>

      <AmountField
        label="You receive"
        amount={quote?.amountOut ?? ""}
        token={tokenOut}
        tokenOptions={swapTokensList}
        onTokenChange={pickOut}
        readOnly
        loading={quoting}
        secondary={receiveStatus}
      />

      <div className="flex items-center justify-between px-1 pt-1.5 text-xs text-muted-foreground">
        <span>Max slippage</span>
        <div className="flex items-center gap-1">
          {SLIPPAGE_PRESETS.map((bps) => (
            <button
              key={bps}
              type="button"
              onClick={() => setSlippageBps(bps)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                slippageBps === bps ? "bg-accent/15 text-accent border border-accent/40 shadow-xs" : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground border border-transparent"
              }`}
            >
              {(bps / 100).toString()}%
            </button>
          ))}
        </div>
      </div>
      {quote?.minimumAmountOut && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>Minimum received</span>
          <span className="text-foreground font-mono">
            {quote.minimumAmountOut} {receiveSymbol}
          </span>
        </div>
      )}

      {quote && <p className="px-1 text-xs text-muted-foreground">Route: {quote.route}</p>}
      {errorMessage && <ErrorNote message={errorMessage} />}
      {result && <ResultBanner record={result} />}

      <Button size="lg" data-wallet-connect={!connected || undefined} className="mt-2 w-full h-12 rounded-xl font-medium text-base" disabled={connected && (busy || !quote)} onClick={connected ? onSwap : openConnectModal}>
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Swapping…
          </>
        ) : !connected ? (
          "Connect wallet"
        ) : tokenIn.symbol === tokenOut.symbol ? (
          "Select different tokens"
        ) : !canQuote ? (
          "Enter an amount"
        ) : quoting ? (
          "Getting quote…"
        ) : !quote ? (
          "Quote unavailable"
        ) : (
          `Swap ${tokenIn.symbol} for ${tokenOut.symbol}`
        )}
      </Button>
    </div>
  );
}
