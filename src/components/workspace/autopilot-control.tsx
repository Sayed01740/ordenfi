"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Check, Copy, ArrowDownToLine, ArrowUpFromLine, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePilotStore } from "@/store/pilot-store";
import {
  fetchAgentVaultBalance,
  fundAgentVault,
  getOrCreateAgentVault,
  getStoredAgentVault,
  withdrawAgentVault,
} from "@/sdk/agent-autopilot";
import { formatBalance } from "@/components/dapp/shared";

const LIMITS = [1, 5, 10, 25];

export function AutopilotControl({ disabled }: { disabled?: boolean }) {
  const walletAddress = usePilotStore((s) => s.walletAddress);
  const walletChainId = usePilotStore((s) => s.walletChainId);
  const networkMode = usePilotStore((s) => s.networkMode);
  const autoPilotEnabled = usePilotStore((s) => s.autoPilotEnabled);
  const autoPilotMaxPerTx = usePilotStore((s) => s.autoPilotMaxPerTx);
  const setAutoPilotEnabled = usePilotStore((s) => s.setAutoPilotEnabled);
  const setAutoPilotMaxPerTx = usePilotStore((s) => s.setAutoPilotMaxPerTx);
  const addTransaction = usePilotStore((s) => s.addTransaction);

  const isMainnet =
    walletChainId === 5042
      ? true
      : walletChainId === 5042002
        ? false
        : networkMode === "mainnet";

  const [expanded, setExpanded] = useState(false);
  const [vaultAddr, setVaultAddr] = useState<string | null>(null);
  const [vaultBal, setVaultBal] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState("2");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshVault = useCallback(async () => {
    const existing = getStoredAgentVault(walletAddress);
    if (!existing) {
      setVaultAddr(null);
      setVaultBal(null);
      return;
    }
    setVaultAddr(existing.address);
    try {
      const bal = await fetchAgentVaultBalance(existing.address, isMainnet);
      setVaultBal(bal);
    } catch {
      setVaultBal(null);
    }
  }, [walletAddress, isMainnet]);

  useEffect(() => {
    if (!autoPilotEnabled) return;
    const vault = getOrCreateAgentVault(walletAddress);
    setVaultAddr(vault.address);
    void refreshVault();
  }, [autoPilotEnabled, walletAddress, refreshVault]);

  function toggleAutopilot() {
    const next = !autoPilotEnabled;
    if (next) {
      const vault = getOrCreateAgentVault(walletAddress);
      setVaultAddr(vault.address);
      setExpanded(true);
    }
    setNotice(null);
    setAutoPilotEnabled(next);
  }

  async function handleFund() {
    if (!walletAddress) {
      setNotice("Connect your main wallet first to fund the Agent Vault.");
      return;
    }
    const n = Number(fundAmount);
    if (!Number.isFinite(n) || n <= 0) {
      setNotice("Enter a valid USDC amount.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fundAgentVault(walletAddress, fundAmount, isMainnet);
      addTransaction({
        id: `tx_${Math.random().toString(36).slice(2, 11)}`,
        type: "send",
        status: "success",
        amount: fundAmount,
        token: "USDC",
        fromChain: isMainnet ? "Arc_Mainnet" : "Arc_Testnet",
        toChain: isMainnet ? "Arc_Mainnet" : "Arc_Testnet",
        recipient: vaultAddr || undefined,
        recipientLabel: "Kona Agent Vault",
        txHash: res.txHash,
        explorerUrl: res.explorerUrl,
        createdAt: new Date().toISOString(),
        message: `Funded Kona Agent Vault with ${fundAmount} USDC`,
        executionMode: "live",
        steps: [{ name: "Fund Agent Vault", state: "success", txHash: res.txHash }],
      });
      setNotice(`Funded ${fundAmount} USDC.`);
      await refreshVault();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Funding cancelled or failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw() {
    if (!walletAddress) {
      setNotice("Connect your main wallet to withdraw.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await withdrawAgentVault(walletAddress, isMainnet);
      setNotice(`Withdrew ${Number(res.amount).toFixed(4)} USDC to main wallet.`);
      await refreshVault();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Withdraw failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyAddress() {
    if (!vaultAddr) return;
    try {
      await navigator.clipboard.writeText(vaultAddr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-xl border border-border bg-background/70 px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <Bot aria-hidden="true" className={`size-3.5 shrink-0 ${autoPilotEnabled ? "text-emerald-400" : "text-muted-foreground"}`} />
          <span className="truncate font-semibold text-foreground">Auto-Pilot</span>
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
              autoPilotEnabled
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {autoPilotEnabled ? "ON" : "OFF"}
          </span>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={autoPilotEnabled}
          aria-label="Toggle Kona Auto-Pilot"
          disabled={disabled || busy}
          onClick={toggleAutopilot}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
            autoPilotEnabled
              ? "border-emerald-400/50 bg-emerald-500/30"
              : "border-border bg-muted"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
              autoPilotEnabled ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {(expanded || autoPilotEnabled) && (
        <div className="mt-2 space-y-2 border-t border-border/70 pt-2 text-[11px] text-muted-foreground">
          {!autoPilotEnabled ? (
            <p>
              Off by default. Turn <strong className="text-foreground">ON</strong> to let Kona ask missing details and execute up to{" "}
              <strong className="text-foreground">${autoPilotMaxPerTx} USDC</strong> automatically from a dedicated Agent Vault without wallet popups.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <span>Agent Vault ({isMainnet ? "Mainnet" : "Testnet"})</span>
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {vaultBal !== null ? `${formatBalance(vaultBal)} USDC` : "Loading…"}
                </span>
              </div>

              {vaultAddr && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1">
                  <span className="truncate font-mono text-[11px] text-foreground">{vaultAddr}</span>
                  <button
                    type="button"
                    onClick={copyAddress}
                    className="shrink-0 text-accent hover:text-accent/80"
                    aria-label="Copy Agent Vault address"
                  >
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="size-3 text-emerald-400" /> Max / tx:
                </span>
                <div className="flex gap-1">
                  {LIMITS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setAutoPilotMaxPerTx(l)}
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                        autoPilotMaxPerTx === l
                          ? "bg-accent/20 text-accent border border-accent/40"
                          : "border border-border hover:text-foreground"
                      }`}
                    >
                      ${l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  disabled={busy}
                  aria-label="Fund amount USDC"
                  className="h-7 w-16 rounded border border-border bg-muted px-2 font-mono text-xs text-foreground"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || !walletAddress}
                  onClick={() => void handleFund()}
                  className="h-7 flex-1 gap-1 px-2 text-[11px]"
                >
                  <ArrowDownToLine className="size-3" /> Fund
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy || !walletAddress || Number(vaultBal || 0) <= 0.002}
                  onClick={() => void handleWithdraw()}
                  className="h-7 gap-1 px-2 text-[11px]"
                >
                  <ArrowUpFromLine className="size-3" /> Sweep
                </Button>
              </div>
              {notice && <p className="text-[11px] text-accent">{notice}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
