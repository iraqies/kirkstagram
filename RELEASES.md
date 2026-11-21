# Kirkstagram — Releases

Pre-built release artifacts of the Kirkstagram plugins, installable with one
command. Each artifact extracts directly into the target client's root
folder; after installing, enable the plugin in the client's Plugins panel.

## Install with one command

```powershell
iwr -useb https://raw.githubusercontent.com/iraqies/kirkstagram/main/install.ps1 | iex
```

or, non-interactively (also works from a local checkout):

```powershell
powershell install.ps1 -Client vencord -Root <VENCORD>
powershell install.ps1 -Client vesktop -Root <Vesktop app dir or vencordFiles dir>
powershell install.ps1 -Client revenge -Root <@revenge-plugin-template>
powershell install.ps1 -Client valenced -Root <@valenced-plugin-template>
```

macOS/Linux users:

```sh
curl -fsSL https://raw.githubusercontent.com/iraqies/kirkstagram/main/install.sh | sh
```

(The `.sh` detects the OS via `uname` and searches common Vencord/Vesktop
locations; use `-Client`/`-Root` as above.)

Linux/macOS:

```sh
curl -fsSL https://raw.githubusercontent.com/iraqies/kirkstagram/main/install.sh | sh
```

The installer downloads the release artifact ZIPs from the repository and
extracts them into the client root. Repository:
https://github.com/iraqies/kirkstagram.

## Artifacts

| Artifact | Platform | Version | Extract into |
| --- | --- | --- | --- |
| `releases/vencord/Kirkstagram.zip` | Vencord | 1.0.0 | `<VENCORD>` |
| `releases/revenge/com.kirkstagram.revenge@1.0.0.zip` | Revenge | 1.0.0 | `<revenge-plugin-template>` |
| `releases/valenced/com.kirkstagram.valenced@1.0.2.zip` | Valenced | 1.0.2 | `<valenced-plugin-template>` |

Valenced installs external plugins from repositories: add the Kirkstagram
repository index
(`releases/valenced/index.json`) via **Settings > Valenced > Plugins → the
gear icon → "Add a repository by URL"** (URL:
`https://raw.githubusercontent.com/iraqies/kirkstagram/main/releases/valenced/index.json`),
then tap **Install** in the Browse Plugins list, enable the plugin, and
restart Discord. Sideloading the ZIP via **Install from file** also works.

## What installing puts where

- **Vencord** — the installer prefers the Vencord checkout on disk (a folder
  with `package.json`); if none is found, it falls back to the Vencord data
  dir `%APPDATA%\Vencord` (verified default in
  `src/main/utils/constants.ts:22-26`). The plugin lands at
  `<VENCORD>\src\plugins\krakstagram\index.ts` +
  `<VENCORD>\src\packages\core\src/`. When a checkout is found, the installer
  runs `pnpm build` in it (`pnpm` at
  `C:\Users\iraqies\Roaming\npm\pnpm.ps1` on this machine). Vencord compiles
  plugins from `src/plugins` and `src/userplugins` at build time (verified:
  `scripts/build/build.mjs:78`, `scripts/build/common.mjs:162`) — so after
  the build (+ reload, and `pnpm inject` if you use the patched-Discord
  setup) the plugin appears in the Plugins panel. Pass `-Root <VENCORD>` to
  skip the auto-search.
- **Revenge** — extracts into `<revenge-plugin-template>`:
  `plugins/kirkstagram/` (plugin + manifest) and `packages/core/src/` (the
  shared engine). Install the ZIP in the app (see the `revenge-plugin-template`
  README, *Distribution*), sideload it, or install via URL
  `https://raw.githubusercontent.com/iraqies/kirkstagram/main/releases/revenge/polymanifest/`,
  then enable the plugin.
- **Valenced** — extracts into `<valenced-plugin-template>`: the ZIP holds
  `manifest.json` (plugin metadata, including `dist.script`) plus `index.js`,
  a self-contained bundled script (the shared core engine is inlined, built
  with the Valenced plugin toolchain). Install/sideload the ZIP (**Settings
  > Valenced > Plugins > Install from file**) or add it to a repository, then
  enable the plugin.

## Manual fallback (no installer)

If you prefer manual extraction, use `Expand-Archive`:

```powershell
Expand-Archive -Path releases\vencord\Kirkstagram.zip -DestinationPath <VENCORD> -Force
```

## Building the artifacts

```sh
node scripts\build-releases.mjs
```

Builds the three ZIPs into `releases/`. See `platforms/*/README.md` for the
per-platform install flows from source.
