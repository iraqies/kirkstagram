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
powershell install.ps1 -Client vesktop -Root <vesktop-install-dir>
powershell install.ps1 -Client revenge -Root <@revenge-plugin-template>
powershell install.ps1 -Client valenced -Root <@valenced-plugin-template>
```

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
| `releases/valenced/com.kirkstagram.valenced@1.0.0.zip` | Valenced | 1.0.0 | `<valenced-plugin-template>` |

## What installing puts where

- **Vencord** — the installer auto-finds the Vencord install: default is the
  Vencord data dir `%APPDATA%\Vencord` (verified default in
  `src/main/utils/constants.ts:22-26`); otherwise it searches `D:\` and
  `C:\Users` for a Vencord checkout (a folder with `package.json` — finds
  `.research\Vencord` on this machine). When it finds a checkout, it runs
  `pnpm build` in it. The plugin lands at
  `<VENCORD>\src\plugins\kirkstagram\index.ts` +
  `<VENCORD>\src\packages\core\src/` — and Vencord compiles plugins from
  `src/plugins` and `src/userplugins` at build time (verified:
  `scripts/build/build.mjs:78`, `scripts/build/common.mjs:162`), so the
  plugin appears in the Plugins panel after the build + reload.
  Pass `-Root <VENCORD>` to skip the auto-search.
- **Revenge** — extracts into `<revenge-plugin-template>`:
  `plugins/kirkstagram/` (plugin + manifest) and `packages/core/src/` (the
  shared engine). Install the ZIP in the app (see the `revenge-plugin-template`
  README, *Distribution*) or sideload it, then enable the plugin.
- **Valenced** — extracts into `<valenced-plugin-template>`:
  `plugins/kirkstagram/` (plugin + manifest) and `packages/core/src/` (the
  shared engine). Install/sideload the ZIP (**Settings > Valenced > Plugins >
  Install from file**) or add it to a repository, then enable the plugin.

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
