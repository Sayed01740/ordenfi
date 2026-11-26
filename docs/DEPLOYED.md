# OrdenFi — Deployed Smart Contracts

All OrdenFi contracts are deployed on **Arc Mainnet** (`Chain ID: 5042`) and **Arc Testnet** (`Chain ID: 5042002`) with Solidity `0.8.24` (`cancun` EVM, 200 optimizer runs).

---

## Arc Mainnet (`5042`)

| Contract | Address | Deploy Tx | Explorer |
| :--- | :--- | :--- | :--- |
| **OrdenFiRegistry** | `0x06B16942e9bcE49b38281704eDBeE4CAE28FD884` | `0xb864ca803b70a7de7be681d97506d6f35eb6c879f7e51a6c5d5c044163e212d4` | [View on Explorer](https://explorer.arc.io/address/0x06B16942e9bcE49b38281704eDBeE4CAE28FD884) |
| **OrdenFiEscrow** | `0x206ffcc9510E9ffF0F0262D2d7485D8Cc13f023F` | `0x4f558fa13e2e32e90b67337541dec037be7ce790ae23d23a72624d0eb0767159` | [View on Explorer](https://explorer.arc.io/address/0x206ffcc9510E9ffF0F0262D2d7485D8Cc13f023F) |
| **OrdenFiDisperse** | `0x1E24dB5F90a5BaF8e11A4736F835Dfc43dCB23a0` | `0xc52253a06511c969b54b440b9d1c8b04b6357a08acc3a45ff2217b842d5b6dc0` | [View on Explorer](https://explorer.arc.io/address/0x1E24dB5F90a5BaF8e11A4736F835Dfc43dCB23a0) |

- **Deployer / Owner:** `0xB00f41172c23d31571a3bE850AA0e81e58Ab8828`
- **RPC:** `https://rpc.mainnet.arc.io`
- **Metadata URI:** `https://ordenfi.xyz/identity/ordenfi-agent.json`

---

## Arc Testnet (`5042002`)

| Contract | Address | Deploy Tx | Explorer |
| :--- | :--- | :--- | :--- |
| **OrdenFiRegistry** | `0x883e5b891e552faCB0cf6cfa23BD9B7953FaDea4` | `0x609a7b7ca5aaf871588de682c6a4b945d9218ee7c925c4768b00cd30166fd79e` | [View on Explorer](https://testnet.arcscan.app/address/0x883e5b891e552faCB0cf6cfa23BD9B7953FaDea4) |
| **OrdenFiEscrow** | `0x3c3E16f6E30f9Df54d9A78e74446cEda2919FB2c` | `0xc929acfaccd90b6a2e6c0fb4820e12f8bc628aa745530a4eaebd8bbb4c0554b3` | [View on Explorer](https://testnet.arcscan.app/address/0x3c3E16f6E30f9Df54d9A78e74446cEda2919FB2c) |
| **OrdenFiDisperse** | `0x37d42057D6914fC7eA231DD1F47A3A51314d8688` | `0xfda50000b16e0f68d0910d1d48ee3afb709992904b036b5c0b5f654cfef14311` | [View on Explorer](https://testnet.arcscan.app/address/0x37d42057D6914fC7eA231DD1F47A3A51314d8688) |

- **Deployer / Owner:** `0xB00f41172c23d31571a3bE850AA0e81e58Ab8828`
- **RPC:** `https://rpc.testnet.arc.io`
- **Metadata URI:** `https://ordenfi.xyz/identity/ordenfi-agent.json`

---

## Verification & Deployment Scripts

- **Mainnet deploy / verify:** `contracts/deploy-mainnet.ps1` (`-VerifyOnly`)
- **Testnet deploy / verify:** `contracts/deploy-testnet.ps1` (`-VerifyOnly`)
- **Flattened Solidity sources:** `contracts/flatten/`
- **Standard JSON inputs:** `contracts/verify/`
- **Deployment records:** `contracts/deployments/arc-mainnet.json`, `contracts/deployments/arc-testnet.json`

---

## App Environment Variables

```ini
NEXT_PUBLIC_ORDENFI_REGISTRY=0x06B16942e9bcE49b38281704eDBeE4CAE28FD884
NEXT_PUBLIC_ORDENFI_ESCROW_ADDRESS=0x206ffcc9510E9ffF0F0262D2d7485D8Cc13f023F
NEXT_PUBLIC_ORDENFI_DISPERSE_ADDRESS=0x1E24dB5F90a5BaF8e11A4736F835Dfc43dCB23a0
NEXT_PUBLIC_ORDENFI_DEPLOYER=0xB00f41172c23d31571a3bE850AA0e81e58Ab8828
NEXT_PUBLIC_ORDENFI_DEPLOY_TX=0xb864ca803b70a7de7be681d97506d6f35eb6c879f7e51a6c5d5c044163e212d4
NEXT_PUBLIC_ORDENFI_TESTNET_DISPERSE_ADDRESS=0x37d42057D6914fC7eA231DD1F47A3A51314d8688
```

Defaults are configured in `src/lib/onchain.ts` and `src/lib/dapp/tokens.ts`.

ERC-8004 `IdentityRegistry`: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
