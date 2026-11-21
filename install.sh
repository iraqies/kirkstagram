#!/bin/sh
# Kirkstagram - Instagram-to-Kirkstagram link rewriting - installer (macOS/Linux).
#
# One-liner:
#   curl -fsSL https://raw.githubusercontent.com/iraqies/kirkstagram/main/install.sh | sh
#
# Usage:
#   sh install.sh [-Client vencord|vesktop|revenge|valenced] [-Root <dir>]
set -e

owner="iraqies"; repo="kirkstagram"; branch="main"
base="https://raw.githubusercontent.com/$owner/$repo/$branch"

die() { printf 'install.sh: %s\n' "$*" >&2; exit 1; }

os="$(uname -s)"
case "$os" in
    Darwin) os="macos" ;;
    Linux) os="linux" ;;
    *) die "unsupported OS: $os (this installer supports macOS and Linux)" ;;
esac

# --- arguments ---
client=""; root=""
while [ $# -gt 0 ]; do
    case "$1" in
        -Client|--client) [ $# -ge 2 ] || die "-Client requires a value"; client="$2"; shift 2 ;;
        -Root|--root) [ $# -ge 2 ] || die "-Root requires a value"; root="$2"; shift 2 ;;
        *) die "unknown argument: $1" ;;
    esac
done

cat <<'BANNER'

KIRKSTAGRAM
===========

  _____ _   _ _   _  ____ _____   ____ _   _ ___ _   _ 
  | ____| \ | | \ | |/ ___| ____| / ___| | | |_ _| \ | |
  |  _| |  \| |  \| | |  _|  _|   | |   | |_| || ||  \| |
  | |___| |\  | |\  | |_| | |___  | |___|  _  || || |\  |
  |_____|_| \_|_| \_|\____|_____|  \____|_| |_|___|_| \_|

  Instagram -> Kirkstagram link rewriting for Discord
  https://github.com/iraqies/kirkstagram
BANNER

clients="vencord|vesktop|revenge|valenced|equicord"
if [ -z "$client" ]; then
    printf 'Which client? [%s]: ' "$clients"
    IFS= read -r client
fi
case "$client" in
    vencord|vesktop|revenge|valenced|equicord) ;;
    *) die "unsupported client: $client" ;;
esac

# --- helpers ---
find_vencord_root() {
    # Prefer a real checkout (folder with package.json); common locations where
    # Vencord is usually cloned/checked out on macOS and Linux.
    local c
    for c in \
        "$HOME/Vencord" "$HOME/dev/Vencord" "$HOME/projects/Vencord" \
        "$HOME/Projects/Vencord" "$HOME/code/Vencord" "$HOME/Documents/Vencord" \
        "$HOME/Desktop/Vencord" "/opt/Vencord" "/usr/local/Vencord" \
        "$HOME/.config/Vencord" "$HOME/Library/Application Support/Vencord"
    do
        if [ -f "$c/package.json" ]; then echo "$c"; return 0; fi
    done
    return 0
}

# The Vencord data dir on POSIX, mirroring src/main/utils/constants.ts:
# join(app.getPath("userData"), "..", "Vencord")
vencord_data_dir() {
    local ud="$HOME/.config/vencord"
    if [ -d "$HOME/Library/Application Support/vencord" ]; then
        ud="$HOME/Library/Application Support/vencord"
    fi
    printf '%s/Vencord\n' "$(dirname "$ud")"
}

find_vesktop_files_dirs() {
    # Vesktop stores its Vencord bundle in vencordFiles under the app data dirs.
    local root
    for root in \
        "$HOME/.config" \
        "$HOME/Library/Application Support" \
        "$HOME/Applications" \
        "/usr/local/share"
    do
        [ -d "$root" ] || continue
        find "$root" -maxdepth 4 -type d -name vencordFiles 2>/dev/null
    done
}

unzip_to() {
    local zip="$1" dir="$2"
    if command -v unzip >/dev/null 2>&1; then
        unzip -o -q "$zip" -d "$dir"
    elif command -v bsdtar >/dev/null 2>&1; then
        bsdtar -xf "$zip" -C "$dir"
    elif command -v python3 >/dev/null 2>&1; then
        python3 -c 'import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])' "$zip" "$dir"
    else
        die "no zip extractor found (need unzip, bsdtar or python3)"
    fi
}

pnpm_bin() {
    command -v pnpm >/dev/null 2>&1 || die "pnpm not found - install it (npm i -g pnpm) or add it to PATH"
    command -v pnpm
}

build_vencord() {
    local root="$1"
    printf 'Building Vencord (pnpm install + pnpm build)...\n'
    (cd "$root" && "$(pnpm_bin)" install && "$(pnpm_bin)" build)
}

download() {
    curl -fsSL "$1" -o "$2"
}

# --- flows ---

