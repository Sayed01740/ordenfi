import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-card px-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-7 text-center  ">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-400">
          <Compass className="h-6 w-6" />
        </div>
        <p className="font-mono text-xs font-medium text-accent">
          404 · Route not found
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-white">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          The route you requested does not exist in Ordenfi.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
