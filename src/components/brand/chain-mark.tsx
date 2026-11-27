import { useId } from "react";
import { cn } from "@/lib/utils";

export type SupportedChainMark =
  | "Arc"
  | "Arc_Mainnet"
  | "Arc_Testnet"
  | "Base"
  | "Base_Sepolia"
  | "Arbitrum"
  | "Arbitrum_Sepolia"
  | "Ethereum"
  | "Ethereum_Sepolia"
  | "Optimism"
  | "Optimism_Sepolia"
  | "Avalanche"
  | "Avalanche_Fuji"
  | "Polygon"
  | "Polygon_Amoy"
  | "Polygon_Amoy_Testnet"
  | "Solana"
  | "Solana_Devnet"
  | "Unichain"
  | "Unichain_Sepolia"
  | "Linea"
  | "Linea_Sepolia"
  | "World_Chain"
  | "World_Chain_Sepolia"
  | "Sonic"
  | "Sonic_Testnet"
  | "Ink"
  | "Ink_Testnet"
  | "Monad"
  | "Monad_Testnet"
  | "Sei"
  | "Sei_Testnet"
  | "HyperEVM"
  | "HyperEVM_Testnet"
  | "XDC"
  | "XDC_Apothem";

type ChainFamily =
  | "arc"
  | "base"
  | "arbitrum"
  | "ethereum"
  | "optimism"
  | "avalanche"
  | "polygon"
  | "solana"
  | "unichain"
  | "linea"
  | "worldchain"
  | "sonic"
  | "ink"
  | "monad"
  | "sei"
  | "hyperevm"
  | "xdc";

const marks: Record<SupportedChainMark, { name: string; short: string; family: ChainFamily }> = {
  Arc: { name: "Arc Mainnet", short: "ARC", family: "arc" },
  Arc_Mainnet: { name: "Arc Mainnet", short: "ARC", family: "arc" },
  Arc_Testnet: { name: "Arc Testnet", short: "ARC", family: "arc" },
  Base: { name: "Base", short: "BASE", family: "base" },
  Base_Sepolia: { name: "Base Sepolia", short: "BASE", family: "base" },
  Arbitrum: { name: "Arbitrum", short: "ARB", family: "arbitrum" },
  Arbitrum_Sepolia: { name: "Arbitrum Sepolia", short: "ARB", family: "arbitrum" },
  Ethereum: { name: "Ethereum", short: "ETH", family: "ethereum" },
  Ethereum_Sepolia: { name: "Ethereum Sepolia", short: "ETH", family: "ethereum" },
  Optimism: { name: "Optimism", short: "OP", family: "optimism" },
  Optimism_Sepolia: { name: "Optimism Sepolia", short: "OP", family: "optimism" },
  Avalanche: { name: "Avalanche", short: "AVAX", family: "avalanche" },
  Avalanche_Fuji: { name: "Avalanche Fuji", short: "AVAX", family: "avalanche" },
  Polygon: { name: "Polygon", short: "POL", family: "polygon" },
  Polygon_Amoy: { name: "Polygon Amoy", short: "POL", family: "polygon" },
  Polygon_Amoy_Testnet: { name: "Polygon Amoy", short: "POL", family: "polygon" },
  Solana: { name: "Solana", short: "SOL", family: "solana" },
  Solana_Devnet: { name: "Solana Devnet", short: "SOL", family: "solana" },
  Unichain: { name: "Unichain", short: "UNI", family: "unichain" },
  Unichain_Sepolia: { name: "Unichain Sepolia", short: "UNI", family: "unichain" },
  Linea: { name: "Linea", short: "LINEA", family: "linea" },
  Linea_Sepolia: { name: "Linea Sepolia", short: "LINEA", family: "linea" },
  World_Chain: { name: "World Chain", short: "WLD", family: "worldchain" },
  World_Chain_Sepolia: { name: "World Chain Sepolia", short: "WLD", family: "worldchain" },
  Sonic: { name: "Sonic", short: "S", family: "sonic" },
  Sonic_Testnet: { name: "Sonic Testnet", short: "S", family: "sonic" },
  Ink: { name: "Ink", short: "INK", family: "ink" },
  Ink_Testnet: { name: "Ink Testnet", short: "INK", family: "ink" },
  Monad: { name: "Monad", short: "MON", family: "monad" },
  Monad_Testnet: { name: "Monad Testnet", short: "MON", family: "monad" },
  Sei: { name: "Sei", short: "SEI", family: "sei" },
  Sei_Testnet: { name: "Sei Testnet", short: "SEI", family: "sei" },
  HyperEVM: { name: "HyperEVM", short: "HYPE", family: "hyperevm" },
  HyperEVM_Testnet: { name: "HyperEVM Testnet", short: "HYPE", family: "hyperevm" },
  XDC: { name: "XDC", short: "XDC", family: "xdc" },
  XDC_Apothem: { name: "XDC Apothem", short: "XDC", family: "xdc" },
};

