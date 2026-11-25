import { describe, expect, it } from "vitest";
import { BATCH_RECIPIENT_LIMIT, buildBatchReportCsv, buildUnsentCsv, parseBatchImport, reviewBatchRows, type BatchOutcome } from "./batch-import";

const one = "0x1111111111111111111111111111111111111111";
const two = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("batch file import", () => {
  it("reads reordered CSV headers, UTF-8 BOM, quoted commas and escaped quotes", () => {
    expect(parseBatchImport(`\ufefflabel,amount,address\r\n"Team, ""East""",0.000001,${one}\r\n`)).toEqual([
      { label: 'Team, "East"', amountUsdc: "0.000001", address: one },
    ]);
  });

  it("imports tab-separated rows and preserves invalid values for review", () => {
    const rows = parseBatchImport(`wallet_address\tamount_usdc\n${one}\t4.2\nwrong\t1`);
    expect(rows).toHaveLength(2);
    expect(reviewBatchRows(rows)).toMatchObject({ total: "4.2", issues: [{ index: 1, field: "address" }] });
  });

  it("rejects malformed files instead of silently skipping rows", () => {
    expect(() => parseBatchImport(`address,amount,label\n${one},1,"broken`)).toThrow(/quote/i);
    expect(() => parseBatchImport(`address,amount,label\n${one},1`)).toThrow(/row 2/i);
    expect(() => parseBatchImport(`address,amount,status\n${one},1,confirmed`)).toThrow(/column/i);
    expect(() => parseBatchImport(`address,amount\n${`${one},1\n`.repeat(BATCH_RECIPIENT_LIMIT + 1)}`)).toThrow(/limit/i);
  });

  it("blocks duplicate recipients and preserves 6-decimal totals exactly", () => {
    const rows = parseBatchImport(`address,amount\n${two},0.000001\n0x${"A".repeat(40)},0.3\n${one},0.7`);
    const result = reviewBatchRows(rows);
    expect(result.total).toBe("1.000001");
    expect(result.issues.map(issue => issue.index)).toEqual([0, 1]);
  });
});

describe("batch reports", () => {
  const rows = parseBatchImport(`label,address,amount\n=FORMULA(),${one},1\nUnsent,${two},2`);
  const outcomes: BatchOutcome[] = [{ status: "needs_review", detail: "Wallet disconnected" }, { status: "queued" }];

  it("keeps attempted payments out of the reimportable unsent file", () => {
    expect(parseBatchImport(buildUnsentCsv(rows, outcomes))).toEqual([rows[1]]);
  });

  it("escapes spreadsheet formula prefixes in a report", () => {
    const csv = buildBatchReportCsv("=Payroll", "Arc_Testnet", rows, outcomes);
    expect(csv).toContain('"\'=Payroll"');
    expect(csv).toContain('"\'=FORMULA()"');
    expect(csv).toContain('"needs_review"');
  });
});
