"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useId } from "react";
import { LayoutDashboard, LineChart, LogOut, Wallet } from "lucide-react";
import { cn, shortenAddress } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/logo";
import { ChainMark } from "@/components/brand/chain-mark";
import { usePilotStore } from "@/store/pilot-store";
import { useWallet } from "@/providers/wallet-provider";
import { getArcNetworkMeta } from "@/lib/arc-chain";
import { formatUsdc } from "@/lib/fees";

const links = [
  { href: "/app", label: "Workspace", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: LineChart },
];
const focusClass = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:transform-none";
const panelClass = "absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100dvw-2rem))] rounded-2xl border border-border bg-card p-2 text-card-foreground  max-h-[calc(100dvh-9rem)] overflow-y-auto";

export function Navbar() {
  const pathname = usePathname();
  const { walletAddress, walletChainId, liveBalanceUsdc, transactions } = usePilotStore();
  const {
    connect,
    disconnect,
    connecting,
    switchToArcMainnet,
    switchToArcTestnet,
  } = useWallet();
  const currentMeta = getArcNetworkMeta(walletChainId);
  const [openMenu, setOpenMenu] = useState<"wallet" | null>(null);
  const walletRef = useRef<HTMLDivElement>(null);
  const walletId = useId();

  useEffect(() => {
    if (!openMenu) return;
    const container = walletRef.current;
    function dismissOutside(event: Event) {
      if (event.target instanceof Node && !container?.contains(event.target)) setOpenMenu(null);
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      setOpenMenu(null);
      container?.querySelector<HTMLButtonElement>("button")?.focus();
    }
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [openMenu]);

  useEffect(() => { setOpenMenu(null); }, [pathname]);

  const isActive = (href: string) => pathname === href || (href === "/app" && (pathname === "/dashboard" || pathname === "/welcome")) || pathname.startsWith(`${href}/`);
  async function onWalletClick() { if (walletAddress) disconnect(); else await connect(); }
  function closeMenu() {
    const container = walletRef.current;
    setOpenMenu(null);
    container?.querySelector<HTMLButtonElement>("button")?.focus();
  }

  return <>
    <header className="app-navbar sticky top-0 z-50 text-foreground">
      <div className="mx-auto grid min-h-16 w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 md:flex md:justify-between sm:px-6">
        <Link href="/" className={cn("group flex min-h-11 min-w-11 items-center gap-2.5 justify-self-start rounded-lg", focusClass)} aria-label="Ordenfi home" aria-current={pathname === "/" ? "page" : undefined} onClick={() => setOpenMenu(null)}>
          <BrandLogo variant="icon" height={38} priority className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
          <div className="min-w-0 leading-tight">
            <div className="ordenfi-wordmark">Ordenfi</div>
          </div>
        </Link>

        <nav aria-label="Primary" className="ordenfi-nav hidden md:flex">
          {links.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} onClick={() => setOpenMenu(null)} className={cn("ordenfi-nav-link", focusClass)}>
              <Icon aria-hidden="true" className="relative h-3.5 w-3.5" /><span className="relative font-medium">{link.label}</span>
            </Link>;
          })}
        </nav>

        <div className="flex shrink-0 items-center">
          {walletAddress ? <div className="relative" ref={walletRef}>
            <Button variant="outline" type="button" onClick={() => setOpenMenu(openMenu === "wallet" ? null : "wallet")} aria-label={`Wallet options for ${shortenAddress(walletAddress)}`} aria-expanded={openMenu === "wallet"} aria-controls={walletId} className={cn("min-h-11 gap-2 rounded-xl border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08]  px-3 text-foreground", focusClass, openMenu === "wallet" && "bg-muted")}>
              <span className={cn("h-2 w-2 rounded-full", currentMeta.isMainnet ? "bg-emerald-400" : currentMeta.isTestnet ? "bg-cyan-400" : "bg-amber-400")} />
              <Wallet aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" /><span className="font-mono text-xs font-medium sm:text-sm">{shortenAddress(walletAddress)}</span>
            </Button>
            <div id={walletId} hidden={openMenu !== "wallet"} className={cn(panelClass, "max-w-72 ")}>
              <dl aria-label="Account overview" className="space-y-4 border-b border-border px-3 pb-4 pt-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Available balance</dt>
                  <dd className="mt-1 text-xl font-medium tabular-nums text-foreground">{liveBalanceUsdc !== null ? formatUsdc(Number(liveBalanceUsdc)) : "— USDC"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Account</dt>
                  <dd className="mt-1 break-all font-mono text-xs leading-relaxed text-foreground">{walletAddress}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs text-muted-foreground">Recent activity</dt>
                  <dd className="text-sm tabular-nums text-foreground">{transactions.length} {transactions.length === 1 ? "transaction" : "transactions"}</dd>
                </div>
              </dl>
              <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
                <span>Network</span>
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold",
                  currentMeta.isMainnet
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : currentMeta.isTestnet
                    ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                )}>
                  {currentMeta.isArc && <ChainMark chain={currentMeta.name} compact size={14} />}
                  {currentMeta.name}
                </span>
              </div>

              {/* Quick switch between Mainnet and Testnet */}
              <div className="mx-1 my-1 flex gap-1 rounded-xl bg-muted/60 p-1">
                <button
                  type="button"
                  onClick={() => { void switchToArcMainnet(); closeMenu(); }}
                  className={cn(
                    "flex-1 rounded-lg py-1 text-xs font-medium transition-colors",
                    currentMeta.isMainnet
                      ? "bg-emerald-500/20 text-emerald-300 font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Arc Mainnet
                </button>
                <button
                  type="button"
                  onClick={() => { void switchToArcTestnet(); closeMenu(); }}
                  className={cn(
                    "flex-1 rounded-lg py-1 text-xs font-medium transition-colors",
                    currentMeta.isTestnet
                      ? "bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Arc Testnet
                </button>
              </div>

              <div className="my-1 h-px bg-border" />
              <Button variant="ghost" size="sm" type="button" onClick={() => { void navigator.clipboard.writeText(walletAddress); closeMenu(); }} className={cn("min-h-11 w-full justify-start gap-2.5 rounded-xl text-foreground", focusClass)}><Wallet aria-hidden="true" className="h-4 w-4 text-muted-foreground" /> Copy address</Button>
              <div className="my-1 h-px bg-border" />
              <Button variant="ghost" size="sm" type="button" onClick={() => { void onWalletClick(); closeMenu(); }} className={cn("min-h-11 w-full justify-start gap-2.5 rounded-xl text-danger hover:bg-danger/10", focusClass)}><LogOut aria-hidden="true" className="h-4 w-4" /> Disconnect</Button>
            </div>
          </div> : <Button variant="default" size="sm" type="button" onClick={() => { setOpenMenu(null); void onWalletClick(); }} className={cn("min-h-10 sm:min-h-11 gap-2 rounded-xl border-accent/40 bg-accent px-4 font-semibold text-accent-foreground  hover:bg-accent/90", focusClass)} disabled={connecting} title="Connect MetaMask, Rabby, Coinbase, Brave...">
            <Wallet aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="font-semibold" role="status">
              {connecting ? "Connecting..." : <><span className="sm:hidden">Connect</span><span className="hidden sm:inline">Connect wallet</span></>}
            </span>
          </Button>}
        </div>
      </div>
    </header>
    <nav aria-label="Primary mobile" className="ordenfi-nav-mobile fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="grid gap-0.5 px-1 py-1.5" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
        {links.map((link) => {
          const active = isActive(link.href);
          const Icon = link.icon;
          return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} onClick={() => setOpenMenu(null)} className={cn("flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-xs font-semibold transition-colors", focusClass, active ? "bg-accent/10 text-accent ring-1 ring-accent/30" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon aria-hidden="true" className="h-4 w-4" /><span>{link.label}</span></Link>;
        })}
      </div>
    </nav>
  </>;
}