flow_vencord() {
    local vroot="$root"
    if [ -z "$vroot" ]; then vroot="$(find_vencord_root)"; fi
    if [ -z "$vroot" ]; then
        die "Vencord install not found - pass -Root <VENCORD>"
    fi
    if [ ! -f "$vroot/package.json" ]; then
        die "not a Vencord checkout: $vroot"
    fi
    printf 'Downloading %s/releases/vencord/Kirkstagram.zip ...\n' "$base"
    local td zip
    td="$(mktemp -d)"; zip="$td/Kirkstagram.zip"
    download "$base/releases/vencord/Kirkstagram.zip" "$zip"
    printf 'Installed Kirkstagram (vencord) into %s\n' "$vroot"
    unzip_to "$zip" "$vroot"
    build_vencord "$vroot"

    local dd
    dd="$(vencord_data_dir)"
    mkdir -p "$dd/dist"
    cp -r "$vroot"/dist/. "$dd/dist/"
    printf 'Synced built files into %s/dist\n' "$dd"
    printf 'Next: enable Kirkstagram in the Vencord Plugins panel (restart Discord if asked).\n'
}

flow_vesktop() {
    # 1) build the Vencord checkout
    local vroot="$root"
    if [ -z "$vroot" ]; then vroot="$(find_vencord_root)"; fi
    if [ -z "$vroot" ]; then
        die "Vesktop flow: no Vencord checkout found - pass -Root <VENCORD>"
    fi
    if [ ! -f "$vroot/package.json" ]; then
        die "not a Vencord checkout: $vroot"
    fi
    build_vencord "$vroot"

    # 2) find Vesktop's vencordFiles dir (app uses it when it has all files)
    local vdir="" d
    if [ -n "$root" ]; then
        d="$root/sessionData/vencordFiles"
        if [ -d "$d" ]; then vdir="$d"; fi
        if [ -z "$vdir" ]; then d="$root/vencordFiles"; [ -d "$d" ] && vdir="$d"; fi
    fi
    if [ -z "$vdir" ]; then
        vdir="$(find_vesktop_files_dirs | head -n 1)"
    fi
    if [ -z "$vdir" ]; then
        vdir="$HOME/.config/Vesktop/sessionData/vencordFiles"
    fi
    mkdir -p "$vdir"

    cp "$vroot/dist/vencordDesktopMain.js" "$vroot/dist/vencordDesktopPreload.js" \
       "$vroot/dist/vencordDesktopRenderer.js" "$vroot/dist/vencordDesktopRenderer.css" "$vdir/"
    printf 'Vesktop is now using your Kirkstagram build (%s).\n' "$vdir"
    printf 'Next: restart Vesktop and enable Kirkstagram in its Plugins panel.\n'
}

flow_revenge() {
    printf 'Install the ZIP (%s/releases/revenge/com.kirkstagram.revenge@1.0.0.zip) through the app plug-in loader, or sideload it.\n' "$base"
    printf 'Then enable the plugin in the app plug-in panel and restart Discord.\n'
}

flow_valenced() {
    printf 'Add the Kirkstagram repository to Valenced (tap the + on the Plugins page, choose "Add a repository by URL", enter the URL):\n  %s/releases/valenced/index.json\n' "$base"
    printf 'Then enable the Kirkstagram plugin from the Plugins panel and restart Discord.\n'
    printf 'Sideload alternative (no repository): %s/releases/valenced/com.kirkstagram.valenced@1.0.0.zip\n' "$base"
}

flow_equicord() {
    # Equicord is Vencord-based and uses the same Vencord plugin system.
    local vroot="$root"
    if [ -z "$vroot" ]; then vroot="$(find_vencord_root)"; fi
    if [ -z "$vroot" ]; then
        die "Equicord install not found - pass -Root <EQUICORD>"
    fi
    if [ ! -f "$vroot/package.json" ]; then
        die "not an Equicord checkout: $vroot"
    fi
    printf 'Found Equicord checkout: %s\n' "$vroot"
    printf 'Downloading %s/releases/vencord/Kirkstagram.zip ...\n' "$base"
    local td zip
    td="$(mktemp -d)"; zip="$td/Kirkstagram.zip"
    download "$base/releases/vencord/Kirkstagram.zip" "$zip"
    printf 'Installed Kirkstagram (equicord) into %s\n' "$vroot"
    unzip_to "$zip" "$vroot"
    build_vencord "$vroot"

    local dd
    dd="$(vencord_data_dir)"
    mkdir -p "$dd/dist"
    cp -r "$vroot"/dist/. "$dd/dist/"
    printf 'Synced built files into %s/dist\n' "$dd"
    printf 'Next: enable Kirkstagram in the Equicord Plugins panel (restart Discord if asked).\n'
}

case "$client" in
    vencord) flow_vencord ;;
    vesktop) flow_vesktop ;;
    revenge) flow_revenge ;;
    valenced) flow_valenced ;;
    equicord) flow_equicord ;;
esac
