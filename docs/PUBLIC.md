# OrdenFi — public access

## Permanent public URL

**https://ordenfi.vercel.app**

- Hosted on Vercel (production)
- Project: `sayeds-projects-e086c1e7/ordenfi`
- Stays online without your local machine

Dashboard: https://vercel.com/sayeds-projects-e086c1e7/ordenfi

### For Arc reviewers

1. Open https://ordenfi.vercel.app  
2. Connect wallet → Arc Testnet (`5042002`)  
3. Fund test USDC: https://faucet.circle.com  
4. Workspace → Send / transfer / agent  

---

## Redeploy

```bash
cd ordenfi
vercel --yes --prod
```

## Environment (production)

Set in Vercel → Settings → Environment Variables:

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_EXECUTION_MODE` | `live` |
| `NEXT_PUBLIC_ALLOW_DEMO` | `false` |
| `NEXT_PUBLIC_APP_URL` | `https://ordenfi.vercel.app` |
| `NEXT_PUBLIC_APP_DOMAIN` | `ordenfi.vercel.app` |
| `NEXT_PUBLIC_SIWE_CHAIN_ID` | `5042002` |
| `NEXT_PUBLIC_ARC_RPC_URL` | `https://rpc.testnet.arc.network` |
| `DATABASE_URL` | Postgres URL recommended (SQLite is limited on serverless) |
| `XAI_API_KEY` | optional |
| `KIT_KEY` | optional |

## Local production

```bash
npm run build
npm run start
# http://localhost:3000
```

## Note on database

Serverless SQLite is **not durable**. For SIWE sessions / tx history in production, switch Prisma to **PostgreSQL** (Neon/Supabase) and update `DATABASE_URL`.

Wallet send/bridge on Arc still works client-side without a durable DB.
