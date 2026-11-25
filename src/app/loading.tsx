export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background p-6 text-foreground">
      <div className="mx-auto w-full max-w-7xl animate-pulse motion-reduce:animate-none space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card/60 px-5 py-4">
          <div className="h-6 w-40 rounded-lg bg-muted" />
          <div className="flex gap-3">
            <div className="h-8 w-24 rounded-xl bg-muted" />
            <div className="h-8 w-32 rounded-xl bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="h-[460px] rounded-2xl border border-border bg-card/60 lg:col-span-5" />
          <div className="h-[460px] rounded-2xl border border-border bg-card/60 lg:col-span-7" />
        </div>
      </div>
    </div>
  );
}
