"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Loader2, RefreshCw } from "lucide-react";
import { encodeFunctionData, maxUint256, parseUnits, type Address } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TokenMark } from "@/components/brand/token-mark";
import { usePilotStore } from "@/store/pilot-store";
import { useWallet } from "@/providers/wallet-provider";
import { executeSwap } from "@/lib/client-actions";
import { getArcDexSwapQuote } from "@/blockchain/production-swap";
import { explorerTxUrl, getArcNetworkMeta } from "@/lib/arc-chain";
import { arcPublicClient, readAllowance } from "@/lib/dapp/erc20";
import { getToken } from "@/lib/dapp/tokens";
import { ARC_PERMIT2_CONTRACT } from "@/blockchain/uniswap-permit2";
import { uid } from "@/lib/utils";
import type { AssistantSwapPlan } from "@/lib/assistant-plan";
import { quoteHasExpired } from "@/lib/assistant-tools";
import { useAssistantWorkspace } from "@/components/workspace/assistant-workspace-context";
import {
  SWAP_HANDOFF_EVENT,
  clearSwapHandoff,
  consumeSwapHandoff,
  type SwapHandoff,
} from "@/lib/swap-handoff";
import {
  ARC_SWAP_TOKENS,
  ERC20_APPROVE_ABI,
  SLIPPAGE_PRESETS,
  formatSwapRate,
  getVerifiedMainnetProvider,
  isRecord,
  minimumReceived,
  parseSlippageBps,
  prettyAmount,
  type ArcSwapToken,
  type PendingApprovalTransaction,
  type PreparedMainnetTransaction,
  type SwapFlowStep,
  type SwapQuote,
} from "./swap-helpers";
import {
  SwapPendingApprovalCard,
  SwapPreparedTxCard,
  SwapQuoteSummaryCard,
} from "./swap-quote-cards";

