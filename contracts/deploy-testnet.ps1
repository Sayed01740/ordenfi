# OrdenFi — Arc TESTNET (chain 5042002) deploy + Blockscout verify
#
# Deploys: OrdenFiRegistry, OrdenFiEscrow, OrdenFiDisperse
# Verifies each on https://testnet.arcscan.app
# Writes addresses to contracts/deployments/arc-testnet.json
#
# Usage (your own terminal — key never leaves this machine):
#   cd contracts
#   .\deploy-testnet.ps1                 # deploy all 3 + verify
#   .\deploy-testnet.ps1 -Only Disperse  # deploy one (Registry|Escrow|Disperse)
#   .\deploy-testnet.ps1 -VerifyOnly     # re-run verification from saved json
#
# Key source (first found): $env:PRIVATE_KEY -> contracts/.env PRIVATE_KEY -> hidden prompt.

param(
  [ValidateSet("All", "Registry", "Escrow", "Disperse")]
  [string]$Only = "All",
  [switch]$VerifyOnly,
  [int]$EscrowFeeBps = 50
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$foundryBin = Join-Path $env:USERPROFILE ".foundry\bin"
if (Test-Path $foundryBin) { $env:Path = "$foundryBin;$env:Path" }
if (-not (Get-Command forge -ErrorAction SilentlyContinue)) { throw "forge not found. Install Foundry (foundryup)." }

$RPC          = if ($env:ARC_TESTNET_RPC_URL) { $env:ARC_TESTNET_RPC_URL } else { "https://rpc.testnet.arc.network" }
$CHAIN_ID     = 5042002
$EXPLORER     = "https://testnet.arcscan.app"
$VERIFIER_URL = "$EXPLORER/api/"
$METADATA     = if ($env:ORDENFI_METADATA_URI) { $env:ORDENFI_METADATA_URI } elseif ($env:AGFUSION_METADATA_URI) { $env:AGFUSION_METADATA_URI } else { "https://ordenfi.xyz/identity/ordenfi-agent.json" }
$OutDir       = Join-Path $PSScriptRoot "deployments"
$OutFile      = Join-Path $OutDir "arc-testnet.json"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# ---- chain sanity ----
$rpcChain = [Convert]::ToInt64((cast chain-id --rpc-url $RPC).Trim())
if ($rpcChain -ne $CHAIN_ID) { throw "RPC $RPC reports chain $rpcChain, expected $CHAIN_ID (Arc Testnet)." }

function Invoke-Verify($address, $contractPath, $ctorArgs) {
  Write-Host "Verifying $contractPath at $address ..." -ForegroundColor Cyan
  $verifyArgs = @(
    "verify-contract", $address, $contractPath,
    "--chain-id", $CHAIN_ID,
    "--verifier", "blockscout",
    "--verifier-url", $VERIFIER_URL,
    "--watch"
  )
  if ($ctorArgs) { $verifyArgs += @("--constructor-args", $ctorArgs) }
  & forge @verifyArgs
  if ($LASTEXITCODE -ne 0) { Write-Host "  verification command failed (retry later with -VerifyOnly)" -ForegroundColor Yellow }
  else { Write-Host "  $EXPLORER/address/$address#code" -ForegroundColor Green }
}

# ---- verify-only mode ----
if ($VerifyOnly) {
  if (-not (Test-Path $OutFile)) { throw "No $OutFile yet. Deploy first." }
  $d = Get-Content $OutFile -Raw | ConvertFrom-Json
  forge build | Out-Null
  foreach ($c in $d.contracts.PSObject.Properties) {
    Invoke-Verify $c.Value.address $c.Value.path $c.Value.constructorArgs
  }
  exit 0
}

# ---- key (never printed) ----
$pk = $env:PRIVATE_KEY
if (-not $pk -and (Test-Path ".env")) {
  $line = Get-Content ".env" | Where-Object { $_ -match '^\s*PRIVATE_KEY\s*=' } | Select-Object -First 1
  if ($line) { $pk = ($line -split "=", 2)[1].Trim().Trim('"') }
}
if (-not $pk) {
  $sec = Read-Host "Paste TESTNET deployer private key (hidden)" -AsSecureString
  $pk = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}
if (-not $pk.StartsWith("0x")) { $pk = "0x$pk" }

$deployer = (cast wallet address --private-key $pk).Trim()
$balWei   = (cast balance $deployer --rpc-url $RPC).Trim()
$balUsdc  = (cast from-wei $balWei).Trim()
Write-Host ""
Write-Host "Network  : Arc Testnet ($CHAIN_ID)  $RPC" -ForegroundColor Green
Write-Host "Deployer : $deployer"
Write-Host "Balance  : $balUsdc USDC (native test gas)"
Write-Host "Deploying: $Only"
if ([decimal]$balUsdc -lt 0.01) { throw "Balance too low for testnet gas. Fund $deployer at https://faucet.circle.com (Arc Testnet)." }

Write-Host "Building..." -ForegroundColor Cyan
$prevEap = $ErrorActionPreference; $ErrorActionPreference = "Continue"
forge build 2>$null | Out-Host
$code = $LASTEXITCODE; $ErrorActionPreference = $prevEap
if ($code -ne 0) { throw "forge build failed" }

$result = if (Test-Path $OutFile) { Get-Content $OutFile -Raw | ConvertFrom-Json } else { [pscustomobject]@{ contracts = [pscustomobject]@{} } }
$result | Add-Member -Force -NotePropertyName network -NotePropertyValue "arc-testnet"
$result | Add-Member -Force -NotePropertyName chainId -NotePropertyValue $CHAIN_ID
$result | Add-Member -Force -NotePropertyName deployer -NotePropertyValue $deployer
$result | Add-Member -Force -NotePropertyName explorer -NotePropertyValue $EXPLORER

function Deploy($name, $path, [string[]]$ctorSig) {
  Write-Host ""
  Write-Host "Deploying $name ..." -ForegroundColor Cyan
  $args2 = @("create", $path, "--rpc-url", $RPC, "--private-key", $pk, "--broadcast", "--json")
  $encoded = $null
  if ($ctorSig) {
    $args2 += "--constructor-args"
    $args2 += $ctorSig[1..($ctorSig.Length - 1)]
    $encoded = (cast abi-encode @ctorSig).Trim()
  }
  $prevEap = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  $raw = & forge @args2 2>$null | Out-String
  $code = $LASTEXITCODE; $ErrorActionPreference = $prevEap
  if ($code -ne 0) { throw "forge create $name failed (exit $code):`n$raw" }
  $m = [regex]::Match($raw, '\{[^{}]*"deployedTo"[^{}]*\}', 'Singleline')
  if (-not $m.Success) { throw "Could not parse forge create output for $name`n$raw" }
  $j = $m.Value | ConvertFrom-Json
  Write-Host "  $name deployed at $($j.deployedTo)" -ForegroundColor Green
  Write-Host "  tx: $EXPLORER/tx/$($j.transactionHash)"
  $entry = [pscustomobject]@{ address = $j.deployedTo; txHash = $j.transactionHash; path = $path; constructorArgs = $encoded; deployedAt = (Get-Date).ToString("o") }
  $result.contracts | Add-Member -Force -NotePropertyName $name -NotePropertyValue $entry
  $result | ConvertTo-Json -Depth 6 | Set-Content $OutFile -Encoding UTF8
  Start-Sleep -Seconds 5
  Invoke-Verify $j.deployedTo $path $encoded
}

if ($Only -in @("All", "Registry")) {
  Deploy "OrdenFiRegistry" "src/OrdenFiRegistry.sol:OrdenFiRegistry" @("constructor(string)", $METADATA)
}
if ($Only -in @("All", "Escrow")) {
  Deploy "OrdenFiEscrow" "src/OrdenFiEscrow.sol:OrdenFiEscrow" @("constructor(address,uint256,address)", $deployer, "$EscrowFeeBps", $deployer)
}
if ($Only -in @("All", "Disperse")) {
  Deploy "OrdenFiDisperse" "src/OrdenFiDisperse.sol:OrdenFiDisperse" $null
}

$pk = $null
Write-Host ""
Write-Host "Saved: $OutFile" -ForegroundColor Green
Write-Host "Add to Vercel / .env.local:" -ForegroundColor Cyan
$c = $result.contracts
if ($c.OrdenFiDisperse) {
  Write-Host "  NEXT_PUBLIC_ORDENFI_TESTNET_DISPERSE_ADDRESS=$($c.OrdenFiDisperse.address)"
}
