#!/bin/sh
# SPDX-License-Identifier: MIT
#
# Kirkstagram — one-command installer (Linux/macOS).
#
# Interactive:
#   curl -fsSL https://raw.githubusercontent.com/iraqies/kirkstagram/main/install.sh | sh
#
# Non-interactive:
#   curl -fsSL https://raw.githubusercontent.com/iraqies/kirkstagram/main/install.sh -o /tmp/install.sh
#   sh /tmp/install.sh -Client revenge -Root <@revenge-plugin-template>
set -e
owner='iraqies'; repo='kirkstagram'; branch='main'
base="https://raw.githubusercontent.com/$owner/$repo/$branch"

echo " __   __  ___  ___  _        "
echo "|  \\/  | / _ \\|_  | |       "
echo "|   \\/ | | | |  | | |       "
echo "|   |  | |_| |  | | |__      "
echo "|_|  |_|\\___/   |_|\\___/     "
echo ""
echo "Kirkstagram - Instagram-to-Kirkstagram link rewriting for Discord."

if [ -z "$1" ]; then
  printf 'Which client? [vencord|vesktop|revenge|valenced] '
  read -r client
else
  client="$1"
fi

case "$client" in
  vencord|vesktop) zip_path="releases/vencord/Kirkstagram.zip" ;;
  revenge)         zip_path="releases/revenge/com.kirkstagram.revenge@1.0.0.zip" ;;
  valenced)        zip_path="releases/valenced/com.kirkstagram.valenced@1.0.0.zip" ;;
  *) echo "Unknown client: '$client' (expected vencord|vesktop|revenge|valenced)" >&2; exit 1 ;;
esac

if [ -z "$2" ]; then
  printf 'Path to the %s installation: ' "$client"
  read -r root
else
  root="$2"
fi
if [ ! -d "$root" ]; then
  echo "Path not found: $root" >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "$base/$zip_path" -o "$tmp/Kirkstagram.zip"
unzip -qo "$tmp/Kirkstagram.zip" -d "$root"
echo "Installed Kirkstagram ($client) into $root"
echo "Next: enable Kirkstagram in the $client Plugins panel."
