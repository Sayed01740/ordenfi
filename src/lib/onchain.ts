import { ARC_CHAIN_ID, ARC_EXPLORER } from "@/lib/arc-chain";
import { BRAND_URL } from "@/lib/brand";

export { ARC_CHAIN_ID };

/** Deployed OrdenFiRegistry (Foundry Path A) */
export const ORDENFI_REGISTRY =
  process.env.NEXT_PUBLIC_ORDENFI_REGISTRY?.trim() ||
  process.env.NEXT_PUBLIC_AGFUSION_REGISTRY?.trim() ||
  "0x76BB5678eC11Ae94b34Ed9cF90B25C9Eea440483";

/** Deployer / owner wallet that broadcast the deploy tx */
export const ORDENFI_DEPLOYER =
  process.env.NEXT_PUBLIC_ORDENFI_DEPLOYER?.trim() ||
  process.env.NEXT_PUBLIC_AGFUSION_DEPLOYER?.trim() ||
  "0xB00f41172c23d31571a3bE850AA0e81e58Ab8828";

export const ORDENFI_DEPLOY_TX =
  process.env.NEXT_PUBLIC_ORDENFI_DEPLOY_TX?.trim() ||
  process.env.NEXT_PUBLIC_AGFUSION_DEPLOY_TX?.trim() ||
  "0x2db9e1244770254ac0a80bc2d2052fe504965272f6dd076465203b6c32bfab99";

export const ORDENFI_METADATA_URI =
  `${BRAND_URL}/identity/ordenfi-agent.json`;

// Backwards-compatible exports
export const AGFUSION_REGISTRY = ORDENFI_REGISTRY;
export const AGFUSION_DEPLOYER = ORDENFI_DEPLOYER;
export const AGFUSION_DEPLOY_TX = ORDENFI_DEPLOY_TX;
export const AGFUSION_METADATA_URI = ORDENFI_METADATA_URI;

/** ERC-8004 IdentityRegistry — see src/lib/erc8004.ts */
export const ERC8004_IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e";

export function registryExplorerUrl(address = ORDENFI_REGISTRY): string {
  return `${ARC_EXPLORER}/address/${address}`;
}

export function txExplorerUrl(hash = ORDENFI_DEPLOY_TX): string {
  return `${ARC_EXPLORER}/tx/${hash}`;
}

export function walletExplorerUrl(address = ORDENFI_DEPLOYER): string {
  return `${ARC_EXPLORER}/address/${address}`;
}

/** Minimal ABI for UI / cast */
export const ORDENFI_REGISTRY_ABI = [
  {
    type: "function",
    name: "projectInfo",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "projectOwner", type: "address" },
      { name: "uri", type: "string" },
      { name: "isActive", type: "bool" },
      { name: "totalRegistrations", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "kind", type: "string" },
      { name: "uri", type: "string" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "registrationCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

export const AGFUSION_REGISTRY_ABI = ORDENFI_REGISTRY_ABI;