function ChainIcon({ family, size }: { family: ChainFamily; size: number }) {
  const uid = useId().replace(/:/g, "");
  const solGradId = `sol-grad-${uid}`;

  switch (family) {
    case "arc":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/brand/arc-logo.png"
          alt=""
          width={size}
          height={size}
          style={{ width: size, height: size }}
          className="block shrink-0 rounded-full object-cover"
        />
      );
    case "base":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <circle cx="16" cy="16" r="15" fill="#0052FF" />
          <path d="M16 6.8a9.2 9.2 0 1 1-9.05 10.8h9.05v-3.2H6.95A9.2 9.2 0 0 1 16 6.8Z" fill="#fff" />
        </svg>
      );
    case "ethereum":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <circle cx="16" cy="16" r="15" fill="#627EEA" />
          <path d="M16.25 6.5v6.95l5.88 2.63-5.88-9.58Z" fill="#fff" fillOpacity="0.6" />
          <path d="M16.25 6.5 10.37 16.08l5.88-2.63V6.5Z" fill="#fff" />
          <path d="M16.25 20.66v4.84l5.88-8.14-5.88 3.3Z" fill="#fff" fillOpacity="0.6" />
          <path d="M16.25 25.5v-4.84l-5.88-3.3 5.88 8.14Z" fill="#fff" />
          <path d="m16.25 19.56 5.88-3.48-5.88-2.63v6.11Z" fill="#fff" fillOpacity="0.2" />
          <path d="m10.37 16.08 5.88 3.48v-6.11l-5.88 2.63Z" fill="#fff" fillOpacity="0.6" />
        </svg>
      );
    case "arbitrum":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <path
            d="M16 2.2 28 9.1v13.8L16 29.8 4 22.9V9.1L16 2.2Z"
            fill="#213147"
            stroke="#96BEDC"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="m13.2 22.2 3.3-9.8 1.9 5.5-1.5 4.3h-3.7Z" fill="#28A0F0" />
          <path d="m17.5 10.2 4.6 12h-3l-3.1-8.2 1.5-3.8Z" fill="#fff" />
          <path d="m10.1 22.2 4.4-12h2.2l-4.2 12h-2.4Z" fill="#fff" />
        </svg>
      );
    case "optimism":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <circle cx="16" cy="16" r="15" fill="#FF0420" />
          <path
            d="M11.6 12.1c-2.3 0-3.8 1.6-3.8 4 0 2.3 1.4 3.9 3.6 3.9 2.3 0 3.8-1.6 3.8-4 0-2.3-1.4-3.9-3.6-3.9Zm-.1 6c-.9 0-1.4-.7-1.4-2.1 0-1.3.5-2.1 1.4-2.1s1.4.7 1.4 2.1c0 1.4-.5 2.1-1.4 2.1Zm9.6-5.9h-3.8l-1.4 7.7h2.3l.4-2.3h1.6c2.2 0 3.7-1.1 3.7-3 0-1.5-1.1-2.4-2.8-2.4Zm-.6 3.7h-1.2l.4-2h1c.7 0 1.1.3 1.1.9 0 .7-.5 1.1-1.3 1.1Z"
            fill="#fff"
          />
        </svg>
      );
    case "avalanche":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <circle cx="16" cy="16" r="15" fill="#E84142" />
          <path
            d="M19.8 16.4c.5-.8 1.2-.8 1.7 0l2.7 4.7c.4.8.1 1.4-.8 1.4h-5.5c-.9 0-1.2-.6-.8-1.4l2.7-4.7ZM14.8 8.3c.5-.8 1.2-.8 1.7 0l.8 1.5 1.9 3.5c.3.7.3 1.6 0 2.3l-3.8 6.5c-.4.6-1 .9-1.8.9H8.6c-.9 0-1.2-.6-.8-1.4l7-13.3Z"
            fill="#fff"
          />
        </svg>
      );
    case "polygon":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <circle cx="16" cy="16" r="15" fill="#8247E5" />
          <path
            d="M21 12.8c-.4-.2-.9-.2-1.3 0l-2.9 1.7-2 1.1-2.9 1.7c-.4.2-.9.2-1.3 0l-2.3-1.3c-.4-.2-.6-.6-.6-1.1v-2.6c0-.4.2-.9.6-1.1l2.3-1.3c.4-.2.9-.2 1.3 0l2.3 1.3c.4.2.6.6.6 1.1v1.7l2-1.1v-1.7c0-.4-.2-.9-.6-1.1l-4.2-2.4c-.4-.2-.9-.2-1.3 0L6.4 9.2c-.4.2-.6.7-.6 1.1v4.8c0 .4.2.9.6 1.1l4.2 2.4c.4.2.9.2 1.3 0l2.9-1.7 2-1.1 2.9-1.7c.4-.2.9-.2 1.3 0l2.3 1.3c.4.2.6.6.6 1.1V19c0 .4-.2.9-.6 1.1l-2.3 1.3c-.4.2-.9.2-1.3 0l-2.3-1.3c-.4-.2-.6-.6-.6-1.1v-1.7l-2 1.1v1.7c0 .4.2.9.6 1.1l4.2 2.4c.4.2.9.2 1.3 0l4.2-2.4c.4-.2.6-.7.6-1.1v-4.8c0-.4-.2-.9-.6-1.1L21 12.8Z"
            fill="#fff"
          />
        </svg>
      );
    case "solana":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <defs>
            <linearGradient id={solGradId} x1="8" y1="24" x2="24" y2="8" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#9945FF" />
              <stop offset="50%" stopColor="#19FB9B" />
              <stop offset="100%" stopColor="#00FFA3" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="15" fill="#0B1017" stroke={`url(#${solGradId})`} strokeWidth="1.4" />
          <path
            d="M9.6 20.8a.6.6 0 0 1 .4-.2h12.6c.3 0 .4.3.2.5l-2 2a.6.6 0 0 1-.4.2H7.8c-.3 0-.4-.3-.2-.5l2-2Zm0-11.6a.6.6 0 0 1 .4-.2h12.6c.3 0 .4.3.2.5l-2 2a.6.6 0 0 1-.4.2H7.8c-.3 0-.4-.3-.2-.5l2-2Zm11.2 5.7a.6.6 0 0 0-.4-.2H7.8c-.3 0-.4.3-.2.5l2 2c.1.1.3.2.4.2h12.6c.3 0 .4-.3.2-.5l-2-2Z"
            fill={`url(#${solGradId})`}
          />
        </svg>
      );
    case "unichain":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <circle cx="16" cy="16" r="15" fill="#F50DB4" />
          <path
            d="M16 7.8v6.1a2.1 2.1 0 0 0 2.1 2.1h6.1a8.2 8.2 0 0 1-8.2 8.2A8.2 8.2 0 0 1 7.8 16 8.2 8.2 0 0 1 16 7.8Z"
            fill="#fff"
          />
        </svg>
      );
    case "linea":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <circle cx="16" cy="16" r="15" fill="#121212" stroke="#61DFFF" strokeWidth="1.4" />
          <path d="M11 10.5v10.5h9.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="20.5" cy="11" r="2.2" fill="#61DFFF" />
        </svg>
      );
    case "worldchain":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <circle cx="16" cy="16" r="15" fill="#111111" stroke="#fff" strokeWidth="1.4" />
          <circle cx="16" cy="16" r="7.5" fill="none" stroke="#fff" strokeWidth="2.1" />
          <path d="M8.8 16h14.4M16 8.5c2.2 2.1 2.2 12.9 0 15" fill="none" stroke="#fff" strokeWidth="1.7" />
        </svg>
      );
    case "sonic":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <circle cx="16" cy="16" r="15" fill="#141926" stroke="#38BDF8" strokeWidth="1.4" />
          <path d="M20.5 11.2c-1.1-.9-2.7-1.4-4.5-1.4-2.8 0-4.7 1.3-4.7 3.3 0 2.1 2 2.9 4.8 3.5 2.2.5 3.1 1 3.1 2 0 1.1-1.2 1.8-3 1.8-1.6 0-3-.5-4.1-1.4l-1.4 2c1.3 1.1 3.2 1.7 5.4 1.7 3.2 0 5.3-1.4 5.3-3.7 0-2.1-1.7-3.1-4.8-3.7-2.2-.5-3.1-.9-3.1-1.8 0-.9 1-1.5 2.6-1.5 1.3 0 2.5.4 3.4 1.1l1-1.9Z" fill="#fff" />
        </svg>
      );
    case "ink":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <circle cx="16" cy="16" r="15" fill="#7132F5" />
          <circle cx="16" cy="10.5" r="2.1" fill="#fff" />
          <rect x="14.2" y="14.2" width="3.6" height="9.2" rx="1.8" fill="#fff" />
        </svg>
      );
    case "monad":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <circle cx="16" cy="16" r="15" fill="#836EF9" />
          <path d="M16 7.5 24.5 16 16 24.5 7.5 16 16 7.5Zm0 4.2L11.7 16l4.3 4.3 4.3-4.3-4.3-4.3Z" fill="#fff" />
        </svg>
      );
    case "sei":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <circle cx="16" cy="16" r="15" fill="#9E1F19" />
          <path d="M11 12.2c1.4-1.4 3.2-2.2 5-2.2 3.2 0 5.5 2 5.5 4.7 0 2.4-1.8 4-4.8 4.4l-1.5.2c-1.8.2-2.7.9-2.7 1.9 0 1.2 1.3 2 3.3 2 1.6 0 3-.6 4.1-1.5l1.4 1.8c-1.4 1.2-3.4 2-5.6 2-3.4 0-5.7-1.8-5.7-4.5 0-2.5 1.8-4.1 5-4.5l1.5-.2c1.7-.2 2.5-.8 2.5-1.7 0-1.2-1.2-2-3-2-1.4 0-2.6.5-3.6 1.4L11 12.2Z" fill="#fff" />
        </svg>
      );
    case "hyperevm":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <circle cx="16" cy="16" r="15" fill="#0B2D26" stroke="#50E3C2" strokeWidth="1.4" />
          <path d="M10.5 9.5v13h3v-5.2h5v5.2h3v-13h-3v5.1h-5V9.5h-3Z" fill="#50E3C2" />
        </svg>
      );
    case "xdc":
      return (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block shrink-0">
          <circle cx="16" cy="16" r="15" fill="#1B3B6F" />
          <path d="m10 10.5 4.8 5.5-4.8 5.5h3.2l3.2-3.8 3.2 3.8h3.2L18 16l4.8-5.5h-3.2l-3.2 3.8-3.2-3.8H10Z" fill="#fff" />
        </svg>
      );
  }
}

