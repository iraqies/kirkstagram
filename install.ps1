# SPDX-License-Identifier: MIT
#
# Kirkstagram — one-command installer for PowerShell.
#
# Spicetify-style one-liner:
#   iwr -useb https://raw.githubusercontent.com/iraqies/kirkstagram/main/install.ps1 | iex
#   or: iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/iraqies/kirkstagram/main/install.ps1'))
#
# From a local checkout:
#   powershell install.ps1 -Client vencord -Root <VENCORD>
param(
    [string]$Client,
    [string]$Root
)

$banner = @"

#   # ##### ####  #   #  #### #####   ##   ###  ####    ##  #   #
#   #   #   #   # #   # #       #    #  # #   # #   #  #  # ## ##
#   #   #   #   # #   # #       #   #   # #     #   # #   # # # #
#####   #   ####  #####  ###    #   ##### # ### ####  ##### # # #
#   #   #   # #   #   #     #   #   #   # #   # # #   #   # #   #
#   #   #   #  #  #   #     #   #   #   # #   # #  #  #   # #   #
#   # ##### #   # #   # ####    #   #   #  ###  #   # #   # #   #

Kirkstagram - Instagram-to-Kirkstagram link rewriting for Discord.
"@

Write-Host $banner

$clients = @('vencord','vesktop','revenge','valenced')
if (-not $Client -or $Client -notin $clients) {
    do {
        $Client = Read-Host "Which client? [vencord|vesktop|revenge|valenced]"
    } while (-not ($Client -in $clients))
}

if (-not $Root) {
    # Find the Vencord install:
    #  1) a Vencord checkout on disk (folder with package.json) — the buildable install
    #  2) the default Vencord data dir (join(app.getPath("userData"), "..", "Vencord"),
    #     src/main/utils/constants.ts:22-26) — fallback when no checkout is found
    $found = $null
    $candidates = Get-ChildItem -Path "D:\", "C:\Users" -Recurse -Directory -Filter Vencord -ErrorAction SilentlyContinue | Select-Object -First 10
    foreach ($c in $candidates) {
        if (Test-Path (Join-Path $c.FullName "package.json")) { $found = $c.FullName; break }
    }
    if (-not $found) {
        $dataDir = Join-Path $env:APPDATA "Vencord"
        if (Test-Path $dataDir) { $found = $dataDir }
    }
    if (-not $found) { $found = Read-Host "Path to the $Client installation" }
    $Root = $found
}
if (-not (Test-Path $Root)) { Write-Error "Path not found: $Root"; exit 1 }
Write-Host "Found $Client install: $Root"

$owner = 'iraqies'; $repo = 'kirkstagram'; $branch = 'main'
$base = "https://raw.githubusercontent.com/$owner/$repo/$branch"
$zipPaths = @{
    'vencord'  = "releases/vencord/Kirkstagram.zip"
    'vesktop'  = "releases/vencord/Kirkstagram.zip"
    'revenge'  = "releases/revenge/com.kirkstagram.revenge@1.0.0.zip"
    'valenced' = "releases/valenced/com.kirkstagram.valenced@1.0.0.zip"
}

$zipPath = Join-Path $env:TEMP "Kirkstagram-$Client.zip"
$url = "$base/$($zipPaths[$Client])"
Write-Host "Downloading $url ..."
Invoke-WebRequest -Uri $url -OutFile $zipPath
Expand-Archive -Path $zipPath -DestinationPath $Root -Force
Write-Host "Installed Kirkstagram ($Client) into $Root"

# Build Vencord from a checkout
if ($Client -in @('vencord','vesktop')) {
    $pkg = Join-Path $Root "package.json"
    $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
    if ($pnpm -and (Test-Path $pkg)) {
        Write-Host "Building Vencord (pnpm build)..."
        Push-Location $Root
        try { & $pnpm.Source build } finally { Pop-Location }
        Write-Host "Build finished."
    }
}

Write-Host "Next: enable Kirkstagram in the $Client Plugins panel (restart Discord if asked)."
