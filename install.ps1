# SPDX-License-Identifier: MIT
#
# Kirkstagram - one-command installer for PowerShell (Windows).
#
# Spicetify-style one-liner:
#   iwr -useb https://raw.githubusercontent.com/iraqies/kirkstagram/main/install.ps1 | iex
#
# Usage:
#   powershell install.ps1 -Client vencord -Root <VENCORD>
#   powershell install.ps1 -Client vesktop -Root <VESVESKTOP dir or vencordFiles dir>
#
# (macOS/Linux users: install.sh - `sh install.sh -Client vencord`)
param(
    [string]$Client,
    [string]$Root
)

$ascii = @"
KIRKSTAGRAM
===========

  _____ _   _ _   _  ____ _____   ____ _   _ ___ _   _ 
  | ____| \ | | \ | |/ ___| ____| / ___| | | |_ _| \ | |
  |  _| |  \| |  \| | |  _|  _|   | |   | |_| || ||  \| |
  | |___| |\  | |\  | |_| | |___  | |___|  _  || || |\  |
  |_____|_| \_|_| \_|\____|_____|  \____|_| |_|___|_| \_|

  Instagram -> Kirkstagram link rewriting for Discord
  https://github.com/iraqies/kirkstagram
"@

Write-Host $ascii

$owner = 'iraqies'; $repo = 'kirkstagram'; $branch = 'main'
$base = "https://raw.githubusercontent.com/$owner/$repo/$branch"

$clients = @('vencord','vesktop','revenge','valenced','equicord')
if (-not $Client -or $Client -notin $clients) {
    do {
        $Client = Read-Host "Which client? [vencord|vesktop|revenge|valenced]"
    } while (-not ($Client -in $clients))
}

function Find-VencordRoot {
    # Prefer a real checkout (folder with package.json), then common locations
    $dirs = Get-ChildItem -Path "D:\projects\kirkstagram\.research", "$env:USERPROFILE\Documents", "$env:USERPROFILE\Desktop" -Recurse -Directory -Filter Vencord -ErrorAction SilentlyContinue 2>$null | Select-Object -First 20
    foreach ($d in $dirs) {
        if (Test-Path (Join-Path $d.FullName "package.json")) { return $d.FullName }
    }
    foreach ($v in @("$env:APPDATA\Vencord", "$env:APPDATA\vencord")) {
        if (Test-Path $v) { return $v }
    }
    return $null
}

function Get-PnpmExe {
    # Run pnpm via pnpm.exe - pnpm.ps1 is blocked by the Restricted execution policy
    $pnpmExePath = Join-Path $env:APPDATA "npm\node_modules\pnpm\pnpm.exe"
    if (Test-Path $pnpmExePath) { return Get-Item $pnpmExePath -ErrorAction SilentlyContinue }
    $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
    if ($pnpm) {
        if ($pnpm.Source -like "*.ps1") { Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -ErrorAction SilentlyContinue }
        $exe = Join-Path (Split-Path $pnpm.Source) "pnpm.exe"
        if (Test-Path $exe) { return Get-Item $exe -ErrorAction SilentlyContinue }
    }
    return $null
}

function Build-Vencord {
    param([string]$Root)
    $pnpmExe = Get-PnpmExe
    if (-not $pnpmExe) {
        Write-Error "pnpm.exe not found - install pnpm (npm i -g pnpm) or run the commands manually."
        exit 1
    }
    Write-Host "Building Vencord (pnpm install + pnpm build)..."
    Push-Location $Root
    try {
        & $pnpmExe.FullName install
        if ($LASTEXITCODE -eq 0) { & $pnpmExe.FullName build }
        if ($LASTEXITCODE -eq 0) { Write-Host "Build finished." }
        else { Write-Host "Build failed (exit code $LASTEXITCODE). Run 'pnpm install && pnpm build' in $Root manually."; exit 1 }
    } finally { Pop-Location }
}

function Sync-Vencord {
    param([string]$Root)
    $buildDist = Join-Path $Root "dist"
    $dataDist = Join-Path $env:APPDATA "Vencord\dist"
    if ((Test-Path $buildDist) -and (Test-Path $dataDist)) {
        Write-Host "Syncing Vencord files into $dataDist ..."
        Copy-Item -Recurse -Force "$buildDist\*" $dataDist
        Write-Host "Synced."
    }
}

