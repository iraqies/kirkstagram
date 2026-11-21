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
#   powershell install.ps1 -Gui   # graphical picker (mouse + keyboard)
#
# (macOS/Linux users: install.sh - `sh install.sh -Client vencord`)
param(
    [string]$Client,
    [string]$Root,
    [switch]$Gui
)

$ascii = @"
██╗  ██╗ ██╗ ██████╗  ██╗  ██╗ ███████╗ ████████╗  █████╗   ██████╗  ██████╗   █████╗  ███╗   ███╗
██║ ██╔╝ ██║ ██╔══██╗ ██║ ██╔╝ ██╔════╝ ╚══██╔══╝ ██╔══██╗ ██╔════╝  ██╔══██╗ ██╔══██╗ ████╗ ████║
█████╔╝  ██║ ██████╔╝ █████╔╝  ███████╗    ██║    ███████║ ██║  ███╗ ██████╔╝ ███████║ ██╔████╔██║
██╔═██╗  ██║ ██╔══██╗ ██╔═██╗  ╚════██║    ██║    ██╔══██║ ██║   ██║ ██╔══██╗ ██╔══██║ ██║╚██╔╝██║
██║  ██╗ ██║ ██║  ██║ ██║  ██╗ ███████║    ██║    ██║  ██║ ╚██████╔╝ ██║  ██║ ██║  ██║ ██║ ╚═╝ ██║
╚═╝  ╚═╝ ╚═╝ ╚═╝  ╚═╝ ╚═╝  ╚═╝ ╚══════╝    ╚═╝    ╚═╝  ╚═╝  ╚═════╝  ╚═╝  ╚═╝ ╚═╝  ╚═╝ ╚═╝     ╚═╝

  Instagram -> Kirkstagram link rewriting for Discord
  https://github.com/iraqies/kirkstagram

  Windows:      iwr -useb https://raw.githubusercontent.com/iraqies/kirkstagram/main/install.ps1 | iex
  macOS/Linux:  curl -fsSL https://raw.githubusercontent.com/iraqies/kirkstagram/main/install.sh | sh
"@

# The banner uses Unicode box-drawing glyphs (OpenTUI "block" ASCII font);
# make sure the console decodes UTF-8 so they render instead of mojibake.
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

Write-Host $ascii

$owner = 'iraqies'; $repo = 'kirkstagram'; $branch = 'main'
$base = "https://raw.githubusercontent.com/$owner/$repo/$branch"

function Select-ClientMenu {
    param([string[]]$Clients, [string]$Title = "Which Discord client mod are you using?")
    if (-not $Clients -or $Clients.Count -eq 0) { return $null }

    # Graphical picker (mouse + keyboard) when requested and available.
    if ($Gui) {
        try {
            $picked = $Clients | Out-GridView -Title "Kirkstagram - $Title" -OutputMode Single
            if ($picked) { return $picked }
        } catch {}
    }

    # Console arrow-key menu.
    try {
        $index = 0
        while ($true) {
            Clear-Host
            Write-Host ""
            Write-Host "  $Title" -ForegroundColor Cyan
            Write-Host ""
            for ($i = 0; $i -lt $Clients.Count; $i++) {
                $marker = if ($i -eq $index) { ">" } else { " " }
                $color  = if ($i -eq $index) { "Yellow" } else { "Gray" }
                Write-Host ("  {0} {1}" -f $marker, $Clients[$i]) -ForegroundColor $color
            }
            Write-Host ""
            Write-Host "  Up/Down arrows to move - Enter to select - Esc to cancel" -ForegroundColor DarkGray
            $key = [Console]::ReadKey($true)
            switch ($key.Key) {
                'UpArrow'   { $index = ($index - 1 + $Clients.Count) % $Clients.Count }
                'DownArrow' { $index = ($index + 1) % $Clients.Count }
                'Enter'     { Clear-Host; return $Clients[$index] }
                'Escape'    { Clear-Host; return $null }
            }
        }
    } catch {
        try {
            $choice = Read-Host "Which client? [$($Clients -join '|')]"
            if ($choice -in $Clients) { return $choice }
        } catch {}
        return $null
    }
}

# Desktop clients shown in the interactive menu. Mobile-only mods (revenge, valenced)
# are still accepted via -Client but hidden from the PC picker.
$menuClients = @('vencord','vesktop','equicord')
$allClients = @('vencord','vesktop','equicord','revenge','valenced')
if (-not $Client) {
    $Client = Select-ClientMenu -Clients $menuClients
}
if (-not $Client -or $Client -notin $allClients) {
    Write-Error "No client selected. Supported: $($allClients -join ', ')"
    exit 1
}

function Find-VencordRoot {
    # Prefer a real checkout (folder with package.json), then common locations.
    $searchRoots = @("$env:USERPROFILE\Documents", "$env:USERPROFILE\Desktop", "$env:USERPROFILE\source", "$env:USERPROFILE\repos") |
        Where-Object { $_ -and (Test-Path $_) }
    foreach ($root in $searchRoots) {
        $dirs = Get-ChildItem -Path $root -Recurse -Directory -Filter Vencord -ErrorAction SilentlyContinue |
            Select-Object -First 20
        foreach ($d in $dirs) {
            if (Test-Path (Join-Path $d.FullName "package.json")) { return $d.FullName }
        }
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
