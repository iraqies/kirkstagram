#!/bin/sh
# Kirkstagram - Instagram-to-Kirkstagram link rewriting - installer (macOS/Linux).
#
# One-liner:
#   curl -fsSL https://raw.githubusercontent.com/iraqies/kirkstagram/main/install.sh | sh
#
# Usage:
#   sh install.sh [-Client vencord|vesktop|equicord|revenge|valenced] [-Root <dir>] [-Gui]
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
client=""; root=""; gui=""
while [ $# -gt 0 ]; do
    case "$1" in
        -Client|--client) [ $# -ge 2 ] || die "-Client requires a value"; client="$2"; shift 2 ;;
        -Root|--root) [ $# -ge 2 ] || die "-Root requires a value"; root="$2"; shift 2 ;;
        -Gui|--gui) gui=1; shift ;;
        *) die "unknown argument: $1" ;;
    esac
done

cat <<'BANNER'

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
BANNER

# Desktop clients shown in the interactive menu. Mobile-only mods (revenge, valenced)
# are still accepted via -Client but hidden from the PC picker.
menu_clients="vencord|vesktop|equicord"

client_lower() { printf '%s\n' "$1" | tr '[:upper:]' '[:lower:]'; }

# Graphical picker (mouse + keyboard) when available.
select_client_gui() {
    case "$(uname -s)" in
        Darwin)
            command -v osascript >/dev/null 2>&1 || return 1
            local chosen
            chosen="$(osascript -e 'choose from list {"Vencord", "Vesktop", "Equicord"} with title "Kirkstagram" with prompt "Which Discord client mod are you using?"' 2>/dev/null | tr -d '\r')"
            [ -n "$chosen" ] && [ "$chosen" != "false" ] || return 1
            client_lower "$chosen"
            ;;
        Linux)
            if command -v zenity >/dev/null 2>&1; then
                local chosen
                chosen="$(zenity --list --title="Kirkstagram" --text="Which Discord client mod are you using?" --column="Client" "Vencord" "Vesktop" "Equicord" 2>/dev/null)"
                [ -n "$chosen" ] || return 1
                client_lower "$chosen"
            elif command -v kdialog >/dev/null 2>&1; then
                local chosen
                chosen="$(kdialog --menu "Kirkstagram" 1 "Vencord" 2 "Vesktop" 3 "Equicord" --title "Which Discord client mod are you using?" 2>/dev/null)"
                [ -n "$chosen" ] || return 1
                case "$chosen" in
                    1) printf 'vencord\n' ;; 2) printf 'vesktop\n' ;; 3) printf 'equicord\n' ;; *) return 1 ;;
                esac
            else
                return 1
            fi
            ;;
        *) return 1 ;;
    esac
}

# Console arrow-key menu (bash).
select_client_console() {
    local items="vencord vesktop equicord"
    local count=3
    local index=0
    while :; do
        clear 2>/dev/null || printf '\033[2J\033[H'
        printf 'Which Discord client mod are you using?\n\n'
        local i=0
        for item in $items; do
            if [ "$i" -eq "$index" ]; then printf '  > %s\n' "$item"; else printf '    %s\n' "$item"; fi
            i=$((i+1))
        done
        printf '\n  Up/Down arrows to move - Enter to select - q to cancel\n'
        local key
        IFS= read -r -n 1 -s key
        case "$key" in
            "$(printf '\033')")
                IFS= read -r -n 1 -s k2
                IFS= read -r -n 1 -s k3
                if [ "$k2" = "[" ] && [ "$k3" = "A" ]; then
                    index=$(( (index - 1 + count) % count ))
                elif [ "$k2" = "[" ] && [ "$k3" = "B" ]; then
                    index=$(( (index + 1) % count ))
                fi
                ;;
            "$(printf '\r')"|"$(printf '\n')")
                printf '\n'
                local j=0
                for item in $items; do
                    if [ "$j" -eq "$index" ]; then printf '%s\n' "$item"; return 0; fi
                    j=$((j+1))
                done
                ;;
            q|Q)
                return 1
                ;;
        esac
    done
}

select_client() {
    if [ "$gui" = "1" ]; then
        local g; g="$(select_client_gui)" && { client="$g"; return 0; }
    fi
    if [ -n "$BASH_VERSION" ]; then
        select_client_console && return 0
    fi
    # Numbered fallback (POSIX sh).
    printf 'Which Discord client mod are you using?\n'
    printf '  1) vencord\n  2) vesktop\n  3) equicord\n'
    local n
    IFS= read -r n
    case "$n" in
        1) client=vencord ;; 2) client=vesktop ;; 3) client=equicord ;; *) return 1 ;;
    esac
}

if [ -z "$client" ]; then
    select_client || die "no client selected"
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