export function normalizeChainMark(chain: string): SupportedChainMark {
  if (chain in marks) return chain as SupportedChainMark;
  const lower = chain.toLowerCase();
  const isTest = lower.includes("test") || lower.includes("sepolia") || lower.includes("fuji") || lower.includes("amoy") || lower.includes("devnet") || lower.includes("apothem");
  if (lower.includes("arc")) return isTest ? "Arc_Testnet" : "Arc_Mainnet";
  if (lower.includes("base")) return isTest ? "Base_Sepolia" : "Base";
  if (lower.includes("arb")) return isTest ? "Arbitrum_Sepolia" : "Arbitrum";
  if (lower.includes("eth")) return isTest ? "Ethereum_Sepolia" : "Ethereum";
  if (lower.includes("opt")) return isTest ? "Optimism_Sepolia" : "Optimism";
  if (lower.includes("avax") || lower.includes("aval")) return isTest ? "Avalanche_Fuji" : "Avalanche";
  if (lower.includes("poly")) return isTest ? "Polygon_Amoy_Testnet" : "Polygon";
  if (lower.includes("sol")) return isTest ? "Solana_Devnet" : "Solana";
  if (lower.includes("uni")) return isTest ? "Unichain_Sepolia" : "Unichain";
  if (lower.includes("linea")) return isTest ? "Linea_Sepolia" : "Linea";
  if (lower.includes("world")) return isTest ? "World_Chain_Sepolia" : "World_Chain";
  if (lower.includes("sonic")) return isTest ? "Sonic_Testnet" : "Sonic";
  if (lower.includes("ink")) return isTest ? "Ink_Testnet" : "Ink";
  if (lower.includes("monad")) return isTest ? "Monad_Testnet" : "Monad";
  if (lower.includes("sei")) return isTest ? "Sei_Testnet" : "Sei";
  if (lower.includes("hyper")) return isTest ? "HyperEVM_Testnet" : "HyperEVM";
  if (lower.includes("xdc")) return isTest ? "XDC_Apothem" : "XDC";
  return "Arc_Mainnet";
}

export function ChainMark({
  chain,
  compact = false,
  size = 18,
  className,
}: {
  chain: SupportedChainMark | string;
  compact?: boolean;
  size?: number;
  className?: string;
}) {
  const key = normalizeChainMark(String(chain));
  const mark = marks[key];
  return (
    <span className={cn("inline-flex items-center justify-center shrink-0", compact ? "gap-1.5" : "gap-2", className)} title={mark.name}>
      {compact ? (
        <ChainIcon family={mark.family} size={size} />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
          <ChainIcon family={mark.family} size={size} />
        </span>
      )}
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium text-slate-200">{mark.name}</span>
          <span className="block text-[9px] tracking-[0.08em] text-slate-400">{mark.short}</span>
        </span>
      )}
    </span>
  );
}

export { marks as SUPPORTED_CHAIN_MARKS };
