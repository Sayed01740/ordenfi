"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Download, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePilotStore } from "@/store/pilot-store";
import { createPaymentLink, paymentChain } from "@/lib/payment-tools";
import { AssistantRobot } from "@/components/workspace/assistant-robot";
import { CHAINS } from "@/lib/chains";

/** Receiving requests only; signing and payment happen in the payer's workspace. */
export function QrPayCard({ embedded = false }: { embedded?: boolean }) {
  const { walletAddress, walletChainId, networkMode } = usePilotStore();
  const [amount, setAmount] = useState("10");
  const [memo, setMemo] = useState("");
  const [address, setAddress] = useState("");
  const [copiedLink, setCopiedLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const chain = paymentChain(walletChainId, networkMode);
  const recipient = address.trim() || walletAddress || "";
  let payUri = "";
  let validation = "";
  try {
    if (origin) payUri = createPaymentLink(origin, { amount, to: recipient, memo, chain });
  } catch (error) { validation = error instanceof Error ? error.message : "Check the payment details."; }
  const copied = Boolean(payUri) && copiedLink === payUri;

  async function copyUri() {
    try { await navigator.clipboard.writeText(payUri); setCopiedLink(payUri); setError(null); }
    catch { setError("Could not copy. Select and copy the link below."); }
  }

  function downloadQr() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([data], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ordenfi-payment-qr.svg";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const body = <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Request USDC on {chain === "Arc_Mainnet" ? "Arc Mainnet" : "Arc Testnet"}. The payer reviews and signs the transfer.</p>
    <div>
      <label htmlFor="qr-recipient" className="mb-1.5 block text-xs text-muted-foreground">Receiving address</label>
      <Input id="qr-recipient" className="font-mono text-xs" placeholder={walletAddress || "Connect your wallet or paste 0x…"} value={address} onChange={e => setAddress(e.target.value)} />
      {walletAddress && !address && <p className="mt-1 text-xs text-muted-foreground">Using your connected wallet.</p>}
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div><label htmlFor="qr-amount" className="mb-1.5 block text-xs text-muted-foreground">Amount (USDC)</label><Input id="qr-amount" type="number" min="0.000001" step="0.000001" value={amount} onChange={e => setAmount(e.target.value)} /></div>
      <div><label htmlFor="qr-memo" className="mb-1.5 block text-xs text-muted-foreground">Memo (optional)</label><Input id="qr-memo" maxLength={200} value={memo} onChange={e => setMemo(e.target.value)} /></div>
    </div>
    {payUri ? <>
      <section aria-label="Payment QR card" className="space-y-3 rounded-xl border border-border bg-background px-3 py-4">
        <div className="flex items-end justify-center">
          <AssistantRobot mood={copied ? "reply" : "idle"} courier />
          <div ref={qrRef} className="min-w-0 max-w-48">
            <QRCodeSVG value={payUri} size={192} marginSize={4} title="USDC payment request QR code" className="block h-auto w-full rounded-lg" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold tabular-nums">{amount} USDC <span className="font-normal text-muted-foreground">· {CHAINS[chain].label}</span></p>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{recipient}</p>
          <p role="status" className="mt-1 text-xs text-accent">{copied ? "Payment link copied" : "Ready to scan"}</p>
        </div>
      </section>
      <textarea aria-label="Payment link" readOnly value={payUri} className="w-full resize-none rounded-lg border border-border bg-background p-3 font-mono text-xs text-muted-foreground" rows={3} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-11 flex-1" onClick={() => void copyUri()}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy payment link"}</Button>
        <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={downloadQr}><Download aria-hidden="true" className="h-4 w-4" /> Download QR</Button>
      </div>
    </> : <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"><QrCode className="mx-auto mb-3 h-8 w-8" />{validation || "Enter payment details to generate your QR code."}</div>}
    {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
  </div>;
  return embedded ? body : <Card><CardHeader><CardTitle>Receive USDC</CardTitle></CardHeader><CardContent>{body}</CardContent></Card>;
}
