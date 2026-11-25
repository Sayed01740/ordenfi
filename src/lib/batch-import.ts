import { formatUnits, isAddress, parseUnits } from "viem";
import type { PayrollRecipient } from "@/types";
import { isPaymentAddress, validateUsdcAmount, type PaymentChain } from "@/lib/payment-tools";

export const BATCH_RECIPIENT_LIMIT = 200;
export const BATCH_IMPORT_BYTES = 256 * 1024;
export const BATCH_TEMPLATE_CSV = "address,amount,label\r\n,,\r\n";
const MAX_NATIVE_VALUE = (1n << 256n) - 1n;

export type BatchOutcome = {
  status: "queued" | "awaiting_wallet" | "confirmed" | "failed" | "needs_review";
  hash?: string;
  detail?: string;
};
export type BatchIssue = { index: number; field: keyof PayrollRecipient; message: string };

const headers = new Map<string, keyof PayrollRecipient>([
  ["address", "address"], ["wallet_address", "address"], ["recipient", "address"], ["recipient_address", "address"],
  ["amount", "amountUsdc"], ["amount_usdc", "amountUsdc"], ["usdc", "amountUsdc"],
  ["label", "label"], ["name", "label"],
]);

function readDelimited(text: string, delimiter: string) {
  const records: { cells: string[]; number: number }[] = [];
  let cells: string[] = [];
  let value = "";
  let quoted = false;
  let closed = false;
  let line = 1;
  let recordLine = 1;

  function finishCell() {
    cells.push(value.trim());
    value = "";
    closed = false;
  }
  function finishRecord() {
    finishCell();
    if (cells.some(Boolean)) records.push({ cells, number: recordLine });
    if (records.length > BATCH_RECIPIENT_LIMIT + 1) throw new Error(`The limit is ${BATCH_RECIPIENT_LIMIT} recipients per batch.`);
    cells = [];
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else if (quoted) { quoted = false; closed = true; }
      else if (!value.trim() && !closed) { value = ""; quoted = true; }
      else throw new Error(`Row ${recordLine} has an unexpected quote.`);
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      if (quoted) value += "\n";
      else finishRecord();
      line++;
      if (!quoted) recordLine = line;
    } else if (quoted) value += char;
    else if (char === delimiter) finishCell();
    else if (!closed) value += char;
    else if (char !== " ") throw new Error(`Row ${recordLine} has text after a closing quote.`);
  }
  if (quoted) throw new Error(`Row ${recordLine} has an unclosed quote.`);
  finishRecord();
  return records;
}

export function parseBatchImport(content: string): PayrollRecipient[] {
  if (content.length > BATCH_IMPORT_BYTES || new TextEncoder().encode(content).length > BATCH_IMPORT_BYTES) {
    throw new Error("Use a CSV or TSV smaller than 256 KB.");
  }
  const text = content.replace(/^\uFEFF/, "");
  if (text.includes("\0") || text.includes("\uFFFD")) throw new Error("Save the file as UTF-8 CSV or TSV and try again.");
  const headerLine = text.split(/\r\n|\r|\n/).find(line => line.trim()) ?? "";
  const records = readDelimited(text, headerLine.includes("\t") ? "\t" : ",");
  const [header, ...data] = records;
  if (!header) throw new Error("Include a header row with address and amount columns.");

  const fields = header.cells.map(column => {
    const key = headers.get(column.toLowerCase().replace(/\s+/g, "_"));
    if (!key) throw new Error(`Unexpected column “${column || "blank"}”. Use address, amount and an optional label.`);
    return key;
  });
  if (new Set(fields).size !== fields.length || !fields.includes("address") || !fields.includes("amountUsdc")) {
    throw new Error("Include one address column, one amount column and an optional label.");
  }
  if (!data.length) throw new Error("Add at least one payment below the header.");
  return data.map(({ cells, number }) => {
    if (cells.length !== fields.length) throw new Error(`Row ${number} has ${cells.length} columns. The header has ${fields.length}.`);
    const row: PayrollRecipient = { address: "", amountUsdc: "", label: "" };
    fields.forEach((key, column) => { row[key] = cells[column]; });
    return row;
  });
}

export function isBlankBatchRow(row: PayrollRecipient) {
  return !row.address.trim() && !row.amountUsdc.trim() && !row.label.trim();
}

export function reviewBatchRows(draft: readonly PayrollRecipient[]) {
  const issues: BatchIssue[] = [];
  const rows: PayrollRecipient[] = [];
  const firstAddressRow = new Map<string, number>();
  const duplicates = new Set<number>();
  let totalUnits = 0n;

  draft.forEach((row, index) => {
    if (isBlankBatchRow(row)) return;
    const address = row.address.trim();
    const amountUsdc = row.amountUsdc.trim();
    const label = row.label.trim();
    rows.push({ address, amountUsdc, label });
    if (label.length > 80) issues.push({ index, field: "label", message: "Use a label of up to 80 characters." });
    const mixedCase = /[A-F]/.test(address) && /[a-f]/.test(address);
    const addressValid = isPaymentAddress(address) && (!mixedCase || isAddress(address));
    if (!addressValid) {
      issues.push({ index, field: "address", message: "Enter a valid wallet address." });
    } else {
      const normalized = address.toLowerCase();
      const first = firstAddressRow.get(normalized);
      if (first !== undefined) {
        duplicates.add(first);
        duplicates.add(index);
      } else firstAddressRow.set(normalized, index);
    }
    try {
      validateUsdcAmount(amountUsdc);
      if (parseUnits(amountUsdc, 18) > MAX_NATIVE_VALUE) throw new Error("The amount is too large.");
      if (addressValid) totalUnits += parseUnits(amountUsdc, 6);
    } catch (error) {
      issues.push({ index, field: "amountUsdc", message: error instanceof Error ? error.message : "Enter a valid amount." });
    }
  });
  for (const index of duplicates) issues.push({ index, field: "address", message: "This address appears more than once. Combine the amounts or remove the extra row." });
  return { rows, issues, total: formatUnits(totalUnits, 6) };
}

function csvCell(value: string) {
  const literal = /^[\s]*[=+\-@\t\r\n]/u.test(value) ? `'${value}` : value;
  return `"${literal.replace(/"/g, '""')}"`;
}

function csv(headers: string[], rows: string[][]) {
  return [headers.join(","), ...rows.map(row => row.map(csvCell).join(","))].join("\r\n") + "\r\n";
}

export function buildBatchReportCsv(batch: string, chain: PaymentChain, rows: readonly PayrollRecipient[], outcomes: readonly BatchOutcome[]) {
  return csv(["batch", "network", "row", "address", "amount_usdc", "label", "status", "tx_hash", "details"], rows.map((row, i) => [
    batch, chain, String(i + 1), row.address, row.amountUsdc, row.label, outcomes[i]?.status ?? "needs_review", outcomes[i]?.hash ?? "", outcomes[i]?.detail ?? "",
  ]));
}

export function buildUnsentCsv(rows: readonly PayrollRecipient[], outcomes: readonly BatchOutcome[]) {
  return csv(["address", "amount", "label"], rows.flatMap((row, index) => outcomes[index]?.status === "queued" ? [[row.address, row.amountUsdc, row.label]] : []));
}
