"use client";

import type { FeeQuote } from "@/lib/fees";
import { formatUsdc } from "@/lib/fees";
import { cn } from "@/lib/utils";

export function FeeLineItems({
  quote,
  compact,
  className,
}: {
  quote: FeeQuote;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5 space-y-2",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-accent">
          Fee line item · USDC gas
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {quote.headline}
        </span>
      </div>
      {!compact && (
        <ul className="space-y-1">
          {quote.lineItems.map((line) => (
            <li
              key={line.id}
              className="flex justify-between gap-2 text-xs text-muted-foreground"
            >
              <span>
                {line.label}
                {line.note ? (
                  <span className="block text-xs text-muted-foreground/80">
                    {line.note}
                  </span>
                ) : null}
              </span>
              <span className="tabular-nums text-foreground shrink-0">
                {formatUsdc(line.amountUsdc)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-500 leading-relaxed">{quote.tip}</p>
    </div>
  );
}
