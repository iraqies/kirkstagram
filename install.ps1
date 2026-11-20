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
    [ValidateSet('vencord','vesktop','revenge','valenced')][string]$Client,
    [string]$Root
)

$banner = @"

 __   __  ___  ___  _        
|  \/  | / _ \|_  | |        
|   \/ | | | |  | | |        
|   |  | |_| |  | | |__      
|_|  |_|\___/   |_|\___/     

Kirkstagram - Instagram-to-Kirkstagram link rewriting for Discord.
"@

Write-Host $banner

$clients = @('vencord','vesktop','revenge','valenced')
if (-not $Client -or $Client -notin $clients) {
    do {
        $Client = Read-Host "Which client? [vencord|vesktop|revenge|valenced]"
    } while (-not ($Client -in $clients))
}
if (-not $Root) { $Root = Read-Host "Path to the $Client installation" }
if (-not (Test-Path $Root)) { Write-Error "Path not found: $Root"; exit 1 }

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
Write-Host "Next: enable Kirkstagram in the $Client Plugins panel."
