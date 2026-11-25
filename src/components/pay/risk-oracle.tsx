"use client";

import { useState } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { assessRouteRisk } from "@/lib/agent-economy";
import { estimateBridgeDemo } from "@/blockchain/appkit-service";
import type { ChainId } from "@/types";
import { resolveChain } from "@/lib/chains";

/** Local heuristic assessment; paid access stays disabled with the server. */
export function RiskOracleCard({ embedded = false }: { embedded?: boolean }) {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("Base_Sepolia");
  const [to, setTo] = useState("Arc_Testnet");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReturnType<
    typeof assessRouteRisk
  > | null>(null);
  const [quote, setQuote] = useState<ReturnType<
    typeof estimateBridgeDemo
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runFree() {
    setBusy(true);
    setResult(null);
    setQuote(null);
    setError(null);
    try {
      const fromChain = (resolveChain(from) || "Base_Sepolia") as ChainId;
      const toChain = (resolveChain(to) || "Arc_Testnet") as ChainId;
      const bridgeQuote = estimateBridgeDemo(amount, fromChain, toChain);
      setQuote(bridgeQuote);
      const risk = assessRouteRisk({ fromChain, toChain, amount });
      risk.factors = [
        ...risk.factors,
        `Est. bridge fee ~$${bridgeQuote.feeUsd.toFixed(3)}`,
        "Free local assess (not x402-paid)",
      ];
      setResult(risk);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assessment failed");
    } finally {
      setBusy(false);
    }
  }

  const body = (
      <div className="space-y-3">
        {!embedded && (
        <p className="text-xs text-slate-500 leading-relaxed">
          Local heuristic estimate. This does not use live liquidity or congestion data.
        </p>
        )}
        <div className="grid grid-cols-3 gap-1.5">
          <Input
            className="text-xs h-9"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
          />
          <Input
            className="text-xs h-9"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="From"
          />
          <Input
            className="text-xs h-9"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To"
          />
        </div>
        <p className="text-xs text-muted-foreground">Local estimate only. Paid assessments are unavailable.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="secondary"
            type="button"
            disabled={busy}
            onClick={() => void runFree()}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Free assess
          </Button>
          <Button
            size="sm"
            type="button"
            disabled
            title="Paid assessments are currently unavailable"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Paid unavailable
          </Button>
        </div>
        {error && (
          <p className="text-xs text-red-400 whitespace-pre-wrap">{error}</p>
        )}
        {result && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-200">
                Score {result.score}
              </span>
              <Badge
                variant={
                  result.level === "low"
                    ? "success"
                    : result.level === "elevated"
                      ? "outline"
                      : "cyan"
                }
              >
                {result.level}
              </Badge>
            </div>
            <p className="text-slate-400">{result.recommendation}</p>
            <ul className="text-slate-500 space-y-0.5 list-disc list-inside">
              {result.factors.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {quote && (
              <p className="text-slate-500 pt-1">
                Quote: {quote.route} · ~${quote.feeUsd.toFixed(3)} · {quote.eta}
              </p>
            )}
          </div>
        )}
      </div>
  );

  if (embedded) return body;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            Route risk oracle
          </CardTitle>
          <Badge variant="outline">x402 · Arc</Badge>
        </div>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
