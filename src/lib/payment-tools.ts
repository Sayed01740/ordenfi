export type PaymentChain = "Arc_Mainnet" | "Arc_Testnet";
export type PaymentRequest = { amount: string; to: string; memo: string; chain: PaymentChain };

export function paymentChain(walletChainId: number | null, mode: "mainnet" | "testnet"): PaymentChain {
  return walletChainId === 5042 || (walletChainId !== 5042002 && mode === "mainnet") ? "Arc_Mainnet" : "Arc_Testnet";
}

export function isPaymentAddress(to: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(to) && !/^0x0{40}$/i.test(to);
}

export function validateUsdcAmount(amount: string) {
  if (!/^\d+(\.\d{1,6})?$/.test(amount) || !Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error("Enter a positive USDC amount with up to 6 decimals.");
}

export function validatePayment(amount: string, to: string) {
  if (!isPaymentAddress(to)) throw new Error("Enter a valid receiving address.");
  validateUsdcAmount(amount);
}

export function createPaymentLink(origin: string, request: PaymentRequest) {
  validatePayment(request.amount, request.to);
  const url = new URL("/app", origin);
  url.searchParams.set("pay", new URLSearchParams(request).toString());
  return url.toString();
}

export function parsePaymentRequest(search: string): PaymentRequest | null {
  const raw = new URLSearchParams(search).get("pay");
  if (!raw) return null;
  const query = new URLSearchParams(raw);
  const chain = query.get("chain");
  if (chain !== "Arc_Mainnet" && chain !== "Arc_Testnet") throw new Error("Payment request has an unsupported or missing network. Ask for a new link.");
  const request = { amount: query.get("amount") || "", to: query.get("to") || "", memo: query.get("memo") || "Payment request", chain };
  validatePayment(request.amount, request.to);
  return request as PaymentRequest;
}

/** Stops on the first uncertain result; callers retain the attempt to prevent accidental replay. */
export async function runPaymentBatch<T>(rows: readonly T[], send: (row: T, index: number) => Promise<{ status: string; message?: string }>) {
  let confirmed = 0;
  for (let index = 0; index < rows.length; index++) {
    try {
      const tx = await send(rows[index], index);
      if (tx.status !== "success") return { confirmed, complete: false, stoppedAt: index, error: tx.message || `Transfer ${tx.status}. Check activity before sending again.` };
      confirmed++;
    } catch (error) {
      return { confirmed, complete: false, stoppedAt: index, error: error instanceof Error ? error.message : "Transfer failed" };
    }
  }
  return { confirmed, complete: true };
}
