import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { getArcNetworkMeta } from "@/lib/arc-chain";

export const metadata: Metadata = {
  title: "Ordenfi documentation",
  description: "Learn how to connect your wallet, move USDC on Arc, and review transactions in Ordenfi.",
};

const topics = [
  { id: "overview", label: "Get started" },
  { id: "core-engine", label: "Swap, send and bridge" },
  { id: "receive", label: "Receive USDC" },
  { id: "batch-payroll", label: "Batch payments" },
  { id: "kona", label: "Use Kona" },
  { id: "activity", label: "Track a transaction" },
  { id: "contracts", label: "Smart contracts" },
  { id: "more", label: "More tools" },
] as const;

function DocsSection({ id, title, children }: { id: (typeof topics)[number]["id"]; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-0 space-y-4 border-t border-border py-7 first:border-t-0 first:pt-0 sm:py-9">
      <h2 id={`${id}-title`} className="font-display text-[1.55rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[1.85rem]">{title}</h2>
      {children}
    </section>
  );
}

const actionHeading = "mb-1.5 text-base font-semibold text-foreground";
const networkOptions = [
  { meta: getArcNetworkMeta(5042), use: "Transactions with real funds" },
  { meta: getArcNetworkMeta(5042002), use: "Practice with test funds" },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-8 sm:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-7 sm:pb-9">
        <div>
          <h1 className="font-display text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-foreground sm:text-5xl">Ordenfi documentation</h1>
          <p className="mt-3 max-w-[55ch] text-base leading-relaxed text-muted-foreground">Connect your wallet, move stablecoins on Arc, and check the status of your transactions.</p>
        </div>
        <Link href="/app" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent/90">
          Open workspace <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </header>

      <div className="grid items-start gap-8 pt-7 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
        <nav aria-label="On this page" className="md:sticky md:top-24">
          <p className="mb-2 text-sm font-semibold text-foreground">On this page</p>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 border-b border-border pb-3 md:grid-cols-1 md:border-b-0 md:border-l md:pb-0 md:pl-2">
            {topics.map(({ id, label }) => (
              <li key={id}>
                <a href={`#${id}`} className="flex min-h-11 items-center rounded-lg px-2.5 py-1 text-sm leading-tight text-muted-foreground hover:bg-muted hover:text-foreground">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article aria-label="Ordenfi user guide" className="max-w-[72ch] min-w-0 text-[0.9375rem] leading-[1.7] text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
          <DocsSection id="overview" title="Get started">
            <ol className="list-decimal space-y-2 pl-5 marker:text-accent">
              <li>Open the workspace and select <strong>Connect wallet</strong>. Once connected, open the wallet menu to check your address, available balance and recent activity.</li>
              <li>Choose <strong>Mainnet</strong> or <strong>Testnet</strong> in the workspace. If your wallet asks to switch networks, review the request before accepting.</li>
              <li>Pick an action from the sidebar. Review the amount, network and any fees before confirming in your wallet. Arc network fees are paid in USDC.</li>
            </ol>
            <table id="arc-network" className="w-full scroll-mt-0 text-left text-sm">
              <caption className="mb-2 text-left font-semibold text-foreground">Arc networks</caption>
              <thead>
                <tr className="border-b border-border text-foreground">
                  <th scope="col" className="py-2 pr-2 font-medium">Network</th>
                  <th scope="col" className="py-2 pr-2 font-medium">Chain ID</th>
                  <th scope="col" className="py-2 font-medium">Use</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {networkOptions.map(({ meta, use }) => (
                  <tr key={meta.chainId}>
                    <th scope="row" className="py-2 pr-2 font-medium text-foreground">{meta.name}</th>
                    <td className="py-2 pr-2 font-mono tabular-nums">{meta.chainId}</td>
                    <td className="py-2">{use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DocsSection>

          <DocsSection id="core-engine" title="Swap, send and bridge">
            <div className="space-y-5">
              <div id="swap" className="scroll-mt-0">
                <h3 className={actionHeading}>Swap tokens</h3>
                <p>Open <strong>Swap</strong>, choose the token pair and enter the amount you want to pay. Review the quoted amount, minimum received and slippage before signing. Some tokens require a separate approval. On Mainnet, select <strong>Refresh quote</strong> if the quote has expired, then review the new rate.</p>
              </div>
              <div id="send" className="scroll-mt-0">
                <h3 className={actionHeading}>Send USDC on Arc</h3>
                <p>Open <strong>Send</strong>, enter the amount and paste the recipient’s full wallet address. Check the address and Arc network in the confirmation screen before approving the transfer in your wallet.</p>
              </div>
              <div id="bridge" className="scroll-mt-0">
                <h3 className={actionHeading}>Bridge between networks</h3>
                <p>Open <strong>Bridge</strong>, choose the source and destination networks, and review the route and fees. <strong>Fast Direct</strong> uses your wallet to complete the destination step. <strong>Auto-Relayer</strong> uses a relayer for that step when available. Follow the bridge progress through destination confirmation.</p>
              </div>
            </div>
          </DocsSection>

          <DocsSection id="receive" title="Receive USDC">
            <p>Open <strong>Receive</strong> and enter the wallet address that should receive the funds. Leave the address blank to use your connected wallet. Enter the amount, check the network, then select <strong>Copy payment link</strong> or <strong>Download QR</strong>.</p>
            <p>The request includes the amount, receiving address and network. The payer reviews those details and signs in their own wallet. Links created on localhost are for local testing.</p>
          </DocsSection>

          <DocsSection id="batch-payroll" title="Batch payments">
            <p>Open <strong>Batch Payments</strong> and add up to 200 recipients. Download the CSV template, upload a UTF-8 CSV or TSV, or paste rows from a spreadsheet. Include an <code>address</code> and <code>amount</code> column. Use <code>label</code> to identify payments in the report.</p>
            <p>Append the imported rows or replace the current draft. Fix invalid amounts, addresses and duplicate recipients before reviewing the network, payment total and estimated gas. On both <strong>Arc Mainnet</strong> and <strong>Arc Testnet</strong>, OrdenFi routes batches through <code>OrdenFiDisperse</code> so you can pay up to 200 recipients in a single wallet signature (with automatic sequential fallback when needed).</p>
            <p>Use <strong>Stop after current payment</strong> to stop before the next recipient in sequential mode. Download the full results, or download only the unsent rows to import into a new batch. Check the <strong>Activity timeline</strong> before repeating a payment marked <strong>Needs review</strong>.</p>
          </DocsSection>

          <DocsSection id="kona" title="Use Kona">
            <p>Select <strong>Ask Kona</strong> to open the assistant. Describe what you want to do (for example, sending USDC, swapping tokens, or bridging) and Kona will prepare the route and trigger your wallet signature request directly when your wallet is connected, or let you review and edit the pre-filled form in the workspace.</p>
            <p>Minimizing Kona keeps your draft. When a new answer arrives, select <strong>Read reply</strong> to return to it. Kona also adapts to your active network (Arc Mainnet or Arc Testnet) and flags network mismatches or expired Mainnet quotes.</p>
          </DocsSection>

          <DocsSection id="activity" title="Track a transaction">
            <p>Open the <strong>Activity timeline</strong> below the workspace and select a transaction to see its details. Use the explorer link when a transaction hash is available.</p>
            <dl className="divide-y divide-border border-y border-border text-sm">
              <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
                <dt className="font-semibold text-foreground">Pending</dt>
                <dd>Check the existing transaction before trying again. A submitted hash can appear before confirmation.</dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
                <dt className="font-semibold text-foreground">Confirmed</dt>
                <dd>Open the receipt in Kona to copy the hash or view the transaction on its network’s explorer.</dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
                <dt className="font-semibold text-foreground">Bridge needs review</dt>
                <dd>Check the last completed step. If recovery is available, open <strong>Bridge</strong> and resume the existing transfer.</dd>
              </div>
            </dl>
          </DocsSection>

          <DocsSection id="contracts" title="Smart contracts">
            <p>OrdenFi deploys its core contracts on both <strong>Arc Mainnet</strong> (<code>5042</code>) and <strong>Arc Testnet</strong> (<code>5042002</code>) using Solidity <code>0.8.24</code>.</p>
            <table className="w-full text-left text-sm">
              <caption className="mb-2 text-left font-semibold text-foreground">Arc Mainnet (5042)</caption>
              <thead>
                <tr className="border-b border-border text-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">Contract</th>
                  <th scope="col" className="py-2 font-medium">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <th scope="row" className="py-2 pr-3 font-medium text-foreground">OrdenFiRegistry</th>
                  <td className="py-2 font-mono text-xs break-all">
                    <a href="https://explorer.arc.io/address/0x06B16942e9bcE49b38281704eDBeE4CAE28FD884" target="_blank" rel="noreferrer" className="text-accent underline decoration-accent/45 underline-offset-4 hover:decoration-accent">
                      0x06B16942e9bcE49b38281704eDBeE4CAE28FD884
                    </a>
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-3 font-medium text-foreground">OrdenFiEscrow</th>
                  <td className="py-2 font-mono text-xs break-all">
                    <a href="https://explorer.arc.io/address/0x206ffcc9510E9ffF0F0262D2d7485D8Cc13f023F" target="_blank" rel="noreferrer" className="text-accent underline decoration-accent/45 underline-offset-4 hover:decoration-accent">
                      0x206ffcc9510E9ffF0F0262D2d7485D8Cc13f023F
                    </a>
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-3 font-medium text-foreground">OrdenFiDisperse</th>
                  <td className="py-2 font-mono text-xs break-all">
                    <a href="https://explorer.arc.io/address/0x1E24dB5F90a5BaF8e11A4736F835Dfc43dCB23a0" target="_blank" rel="noreferrer" className="text-accent underline decoration-accent/45 underline-offset-4 hover:decoration-accent">
                      0x1E24dB5F90a5BaF8e11A4736F835Dfc43dCB23a0
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
            <table className="w-full text-left text-sm">
              <caption className="mb-2 text-left font-semibold text-foreground">Arc Testnet (5042002)</caption>
              <thead>
                <tr className="border-b border-border text-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">Contract</th>
                  <th scope="col" className="py-2 font-medium">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <th scope="row" className="py-2 pr-3 font-medium text-foreground">OrdenFiRegistry</th>
                  <td className="py-2 font-mono text-xs break-all">
                    <a href="https://testnet.arcscan.app/address/0x883e5b891e552faCB0cf6cfa23BD9B7953FaDea4" target="_blank" rel="noreferrer" className="text-accent underline decoration-accent/45 underline-offset-4 hover:decoration-accent">
                      0x883e5b891e552faCB0cf6cfa23BD9B7953FaDea4
                    </a>
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-3 font-medium text-foreground">OrdenFiEscrow</th>
                  <td className="py-2 font-mono text-xs break-all">
                    <a href="https://testnet.arcscan.app/address/0x3c3E16f6E30f9Df54d9A78e74446cEda2919FB2c" target="_blank" rel="noreferrer" className="text-accent underline decoration-accent/45 underline-offset-4 hover:decoration-accent">
                      0x3c3E16f6E30f9Df54d9A78e74446cEda2919FB2c
                    </a>
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-3 font-medium text-foreground">OrdenFiDisperse</th>
                  <td className="py-2 font-mono text-xs break-all">
                    <a href="https://testnet.arcscan.app/address/0x37d42057D6914fC7eA231DD1F47A3A51314d8688" target="_blank" rel="noreferrer" className="text-accent underline decoration-accent/45 underline-offset-4 hover:decoration-accent">
                      0x37d42057D6914fC7eA231DD1F47A3A51314d8688
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </DocsSection>

          <DocsSection id="more" title="More tools">
            <ul className="space-y-2">
              <li><strong>Buy USDC</strong> opens the onramp when it is available.</li>
              <li><strong>Route Risk Analysis</strong> shows a local estimate based on the amount and networks.</li>
              <li><strong>Unified Balance</strong> shows USDC managed through Circle Gateway on supported networks.</li>
            </ul>
            <p>Open <Link href="/analytics" className="font-semibold text-accent underline decoration-accent/45 underline-offset-4 hover:decoration-accent">Analytics</Link> from the main navigation to review balances and transaction activity.</p>
          </DocsSection>
        </article>
      </div>
    </div>
  );
}