function Install-Vencord {
    $vroot = $Root
    if (-not $vroot) { $vroot = Find-VencordRoot }
    if (-not $vroot) { Write-Error "Vencord install not found - pass -Root <VENCORD>"; exit 1 }
    if (-not (Test-Path (Join-Path $vroot "package.json"))) { Write-Error "not a Vencord checkout: $vroot"; exit 1 }
    Write-Host "Found vencord install: $vroot"

    $zipPath = Join-Path $env:TEMP "Kirkstagram.zip"
    Write-Host "Downloading $base/releases/vencord/Kirkstagram.zip ..."
    Invoke-WebRequest -Uri "$base/releases/vencord/Kirkstagram.zip" -OutFile $zipPath
    Write-Host "Installed Kirkstagram (vencord) into $vroot"
    Expand-Archive -Path $zipPath -DestinationPath $vroot -Force

    Build-Vencord $vroot
    Sync-Vencord $vroot
    Write-Host "Next: enable Kirkstagram in the vencord Plugins panel (restart Discord if asked)."
}

function Install-Vesktop {
    # Vesktop loads its Vencord bundle from vencordFiles; if all files are there
    # it uses them instead of downloading the official build. So: build the
    # Kirkstagram-patched Vencord and drop the files into that folder.
    $vroot = $Root
    if (-not $vroot) { $vroot = Find-VencordRoot }
    if (-not $vroot) { Write-Error "Vesktop flow: no Vencord checkout found - pass -Root <VENCORD>"; exit 1 }
    if (-not (Test-Path (Join-Path $vroot "package.json"))) { Write-Error "not a Vencord checkout: $vroot"; exit 1 }
    Write-Host "Found Vencord checkout: $vroot"

    Build-Vencord $vroot

    $vdist = Join-Path $vroot "dist"
    $filesDir = Join-Path $env:APPDATA "Vesktop\sessionData\vencordFiles"
    if ($Root) {
        if (Test-Path (Join-Path $Root "sessionData")) { $filesDir = Join-Path $Root "sessionData\vencordFiles" }
        elseif (Test-Path (Join-Path $Root "vencordFiles")) { $filesDir = Join-Path $Root "vencordFiles" }
        elseif (Test-Path $Root) { $filesDir = $Root }
    }
    New-Item -ItemType Directory -Path $filesDir -Force | Out-Null
    Write-Host "Vesktop Vencord files dir: $filesDir"

    $files = @(
        (Join-Path $vdist "vencordDesktopMain.js"),
        (Join-Path $vdist "vencordDesktopPreload.js"),
        (Join-Path $vdist "vencordDesktopRenderer.js"),
        (Join-Path $vdist "vencordDesktopRenderer.css")
    )
    $missing = $files | Where-Object { -not (Test-Path $_) }
    if ($missing) {
        Write-Error "missing built Vencord files in $vdist`: $($missing -join ', ')"
        exit 1
    }
    Copy-Item -Force $files -Destination $filesDir
    Write-Host "Vesktop is now using your Kirkstagram build ($filesDir)."
    Write-Host "Next: restart Vesktop and enable the Kirkstagram plugin in its Plugins panel."
}

function Install-Revenge {
    Write-Host "Install the ZIP ($base/releases/revenge/com.kirkstagram.revenge@1.0.0.zip) through the app plug-in loader, or sideload it."
    Write-Host "Then enable the plugin in the app plug-in panel and restart Discord."
}

function Install-Valenced {
    Write-Host "Add the Kirkstagram repository to Valenced (tap the + on the Plugins page, choose ""Add a repository by URL"", enter the URL):"
    Write-Host "  $base/releases/valenced/index.json"
    Write-Host "Then enable the Kirkstagram plugin from the Plugins panel and restart Discord."
    Write-Host "Sideload alternative (no repository): $base/releases/valenced/com.kirkstagram.valenced@1.0.0.zip"
}

function Install-Equicord {
    # Equicord is Vencord-based and uses the same Vencord plugin system.
    $vroot = $Root
    if (-not $vroot) { $vroot = Find-VencordRoot }
    if (-not $vroot) { Write-Error "Equicord flow: no Equicord checkout found - pass -Root <EQUICORD>"; exit 1 }
    if (-not (Test-Path (Join-Path $vroot "package.json"))) { Write-Error "not an Equicord checkout: $vroot"; exit 1 }
    Write-Host "Found Equicord checkout: $vroot"

    $zipPath = Join-Path $env:TEMP "Kirkstagram.zip"
    Write-Host "Downloading $base/releases/vencord/Kirkstagram.zip ..."
    Invoke-WebRequest -Uri "$base/releases/vencord/Kirkstagram.zip" -OutFile $zipPath
    Write-Host "Installed Kirkstagram (equicord) into $vroot"
    Expand-Archive -Path $zipPath -DestinationPath $vroot -Force

    Build-Vencord $vroot
    Sync-Vencord $vroot
    Write-Host "Next: enable Kirkstagram in the Equicord Plugins panel (restart Discord if asked)."
}

switch ($Client) {
    'vencord' { Install-Vencord }
    'vesktop' { Install-Vesktop }
    'revenge' { Install-Revenge }
    'valenced' { Install-Valenced }
    'equicord' { Install-Equicord }
}
