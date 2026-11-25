"use client";

import { useId, useRef, useState } from "react";
import { Clipboard, Download, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BATCH_IMPORT_BYTES, BATCH_RECIPIENT_LIMIT, BATCH_TEMPLATE_CSV, parseBatchImport, reviewBatchRows } from "@/lib/batch-import";
import type { PayrollRecipient } from "@/types";

export function downloadBatchCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BatchFileImport({
  draftCount,
  onImport,
}: {
  draftCount: number;
  onImport: (rows: PayrollRecipient[], append: boolean) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const pasteId = useId();
  const [pasting, setPasting] = useState(false);
  const [paste, setPaste] = useState("");
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ name: string; rows: PayrollRecipient[] } | null>(null);

  function previewImport(content: string, name: string) {
    setError("");
    setPreview(null);
    try {
      setPreview({ name, rows: parseBatchImport(content) });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not read these payments.");
    }
  }

  async function readFile(file: File) {
    setReading(true);
    setError("");
    setPreview(null);
    try {
      if (!/\.(csv|tsv)$/i.test(file.name)) throw new Error("Choose a CSV or TSV file.");
      if (file.size > BATCH_IMPORT_BYTES) throw new Error("Use a CSV or TSV up to 256 KB.");
      previewImport(await file.text(), file.name);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not read this file.");
    } finally {
      setReading(false);
    }
  }

  function applyImport(append: boolean) {
    if (!preview) return;
    onImport(preview.rows, append);
    setPreview(null);
    setPaste("");
    setPasting(false);
  }

  const invalidCount = preview ? new Set(reviewBatchRows(preview.rows).issues.map(issue => issue.index)).size : 0;
  const canAppend = preview && draftCount + preview.rows.length <= BATCH_RECIPIENT_LIMIT;

  return (
    <div className="min-w-0 space-y-3">
      <div className="rounded-xl border border-border bg-background/60 p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
            <FileUp aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Import recipient list</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              CSV or TSV with address, amount and an optional label. Up to {BATCH_RECIPIENT_LIMIT} payments.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input ref={fileInput} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" hidden
            onChange={event => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void readFile(file);
            }}
          />
          <Button type="button" size="sm" variant="secondary" disabled={reading} onClick={() => fileInput.current?.click()}>
            {reading ? "Reading file…" : "Upload file"}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={reading} aria-expanded={pasting} aria-controls={pasteId} onClick={() => setPasting(value => !value)}>
            <Clipboard aria-hidden="true" className="size-3.5" /> Paste rows
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => downloadBatchCsv("ordenfi-batch-template.csv", BATCH_TEMPLATE_CSV)}>
            <Download aria-hidden="true" className="size-3.5" /> CSV template
          </Button>
        </div>
        <div hidden={!pasting} id={pasteId} className="mt-3 space-y-2">
          <label className="block text-xs font-medium" htmlFor={`${pasteId}-text`}>Paste CSV or TSV, including the header</label>
          <textarea
            id={`${pasteId}-text`}
            className="min-h-24 w-full rounded-lg border border-border bg-background p-2 font-mono text-xs focus-visible:outline-2 focus-visible:outline-accent"
            placeholder="address,amount,label"
            spellCheck={false}
            value={paste}
            onChange={event => setPaste(event.target.value)}
          />
          <Button type="button" size="sm" variant="outline" disabled={!paste.trim() || reading} onClick={() => previewImport(paste, "Pasted rows")}>Preview rows</Button>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {preview && (
        <div className="space-y-2 rounded-xl border border-accent/25 bg-accent/5 p-3">
          <div role="status">
            <p className="break-all text-sm font-medium">{preview.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {preview.rows.length} {preview.rows.length === 1 ? "payment" : "payments"} found
              {invalidCount > 0 && ` · ${invalidCount} ${invalidCount === 1 ? "row needs" : "rows need"} corrections`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => applyImport(false)}>
              {draftCount ? "Replace draft" : "Import payments"}
            </Button>
            {draftCount > 0 && <Button type="button" size="sm" variant="outline" disabled={!canAppend} onClick={() => applyImport(true)}>Append payments</Button>}
            <Button type="button" size="sm" variant="ghost" onClick={() => setPreview(null)}>Cancel import</Button>
          </div>
          {draftCount > 0 && !canAppend && <p className="text-xs text-muted-foreground">Appending would exceed {BATCH_RECIPIENT_LIMIT} payments.</p>}
        </div>
      )}
    </div>
  );
}