export function ProductionSwapPanel({ embedded = false, initialPlan, onDraftSubmitted }: {
  embedded?: boolean;
  initialPlan?: AssistantSwapPlan;
  onDraftSubmitted?: () => void;
} = {}) {
  const { openConnectModal } = useWallet();
  const { addTransaction, setActiveTx, setThinking, walletAddress, walletChainId } = usePilotStore();
  const meta = getArcNetworkMeta(initialPlan ? 5042 : walletChainId);

  const [tokenIn, setTokenIn] = useState<ArcSwapToken>(initialPlan?.tokenIn ?? "USDC");
  const [tokenOut, setTokenOut] = useState<ArcSwapToken>(initialPlan?.tokenOut ?? "EURC");
  const [amount, setAmount] = useState(initialPlan?.amount ?? "0.50");
  const [slippage, setSlippage] = useState("1");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [expiredQuote, setExpiredQuote] = useState<SwapQuote | null>(null);
  const [prepared, setPrepared] = useState<PreparedMainnetTransaction | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingApprovalTransaction | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [swapBusy, setSwapBusy] = useState(false);
  const [needsTokenApproval, setNeedsTokenApproval] = useState(false);
  const [approvalMode, setApprovalMode] = useState<"exact" | "unlimited">("exact");
  const [flowStep, setFlowStep] = useState<SwapFlowStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { setQuoteExpired } = useAssistantWorkspace() ?? {};
  const quoteExpired = quote !== null && expiredQuote === quote;

  useEffect(() => {
    const expiresAt = quote?.quoteSessionExpiresAt;
    if (!quote || !Number.isSafeInteger(expiresAt) || expiresAt === undefined) return;
    const checkDeadline = () => {
      if (quoteHasExpired(expiresAt, Date.now())) setExpiredQuote(quote);
    };
    checkDeadline();
    const timer = window.setTimeout(checkDeadline, Math.max(0, Math.min(2_147_483_647, expiresAt * 1000 - Date.now())));
    document.addEventListener("visibilitychange", checkDeadline);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", checkDeadline);
    };
  }, [quote]);

  useEffect(() => {
    setQuoteExpired?.(quoteExpired && !swapBusy && !quoteBusy);
    return () => setQuoteExpired?.(false);
  }, [quoteExpired, swapBusy, quoteBusy, setQuoteExpired]);

  useEffect(() => {
    setQuote(null);
    setPrepared(null);
    setPendingApproval(null);
    setNeedsTokenApproval(false);
    setFlowStep("idle");
    setError(null);
    setNotice(null);
  }, [walletAddress, walletChainId]);

  // Chat Agent handoff: pre-fill tokens/amount and fetch a live quote automatically.
  const [autoQuote, setAutoQuote] = useState(false);

  useEffect(() => {
    const SYMBOLS: Record<string, ArcSwapToken> = { USDC: "USDC", EURC: "EURC", CIRBTC: "cirBTC" };
    const apply = (req: SwapHandoff) => {
      const nextIn = SYMBOLS[req.tokenIn.toUpperCase()];
      const nextOut = SYMBOLS[req.tokenOut.toUpperCase()];
      if (nextIn) setTokenIn(nextIn);
      if (nextOut) setTokenOut(nextOut);
      if (req.amount) setAmount(req.amount);
      setQuote(null);
      setPrepared(null);
      setPendingApproval(null);
      setError(null);
      setNotice("Swap prepared by the AI Agent. Review the live quote, then press the swap button to approve & sign.");
      if (req.autoQuote !== false) setAutoQuote(true);
    };
    const pending = consumeSwapHandoff();
    if (pending) apply(pending);
    const onHandoff = (e: Event) => {
      clearSwapHandoff();
      apply((e as CustomEvent<SwapHandoff>).detail);
    };
    window.addEventListener(SWAP_HANDOFF_EVENT, onHandoff);
    return () => window.removeEventListener(SWAP_HANDOFF_EVENT, onHandoff);
  }, []);


  const slippageBps = useMemo(() => {
    try {
      return parseSlippageBps(slippage);
    } catch {
      return null;
    }
  }, [slippage]);

  const canQuote = useMemo(() => {
    const n = Number(amount);
    return !!walletAddress && tokenIn !== tokenOut && Number.isFinite(n) && n > 0 && slippageBps !== null;
  }, [amount, tokenIn, tokenOut, walletAddress, slippageBps]);

  function updateSlippage(value: string) {
    setSlippage(value);
    setQuote(null);
    setPrepared(null);
    setPendingApproval(null);
    setError(null);
    setNotice(null);
  }

  function flip() {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setQuote(null);
    setPrepared(null);
    setPendingApproval(null);
    setError(null);
    setNotice(null);
  }

  async function fetchMainnetQuotePayload(accountAddress: string): Promise<SwapQuote> {
    const response = await fetch("/api/uniswap/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: accountAddress,
        amount,
        tokenIn,
        tokenOut,
        chainId: 5042,
        slippageBps,
      }),
      cache: "no-store",
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok || !isRecord(data) || data.ok !== true || typeof data.quoteSession !== "string") {
      const message = isRecord(data) && typeof data.detail === "string"
        ? data.detail
        : isRecord(data) && typeof data.error === "string"
          ? data.error
          : "Unable to obtain an Arc Mainnet quote.";
      throw new Error(message);
    }
    return {
      amountOut: String(data.amountOut || ""),
      minimumAmountOut: String(data.minimumAmountOut || ""),
      route: String(data.routing || "Uniswap"),
      network: "mainnet",
      quoteSession: data.quoteSession,
      quoteSessionExpiresAt: typeof data.quoteSessionExpiresAt === "number" ? data.quoteSessionExpiresAt : undefined,
      permitData: isRecord(data.permitData) ? data.permitData : null,
      estimatedGasUsd: typeof data.estimatedGasUsd === "string" ? data.estimatedGasUsd : null,
    };
  }

  async function checkPermit2Allowance(accountAddress: string): Promise<boolean> {
    if (!meta.isMainnet || tokenIn === "USDC") return false;
    try {
      const tokenMeta = getToken(tokenIn, true);
      const requiredUnits = parseUnits(amount.trim(), tokenMeta.decimals);
      const current = await readAllowance(
        tokenMeta.address,
        accountAddress as Address,
        ARC_PERMIT2_CONTRACT as Address,
        true,
      );
      return current < requiredUnits;
    } catch {
      return false;
    }
  }

  async function getQuote() {
    if (quoteBusy || swapBusy) return;
    if (!walletAddress) {
      setError("Connect your wallet before requesting a swap quote.");
      return;
    }
    if (tokenIn === tokenOut) {
      setError("Choose two different tokens.");
      return;
    }
    const n = Number(amount);
    if (!amount || !Number.isFinite(n) || n <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (slippageBps === null) {
      setError("Slippage must be between 0.1% and 5%.");
      return;
    }

    setQuoteBusy(true);
    setError(null);
    setNotice(null);
    setPrepared(null);
    setPendingApproval(null);
    setQuote(null);
    try {
      if (meta.isMainnet) {
        const { account } = await getVerifiedMainnetProvider(walletAddress);
        const [nextQuote, requiresApprove] = await Promise.all([
          fetchMainnetQuotePayload(account),
          checkPermit2Allowance(account),
        ]);
        setNeedsTokenApproval(requiresApprove);
        setQuote(nextQuote);
      } else {
        setNeedsTokenApproval(false);
        const raw = await getArcDexSwapQuote({ amount, tokenIn, tokenOut, chain: "Arc_Testnet", slippageBps });
        setQuote({ amountOut: raw.amountOut, minimumAmountOut: raw.minimumAmountOut, route: raw.route, network: "testnet" });
      }
    } catch (e) {
      setQuote(null);
      setError(e instanceof Error ? e.message : "Unable to obtain a live Arc swap quote.");
    } finally {
      setQuoteBusy(false);
    }
  }

  useEffect(() => {
    if (!autoQuote) return;
    if (!walletAddress) return; // wait until wallet is available
    setAutoQuote(false);
    if (canQuote) void getQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoQuote, canQuote, walletAddress]);

  async function approvePermit2InWallet() {
    if (!pendingApproval || !walletAddress) return;
    if (!canUseQuote()) return;
    setSwapBusy(true);
    setThinking(true);
    setError(null);
    setNotice(null);
    try {
      const { provider, account } = await getVerifiedMainnetProvider(walletAddress);
      if (pendingApproval.from.toLowerCase() !== account.toLowerCase() || pendingApproval.chainId !== 5042) {
        throw new Error("Approval transaction does not match connected Arc Mainnet wallet.");
      }
      if (!canUseQuote()) return;
      const approveTxHash = String(
        await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              chainId: meta.chainIdHex,
              from: account,
              to: pendingApproval.to,
              data: pendingApproval.data,
              value: "0x0",
            },
          ],
        }),
      );
      setNotice(`Waiting for Permit2 approval confirmation (${approveTxHash.slice(0, 10)}…)…`);
      await arcPublicClient(true).waitForTransactionReceipt({
        hash: approveTxHash as `0x${string}`,
        timeout: 90_000,
      });
      setPendingApproval(null);
      setNeedsTokenApproval(false);
      const refreshedQuote = await fetchMainnetQuotePayload(account);
      setQuote(refreshedQuote);
      setNotice("Permit2 approval confirmed ✓ Fresh quote loaded — click 'Confirm & Swap' to finish.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Permit2 approval failed.");
    } finally {
      setSwapBusy(false);
      setThinking(false);
    }
  }

  async function executePreparedMainnetSwap() {
    if (!prepared || !walletAddress) return;
    if (!canUseQuote()) return;
    setSwapBusy(true);
    setThinking(true);
    setError(null);
    setNotice(null);
    try {
      const { provider, account } = await getVerifiedMainnetProvider(walletAddress);
      if (
        prepared.transaction.chainId !== 5042 ||
        prepared.transaction.from.toLowerCase() !== account.toLowerCase() ||
        !prepared.transaction.data.startsWith("0x")
      ) {
        throw new Error("Prepared transaction no longer matches the connected Arc Mainnet account.");
      }

      const gasHex = prepared.transaction.gasLimit
        ? `0x${BigInt(prepared.transaction.gasLimit).toString(16)}`
        : undefined;
      const rawValue = prepared.transaction.value || "0";
      const valueHex = rawValue && rawValue !== "0" && rawValue !== "0x0"
        ? (rawValue.startsWith("0x") ? rawValue : `0x${BigInt(rawValue).toString(16)}`)
        : "0x0";
      const txParams: Record<string, string> = {
        chainId: meta.chainIdHex,
        from: account,
        to: prepared.transaction.to,
        data: prepared.transaction.data,
        value: valueHex,
      };
      if (gasHex) txParams.gas = gasHex;
      if (!canUseQuote()) return;

      const txHash = String(
        await provider.request({
          method: "eth_sendTransaction",
          params: [txParams],
        }),
      );

      setNotice(`Swap broadcast (${txHash.slice(0, 10)}…). Waiting for Arc Mainnet confirmation…`);
      const receipt = await arcPublicClient(true).waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
        timeout: 90_000,
      });
      if (receipt.status !== "success") {
        throw new Error(`Swap transaction reverted on Arc Mainnet (${txHash}).`);
      }

      if (prepared.receiptVerificationTicket) {
        const verifyRes = await fetch("/api/uniswap/receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiptVerificationTicket: prepared.receiptVerificationTicket,
            transactionHash: txHash,
          }),
          cache: "no-store",
        });
        if (!verifyRes.ok && verifyRes.status !== 202) {
          console.warn("[Ordenfi] Receipt verification warning", { status: verifyRes.status });
        }
      }

      const txId = uid("swap");
      addTransaction({
        id: txId,
        type: "swap",
        status: "success",
        amount,
        token: `${tokenIn} → ${tokenOut}`,
        fromChain: "Arc",
        toChain: "Arc",
        recipient: account,
        txHash,
        explorerUrl: explorerTxUrl(txHash, 5042),
        steps: [
          { name: "Validate Quote & Permit2", state: "success" },
          { name: "Simulate Universal Router 2.1.2", state: "success" },
          { name: "Broadcast Swap on Arc Mainnet", state: "success", txHash },
        ],
        createdAt: new Date().toISOString(),
        message: `Swapped ${amount} ${tokenIn} for ~${prettyAmount(quote?.amountOut)} ${tokenOut} on Arc Mainnet`,
        executionMode: "live",
      });
      setActiveTx(txId);
      onDraftSubmitted?.();
      setPrepared(null);
      setQuote(null);
      setNotice(`Swap confirmed on Arc Mainnet! Tx: ${txHash.slice(0, 14)}…`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mainnet swap execution failed.");
    } finally {
      setSwapBusy(false);
      setThinking(false);
    }
  }

  async function executeGuidedMainnetSwap() {
    if (!quote?.quoteSession || !walletAddress) {
      throw new Error("Request a fresh Mainnet quote before swapping.");
    }
    const gateResponse = await fetch("/api/uniswap/swap", { method: "GET", cache: "no-store" });
    const gate: unknown = await gateResponse.json().catch(() => null);
    if (!gateResponse.ok || !isRecord(gate) || gate.enabled !== true || typeof gate.executionEnabled !== "boolean") {
      setNotice("Mainnet transaction preparation is disabled in this deployment. Quote is read-only.");
      return;
    }

    const { provider, account } = await getVerifiedMainnetProvider(walletAddress);
    const activeQuote = quote;
    if (!canUseQuote(activeQuote)) return;

    // Step 1: Upfront ERC-20 Approval to Permit2 (only when needed for non-native tokens)
    if (needsTokenApproval && tokenIn !== "USDC") {
      setFlowStep("approving");
      setNotice(`Step 1/3: Approve ${tokenIn} for Permit2 in your wallet…`);
      const tokenMeta = getToken(tokenIn, true);
      const approveAmount =
        approvalMode === "unlimited"
          ? maxUint256
          : parseUnits(amount.trim(), tokenMeta.decimals);
      const approveData = encodeFunctionData({
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        args: [ARC_PERMIT2_CONTRACT as Address, approveAmount],
      });
      if (!canUseQuote(activeQuote)) return;
      const approveTxHash = String(
        await provider.request({
          method: "eth_sendTransaction",
          params: [{ chainId: meta.chainIdHex, from: account, to: tokenMeta.address, data: approveData, value: "0x0" }],
        }),
      );
      setNotice(`Waiting for ${tokenIn} approval confirmation (${approveTxHash.slice(0, 10)}…)…`);
      const approveReceipt = await arcPublicClient(true).waitForTransactionReceipt({
        hash: approveTxHash as `0x${string}`,
        timeout: 90_000,
      });
      if (approveReceipt.status !== "success") {
        throw new Error(`${tokenIn} approval reverted on Arc Mainnet.`);
      }
      setNeedsTokenApproval(false);
      setNotice("Approval confirmed. Refreshing the quote…");
      const refreshedQuote = await fetchMainnetQuotePayload(account);
      setQuote(refreshedQuote);
      setNotice("Approval confirmed. Review the refreshed quote before swapping.");
      return;
    }

    // Step 2: Permit2 EIP-712 Signature (if required by Uniswap quote)
    if (!canUseQuote(activeQuote)) return;
    let signature: string | undefined;
    if (activeQuote.permitData) {
      setFlowStep("signing");
      setNotice("Sign Permit2 authorization in your wallet (gasless)…");
      const permitData = activeQuote.permitData;
      if (!isRecord(permitData.domain) || !isRecord(permitData.types) || !isRecord(permitData.values)) {
        throw new Error("The quote returned malformed Permit2 typed data. Request a new quote.");
      }
      const typedData = {
        domain: permitData.domain,
        types: permitData.types,
        primaryType: "PermitSingle",
        message: permitData.values,
      };
      const signed = await provider.request({
        method: "eth_signTypedData_v4",
        params: [account, JSON.stringify(typedData)],
      });
      if (typeof signed !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(signed)) {
        throw new Error("The wallet did not return a valid 65-byte Permit2 signature.");
      }
      signature = signed;
    }

    // Step 3: Prepare & validate calldata on server
    if (!canUseQuote(activeQuote)) return;
    setFlowStep("preparing");
    const response = await fetch("/api/uniswap/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteSession: activeQuote.quoteSession,
        ...(signature ? { signature } : {}),
      }),
      cache: "no-store",
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok || !isRecord(data)) {
      if (isRecord(data) && isRecord(data.approvalTransaction)) {
        const appTx = data.approvalTransaction;
        setPendingApproval({
          chainId: Number(appTx.chainId || 5042),
          from: String(appTx.from || account),
          to: String(appTx.to || ""),
          data: String(appTx.data || ""),
          value: String(appTx.value || "0"),
          spender: String(appTx.spender || ""),
          amount: String(appTx.amount || ""),
        });
        setNeedsTokenApproval(true);
        throw new Error("Permit2 ERC-20 approval is required first. Click 'Approve' below.");
      }
      const message = isRecord(data) && typeof data.detail === "string"
        ? data.detail
        : isRecord(data) && typeof data.error === "string"
          ? data.error
          : "Mainnet transaction preparation failed. Request a fresh quote.";
      throw new Error(message);
    }
    if (
      data.ok !== true ||
      typeof data.executionEnabled !== "boolean" ||
      !isRecord(data.transaction) ||
      Number(data.chainId) !== 5042 ||
      Number(data.transaction.chainId) !== 5042 ||
      String(data.transaction.from || "").toLowerCase() !== account.toLowerCase()
    ) {
      throw new Error("The server did not return a valid unsigned Arc Mainnet transaction.");
    }

    const txObj = {
      chainId: 5042,
      from: String(data.transaction.from),
      to: String(data.transaction.to),
      data: String(data.transaction.data || ""),
      value: String(data.transaction.value || "0"),
      gasLimit: String(data.transaction.gasLimit || ""),
      maxFeePerGas: typeof data.transaction.maxFeePerGas === "string" ? data.transaction.maxFeePerGas : undefined,
      maxPriorityFeePerGas: typeof data.transaction.maxPriorityFeePerGas === "string" ? data.transaction.maxPriorityFeePerGas : undefined,
      gasPrice: typeof data.transaction.gasPrice === "string" ? data.transaction.gasPrice : undefined,
    };

    if (!data.executionEnabled) {
      const validation = isRecord(data.validation) ? data.validation : undefined;
      setPrepared({
        executionEnabled: false,
        receiptVerificationTicket: typeof data.receiptVerificationTicket === "string" ? data.receiptVerificationTicket : undefined,
        transaction: txObj,
        validation: validation ? {
          estimatedGas: typeof validation.estimatedGas === "string" ? validation.estimatedGas : undefined,
          estimatedGasCost: typeof validation.estimatedGasCost === "string" ? validation.estimatedGasCost : undefined,
          minimumAmountOut: typeof validation.minimumAmountOut === "string" ? validation.minimumAmountOut : undefined,
          commandNames: Array.isArray(validation.commandNames) ? validation.commandNames.filter((v): v is string => typeof v === "string") : undefined,
        } : undefined,
      });
      setNotice("Unsigned Mainnet transaction prepared and validated (read-only mode).");
      return;
    }

    // Step 4: Immediately prompt wallet to sign & broadcast the swap!
    setFlowStep("broadcasting");
    setNotice("Confirm the swap transaction in your wallet…");
    const gasHex = txObj.gasLimit ? `0x${BigInt(txObj.gasLimit).toString(16)}` : undefined;
    const rawValue = txObj.value || "0";
    const valueHex = rawValue && rawValue !== "0" && rawValue !== "0x0"
      ? (rawValue.startsWith("0x") ? rawValue : `0x${BigInt(rawValue).toString(16)}`)
      : "0x0";
    const txParams: Record<string, string> = {
      chainId: meta.chainIdHex,
      from: account,
      to: txObj.to,
      data: txObj.data,
      value: valueHex,
    };
    if (gasHex) txParams.gas = gasHex;
    if (!canUseQuote(activeQuote)) return;

    const txHash = String(
      await provider.request({
        method: "eth_sendTransaction",
        params: [txParams],
      }),
    );

    setNotice(`Swap broadcast (${txHash.slice(0, 10)}…). Waiting for Arc Mainnet confirmation…`);
    const receipt = await arcPublicClient(true).waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      timeout: 90_000,
    });
    if (receipt.status !== "success") {
      throw new Error(`Swap transaction reverted on Arc Mainnet (${txHash}).`);
    }

    const receiptTicket = typeof data.receiptVerificationTicket === "string" ? data.receiptVerificationTicket : undefined;
    if (receiptTicket) {
      const verifyRes = await fetch("/api/uniswap/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptVerificationTicket: receiptTicket,
          transactionHash: txHash,
        }),
        cache: "no-store",
      });
      const verifyData: unknown = await verifyRes.json().catch(() => null);
      if (!verifyRes.ok || !isRecord(verifyData) || verifyData.ok !== true) {
        throw new Error(
          isRecord(verifyData) && typeof verifyData.detail === "string"
            ? verifyData.detail
            : "Swap confirmed on-chain, but receipt verification failed.",
        );
      }
    }

    const txId = uid("tx");
    addTransaction({
      id: txId,
      type: "swap",
      status: "success",
      amount,
      token: tokenIn,
      tokenOut,
      fromChain: "Arc_Mainnet",
      toChain: "Arc_Mainnet",
      feeUsd: Number(activeQuote.estimatedGasUsd || 0.01),
      txHash,
      explorerUrl: explorerTxUrl(txHash, 5042),
      createdAt: new Date().toISOString(),
      message: `Swapped ${amount} ${tokenIn} → ${activeQuote.amountOut || ""} ${tokenOut} on Arc Mainnet`,
      executionMode: "live",
      steps: [
        { name: "Quote & Permit2", state: "success" },
        { name: "Broadcast Swap", state: "success", txHash },
        { name: "Arc Mainnet Finality", state: "success", txHash },
      ],
    });
    setActiveTx(txId);
    onDraftSubmitted?.();
    setPrepared(null);
    setQuote(null);
    setNotice(`✅ Swap confirmed on Arc Mainnet! Tx: ${txHash.slice(0, 14)}…`);
  }

  function canUseQuote(candidate = quote) {
    if (!candidate || !quoteHasExpired(candidate.quoteSessionExpiresAt, Date.now())) return true;
    setExpiredQuote(candidate);
    setError("This quote expired. Refresh it and review the new rate.");
    return false;
  }

  async function swap() {
    if (!quote) {
      await getQuote();
      return;
    }
    if (!canUseQuote()) return;
    if (!walletAddress) {
      setError("Connect your wallet before swapping.");
      return;
    }
    if (slippageBps === null) {
      setError("Slippage must be between 0.1% and 5%.");
      return;
    }

    setSwapBusy(true);
    setThinking(true);
    setError(null);
    setNotice(null);
    try {
      if (meta.isMainnet) {
        await executeGuidedMainnetSwap();
        return;
      }
      const tx = await executeSwap({ amount, tokenIn, tokenOut, chain: "Arc_Testnet", slippageBps });
      addTransaction(tx);
      if (tx.txHash || tx.status === "success") onDraftSubmitted?.();
      setActiveTx(tx.id);
      if (tx.status === "success") {
        setAmount("0");
        setQuote(null);
        setNotice(tx.message || "Swap confirmed on-chain!");
      } else if (tx.status === "retryable") {
        setAmount("0");
        setQuote(null);
        setNotice(tx.message || "Swap submitted to Arc Testnet. Finality is confirming in the background.");
      } else {
        setError(tx.message || "Swap failed.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Swap failed.");
    } finally {
      setFlowStep("idle");
      setSwapBusy(false);
      setThinking(false);
    }
  }

  const minOutput = quote?.minimumAmountOut || (quote?.amountOut ? minimumReceived(quote.amountOut, slippage) : "—");
  const rate = quoteExpired ? null : formatSwapRate(amount, quote?.amountOut);
  const receiveStatus = rate ? `1 ${tokenIn} ≈ ${rate} ${tokenOut}`
    : quoteExpired ? "Quote expired"
    : quoteBusy ? "Getting quote…"
    : error ? "Quote unavailable"
    : walletAddress ? "Get a quote to see the rate"
    : "Connect wallet to get a quote";

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {initialPlan && <p className="text-xs text-muted-foreground">Assistant draft · {meta.name}. Review the token pair and quote.</p>}
      {!embedded && <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-accent">{meta.name} Swap</p>
        <Badge variant="outline" className="shrink-0">{meta.isMainnet ? "Uniswap routing" : "USDC / EURC"}</Badge>
      </div>}

      <div className="space-y-2">
        {/* You pay module */}
        <div className="uniswap-glass-module p-3.5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">You pay</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={amount}
              disabled={quoteBusy || swapBusy}
              onChange={(e) => {
                setAmount(e.target.value);
                setQuote(null);
                setPrepared(null);
                setError(null);
                setNotice(null);
              }}
              placeholder="0.0"
              className="h-11 w-full bg-transparent font-sans text-3xl font-semibold tabular-nums text-white outline-none placeholder:text-muted-foreground/30"
              aria-label="Amount to pay"
            />
            <div className="relative shrink-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                <TokenMark token={tokenIn} size={20} />
              </span>
              <select
                aria-label="Token to pay"
                value={tokenIn}
                disabled={quoteBusy || swapBusy}
                onChange={(e) => {
                  setTokenIn(e.target.value as ArcSwapToken);
                  setQuote(null);
                  setPrepared(null);
                  setError(null);
                  setNotice(null);
                }}
                className="h-10 rounded-full border border-white/[0.12] bg-white/[0.08] hover:bg-white/[0.14] pl-9 pr-4 text-sm font-semibold text-white shadow-md  focus:border-accent focus:outline-none transition-colors cursor-pointer"
              >
                {ARC_SWAP_TOKENS.map((token) => (
                  <option key={token} value={token} className="bg-card text-white">
                    {token}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Center floating flip button */}
        <div className="relative -my-2.5 z-10 flex justify-center">
          <button
            type="button"
            disabled={quoteBusy || swapBusy}
            onClick={flip}
            className="grid h-9 w-9 place-items-center rounded-2xl border border-white/[0.12] bg-card text-muted-foreground   transition-colors hover:border-accent/50 hover:bg-card hover:text-accent disabled:opacity-50"
            aria-label="Reverse swap direction"
          >
            <ArrowDownUp className="h-4 w-4" />
          </button>
        </div>

        {/* You receive module */}
        <div className="uniswap-glass-module p-3.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
            <span className="font-medium text-muted-foreground">You receive</span>
            <span role="status" className={rate ? "font-mono text-muted-foreground tabular-nums" : "text-muted-foreground"}>
              {receiveStatus}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-full items-center font-sans text-3xl font-semibold tabular-nums text-white">
              {quoteBusy ? (
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              ) : (
                <span className="truncate">{quoteExpired ? "—" : quote?.amountOut || "—"}</span>
              )}
            </div>
            <div className="relative shrink-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                <TokenMark token={tokenOut} size={20} />
              </span>
              <select
                aria-label="Token to receive"
                value={tokenOut}
                disabled={quoteBusy || swapBusy}
                onChange={(e) => {
                  setTokenOut(e.target.value as ArcSwapToken);
                  setQuote(null);
                  setPrepared(null);
                  setError(null);
                  setNotice(null);
                }}
                className="h-10 rounded-full border border-white/[0.12] bg-white/[0.08] hover:bg-white/[0.14] pl-9 pr-4 text-sm font-semibold text-white shadow-md  focus:border-accent focus:outline-none transition-colors cursor-pointer"
              >
                {ARC_SWAP_TOKENS.map((token) => (
                  <option key={token} value={token} className="bg-card text-white">
                    {token}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Slippage & Route Settings */}
        <div className="swap-settings py-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-medium text-muted-foreground">Slippage tolerance</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {SLIPPAGE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={quoteBusy || swapBusy}
                  onClick={() => updateSlippage(preset)}
                  aria-pressed={slippage === preset}
                  className={`min-h-11 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    slippage === preset
                      ? "border border-accent/40 bg-accent/15 text-accent shadow-xs"
                      : "border border-transparent bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <Input
              type="number"
              min="0.1"
              max="5"
              step="0.1"
              inputMode="decimal"
              value={slippage}
              disabled={quoteBusy || swapBusy}
              onChange={(e) => updateSlippage(e.target.value)}
              className="h-8 w-20 text-center text-xs"
              aria-label="Custom slippage percentage"
            />
            <span className="text-xs text-muted-foreground">%</span>
            <span className="ml-auto text-xs text-muted-foreground font-mono">Range: 0.1%–5%</span>
          </div>
        </div>
      </div>

      {quote && !quoteExpired && (
        <SwapQuoteSummaryCard
          quote={quote}
          tokenIn={tokenIn}
          tokenOut={tokenOut}
          minOutput={minOutput}
          slippage={slippage}
          isMainnet={meta.isMainnet}
          needsTokenApproval={needsTokenApproval}
          approvalMode={approvalMode}
          swapBusy={swapBusy}
          onApprovalModeChange={setApprovalMode}
        />
      )}

      {pendingApproval && !quoteExpired && (
        <SwapPendingApprovalCard
          pendingApproval={pendingApproval}
          swapBusy={swapBusy}
          onApprove={() => void approvePermit2InWallet()}
        />
      )}

      {prepared && !quoteExpired && (
        <SwapPreparedTxCard
          prepared={prepared}
          swapBusy={swapBusy}
          onExecute={() => void executePreparedMainnetSwap()}
        />
      )}

      {notice && <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2.5 text-xs leading-relaxed text-cyan-200">{notice}</div>}
      {error && <div className="rounded-xl border border-red-400/15 bg-red-400/[0.04] px-3 py-2.5 text-xs leading-relaxed text-red-200 whitespace-pre-wrap">{error}</div>}

      {!walletAddress ? (
        <Button size="lg" data-wallet-connect className="w-full h-12 rounded-xl text-base font-medium" onClick={openConnectModal}>Connect wallet</Button>
      ) : !quote && <Button size="lg" className="w-full h-12 rounded-xl text-base font-medium" disabled={!canQuote || quoteBusy || swapBusy} onClick={() => void getQuote()}>{quoteBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Getting quote…</> : "Get quote"}</Button>}

      {quoteExpired && (
        <div className="space-y-2">
          <p role="status" className="text-sm text-warning">This quote expired. Refresh to get the current rate.</p>
          <Button data-assistant-refresh-quote type="button" className="w-full" disabled={quoteBusy || swapBusy || !canQuote} onClick={() => void getQuote()}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" /> Refresh quote
          </Button>
        </div>
      )}

      {quote && !quoteExpired && (
        <div className="space-y-2">
          <Button size="lg" className="w-full h-12 rounded-2xl text-base font-medium " disabled={swapBusy || !walletAddress || !!prepared} onClick={() => void swap()}>
            {swapBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {flowStep === "approving"
                  ? `Approving ${tokenIn}…`
                  : flowStep === "signing"
                    ? "Signing Permit2…"
                    : flowStep === "preparing"
                      ? "Validating route…"
                      : flowStep === "broadcasting"
                        ? "Confirming swap…"
                        : "Confirming in wallet…"}
              </>
            ) : meta.isMainnet ? (
              needsTokenApproval ? `Approve ${tokenIn}` : "Confirm & Swap"
            ) : (
              "Confirm Swap"
            )}
          </Button>
          <Button type="button" variant="outline" className="w-full text-xs h-9" disabled={swapBusy} onClick={() => void getQuote()}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />Refresh Quote
          </Button>
          {meta.isMainnet && (
            <p className="text-center text-xs text-slate-500">Secured by Uniswap Universal Router 2.1.2 &amp; Permit2 on Arc Mainnet.</p>
          )}
        </div>
      )}
    </div>
  );
}
