# OrdenFi

OrdenFi is an institutional-grade stablecoin orchestration engine and decentralized treasury workspace natively built for **Arc Network** (**Arc Mainnet** `5042` and **Arc Testnet** `5042002`). It unites multi-chain liquidity, cross-chain CCTP v2 settlement, Uniswap V3 swaps, single-signature batch disbursements, and AI-assisted treasury planning under strict, wallet-confirmed policy guardrails. Deployed contracts are verified under the OrdenFi namespace on Arc Mainnet, with full backwards compatibility for existing configurations and browser storage identifiers. The UI uses the shared tokens in `src/app/ordenfi-theme.css`.

* **Live Application:** [https://ordenfi.xyz](https://ordenfi.xyz)
* **Interactive Docs:** [https://ordenfi.xyz/docs](https://ordenfi.xyz/docs)
* **Mainnet Block Explorer:** [https://explorer.arc.io](https://explorer.arc.io)
* **Testnet Block Explorer:** [https://testnet.arcscan.app](https://testnet.arcscan.app)

---

## System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Client Layer (Next.js 15 / React 19)                  │
│       Dashboard  •  Bridge Card  •  Swap Terminal  •  Disperse  •  Escrow       │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
┌──────────────────────────────────────┐    ┌──────────────────────────────────────┐
│        Serverless API & Gateways     │    │       On-Chain Smart Contracts       │
│  • SIWE / Web3 Wallet Verification   │    │  • OrdenFiRegistry (Agent Metadata) │
│  • Uniswap V3 Permit2 Routing Proxy  │    │  • OrdenFiEscrow (Milestones/Fees)  │
│  • AES-256-GCM Quote Session Store   │    │  • OrdenFiDisperse (Multi-batch)    │
│  • Circle CCTP v2 Iris Attestations  │    │  • Canonical Native / ERC20 USDC     │
└──────────────────┬───────────────────┘    └──────────────────┬───────────────────┘
                   │                                           │
                   ▼                                           ▼
┌──────────────────────────────────────┐    ┌──────────────────────────────────────┐
│           Decentralized Infra        │    │         Cross-Chain Liquidity        │
│  • Arc Mainnet JSON-RPC (5042)       │    │  • Circle CCTP v2 (Eth, Arb, Base)   │
│  • Cloudflare D1 Quote Session DB    │    │  • Uniswap V3 Pools (USDC/EURC/BTC)  │
│  • PostgreSQL / Prisma Persistence   │    │  • Arc Network Settlement Layer      │
└──────────────────────────────────────┘    └──────────────────────────────────────┘
```

---

## Core Protocols & Features

### 1. Dual-Engine USDC Transfer
Arc Network utilizes USDC as its native gas currency (18 decimals in the EVM execution frame) while concurrently hosting the canonical 6-decimal ERC-20 precompile at `0x3600000000000000000000000000000000000000`.
* **Zero Simulation Friction:** Direct EVM native value routing consumes only **21,000 gas** and completely eliminates precompile simulation reverts (`#-39000`) across all EIP-1193 wallets.
* **Deterministic Fallback:** Full backwards compatibility with standard ERC-20 allowances, approvals, and smart contract callers.

### 2. High-Fidelity Uniswap V3 AMM Routing
* **Permit2 Preflight Verification:** Seamless single-signature permit allowances with deterministic nonce synchronization.
* **Cryptographic Quote Sessions:** Server-issued quote payloads are encrypted with authenticated `AES-256-GCM` and single-use digests validated via Cloudflare D1 before execution, preventing sandwich attacks and slippage griefing.
* **Classic Route Execution:** Direct execution through the Universal Router with client-side slippage enforcement ($0.1\% - 5\%$).

### 3. Circle CCTP v2 Cross-Chain Settlement
* **Native Mint & Burn:** Direct interoperability with Circle’s TokenMessenger protocol eliminating wrapped-token bridge risks.
* **Connected Networks:** Bidirectional transfers between Arc Mainnet, Ethereum, Arbitrum, Base, Optimism, and Avalanche.
* **Automated Iris Attestation Tracking:** Real-time polling and verification against Circle's off-chain Iris attestation service.

### 4. Smart Contract Treasury Protocols & Single-Signature Batch Payments
* **Single-Signature Batch Disperse (`OrdenFiDisperse`):** Pay up to **200 recipients in 1 wallet signature** directly from the workspace **Batch Payments** panel (`BatchPayrollCard`). Supports both **Arc Mainnet** and **Arc Testnet** with automatic per-network contract resolution, on-chain bytecode verification before approval, and seamless sequential fallback—reducing gas overhead by up to $65\%$.
* **Conditional Escrow (`OrdenFiEscrow`):** Trust-minimized milestone payouts with configurable arbitrator dispute resolution, 50 bps protocol fees, and emergency recovery timelocks.
* **On-Chain Agent Registry (`OrdenFiRegistry`):** EIP-712 compatible agent identity registration and decentralized metadata anchors.

### 5. Kona AI — Network-Aware Execution Assistant
* **Intelligent Network Detection:** Automatically detects the active workspace network (**Arc Mainnet** vs **Arc Testnet**) and connected wallet chain, dynamically adapting greetings, quick suggestions, fee/route estimates, and LLM system prompts in real time.
* **Human-in-the-Loop Guardrails:** Plans swaps, transfers, and cross-chain bridges in plain English, always requiring explicit UI confirmation and a local wallet signature before any funds move.

---

## Smart Contract Deployments

All contracts are deployed on **Arc Mainnet** (`Chain ID: 5042`), compiled with Solidity `0.8.24` (`Cancun` EVM, 200 optimization runs).

| Contract | Mainnet Address | Deployment Tx | Explorer |
| :--- | :--- | :--- | :--- |
| **OrdenFiRegistry** | `0xf25757227337130Fb33A70A31aFFD782FfA44f6D` | [`0xab66ea...`](https://explorer.arc.io/tx/0xab66eac920a45fce0a2d6e861bde671ea2a851ed4ae44ef4016ba46884ff8c1b) | [View on Explorer](https://explorer.arc.io/address/0xf25757227337130Fb33A70A31aFFD782FfA44f6D) |
| **OrdenFiEscrow** | `0x23554d16C1F397fde97cf394FF603d7372b61f20` | [`0x20eeda...`](https://explorer.arc.io/tx/0x20eeda61acc3203224565f92b9f3ebafdbe18444ec65d45031a259402458b82d) | [View on Explorer](https://explorer.arc.io/address/0x23554d16C1F397fde97cf394FF603d7372b61f20) |
| **OrdenFiDisperse** | `0x376323cCE5233C0C20339BBeeCFEB838602B5578` | [`0xd24b58...`](https://explorer.arc.io/tx/0xd24b5819d9c90a2118e2f77f97af58745b84893798533ae0c4b2a1b5b69c4f7a) | [View on Explorer](https://explorer.arc.io/address/0x376323cCE5233C0C20339BBeeCFEB838602B5578) |

### Canonical Token Addresses (Arc Mainnet)

| Asset | Type | Contract Address | Decimals |
| :--- | :--- | :--- | :--- |
| **USDC** | Native Gas / ERC-20 | `0x3600000000000000000000000000000000000000` | 6 (ERC-20) / 18 (Native) |
| **EURC** | ERC-20 | `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1` | 6 |
| **cirBTC** | ERC-20 | `0x171A4217b86A807A64eB94757Db6849fb4bDbAA0` | 8 |

---

## Technology Stack

* **Frontend Framework:** [Next.js 15.5](https://nextjs.org/) (App Router, Server Actions, Dynamic Streaming)
* **UI & Design:** React 19, Tailwind CSS 4, Radix UI Primitives, Lucide Icons
* **Web3 Integration:** [Viem 2.x](https://viem.sh/), Wagmi, EIP-1193 Provider Adapters, Sign-In with Ethereum (SIWE)
* **Smart Contracts:** Solidity `0.8.24`, Foundry Framework (`forge`, `cast`)
* **DEX & Routing:** Uniswap Universal Router v2.1.2, Permit2 (`0x000000000022D473030F116dDEE9F6B43aC78BA3`)
* **Cross-Chain Bridge:** Circle CCTP v2 (`TokenMessenger: 0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d`)
* **Persistence & State:** Prisma ORM, PostgreSQL, Cloudflare D1 Worker
* **Testing:** Vitest, Foundry Unit Suites, ESLint, TypeScript Strict

---

## Local Development & Setup

### Prerequisites
* Node.js `>= 22.0.0`
* npm `>= 10.0.0`
* Foundry toolchain (`forge`, `cast`)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Sayed01740/ordenfi.git
   cd ordenfi
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   Populate `.env.local` with your network RPC endpoints and API credentials:
   ```ini
   NEXT_PUBLIC_ARC_NETWORK="mainnet"
   NEXT_PUBLIC_ARC_CHAIN_ID=5042
   NEXT_PUBLIC_ARC_RPC_URL="https://rpc.mainnet.arc.io"
   NEXT_PUBLIC_ARC_EXPLORER_URL="https://explorer.arc.io"
   
   # Deployed Contract Addresses (Arc Mainnet)
   NEXT_PUBLIC_ORDENFI_REGISTRY="0xf25757227337130Fb33A70A31aFFD782FfA44f6D"
   NEXT_PUBLIC_ORDENFI_ESCROW_ADDRESS="0x23554d16C1F397fde97cf394FF603d7372b61f20"
   NEXT_PUBLIC_ORDENFI_DISPERSE_ADDRESS="0x376323cCE5233C0C20339BBeeCFEB838602B5578"
   # Optional: Arc Testnet Disperse address for 1-signature Testnet batches
   NEXT_PUBLIC_ORDENFI_TESTNET_DISPERSE_ADDRESS=""
   ```

4. **Initialize Database & Run Development Server:**
   ```bash
   npx prisma generate
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```text
├── contracts/                  # Solidity smart contracts and deployment suites
│   ├── src/                    # Smart contract source files & flattened verifiers
│   │   ├── OrdenFiRegistry.sol
│   │   ├── OrdenFiEscrow.sol
│   │   └── OrdenFiDisperse.sol
│   └── deployments/            # Verified deployment records (arc-mainnet.json)
├── src/
│   ├── app/                    # Next.js 15 App Router pages & API routes
│   │   ├── api/circle/         # CCTP and Iris attestation relays
│   │   ├── api/uniswap/        # Uniswap V3 swap and quote session endpoints
│   │   └── dashboard/          # Production operations dashboard
│   ├── blockchain/             # Viem clients, Permit2 drivers & bridge execution
│   ├── components/             # Reusable UI cards, tables, and interaction panels
│   ├── lib/                    # Configuration, cryptographic helpers & utilities
│   ├── sdk/                    # EIP-1193 wallet adapters & account abstractions
│   └── types/                  # Protocol-wide TypeScript interfaces
└── prisma/                     # Database schema definitions
```

---

## Verification & Testing

Run the test suite across unit, cryptographic session, and transaction components:

```bash
# Run unit & integration tests
npm test

# Run TypeScript typechecks
npm run typecheck

# Run production build validation
npm run build
```

---

## Security Policy

* **Non-Custodial:** User funds never transit intermediate custodial accounts. All transactions are constructed as standardized EIP-155 payloads and signed locally by the user's wallet.
* **Server-Side Secret Isolation:** Private keys, encryption secrets, and API credentials are kept strictly server-side and never injected into client bundles.
* **Deterministic Limits:** On-chain rate limits, spending caps, and slippage bounds are enforced on both client and contract levels.

---

## License

This project is licensed under proprietary terms. All rights reserved.
