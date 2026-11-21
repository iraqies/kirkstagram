# Kirkstagram

A plugin that rewrites Instagram links into Kirkstagram Markdown links before
they are sent, on Discord desktop and mobile clients.

## What it does

Typing:

```text
Check this out https://www.instagram.com/reel/Df2l--lglbl/
```

...the message is sent as:

```md
Check this out [instagram.com/reel/Df2l--lglbl](https://www.kirkstagram.com/reel/Df2l--lglbl/)
```

The original path is preserved, the trailing slash is preserved in the
destination, query strings and fragments are kept, and nothing else in the
message changes. Multiple links per message are supported. Already converted
messages are never converted twice.

## Supported Instagram patterns

| Pattern | Example |
| --- | --- |
| Reels | `https://www.instagram.com/reel/ABC123/` |
| Posts | `https://instagram.com/p/ABC123/` |
| IGTV | `https://m.instagram.com/tv/ABC123/` |
| Stories | `https://www.instagram.com/stories/user/123456/` |
| Story (username only) | `https://www.instagram.com/stories/user` |

Hosts: `instagram.com`, `www.instagram.com`, `m.instagram.com`. Other domains,
Kirkstagram URLs, malformed URLs, and URLs inside Markdown links or code
blocks are left untouched.

## Supported platforms

| Platform | Adapter | Status |
| --- | --- | --- |
| Vencord (desktop) | `platforms/vencord` | Verified against current source |
| Vesktop (desktop) | `platforms/vesktop` (docs only) | Compatible via stock Vencord |
| Revenge (Android) | `platforms/revenge` | Built; device test pending |
| Valenced (Android) | `platforms/valenced` | Built; device test pending |
| Equicord (desktop) | `platforms/equicord` | Vencord-based; same adapter as Vencord |

## Architecture

- `packages/core` — shared conversion engine (URL parser, rewrite engine,
  config). Platform-independent, tested with Node's test runner.
- `platforms/*` — thin client adapters (module lookup, interception, config).

See `docs/ARCHITECTURE.md` for the full design, `docs/API_RESEARCH.md` for the
API research that produced the adapters, and `docs/INSTALLATION.md` for
per-platform install steps.

## Install

### Vencord

1. Copy the plugin into Vencord's plugins folder:

   ```sh
   mkdir -p <VENCORD>/src/plugins/kirkstagram
   cp <KIRKSTAGRAM>/platforms/vencord/index.ts <VENCORD>/src/plugins/kirkstagram/index.ts
   ```

   Replace `<VENCORD>` with your Vencord checkout and `<KIRKSTAGRAM>` with
   your Kirkstagram checkout.

2. The plugin imports the shared engine as `../../packages/core/src/index` —
   correct for the original location
   (`<KIRKSTAGRAM>/platforms/vencord/index.ts`). After step 1 the file sits at
   `<VENCORD>/src/plugins/kirkstagram/index.ts`, so adjust the import to the
   relative path from there to `<KIRKSTAGRAM>/packages/core/src/index`.
   Example: if both checkouts are siblings under `~/code`, use
   `../../../../kirkstagram/packages/core/src/index`.

3. Build Vencord and install it into Discord:

   ```sh
   cd <VENCORD>
   pnpm install
   pnpm build      # or pnpm dev to watch
   pnpm inject     # installs the patched Discord
   ```

4. Open Discord → **Settings → Vencord → Plugins** → enable
   **Kirkstagram**.

   See `platforms/vencord/README.md` for a full install/use/test guide.

### Vesktop

No Vesktop adapter: Vesktop downloads the stock Vencord stack from
`Vendicated/Vencord` (verified in `Vesktop/src/main/utils/vencordLoader.ts`).

1. Copy the Vencord plugin into Vesktop's Vencord userplugins folder (or the
   folder configured via Vesktop's custom Vencord directory setting).
2. Enable **Kirkstagram** in Vencord's Plugins panel and restart Vesktop.

   See `platforms/vesktop/README.md`.

### Revenge (Android)

1. Place the plugin in the Revenge plugin repository template:

   ```sh
   mkdir -p <REvenge-plugin-template>/plugins/kirkstagram
   cp <KIRKSTAGRAM>/platforms/revenge/index.js <KIRKSTAGRAM>/platforms/revenge/manifest.json <REvenge-plugin-template>/plugins/kirkstagram/
   ```

2. Adjust the core import in `index.js`: from
   `<REvenge-plugin-template>/plugins/kirkstagram/`, point it to
   `<KIRKSTAGRAM>/packages/core/src/index` with a relative path. Example:
   `../../../kirkstagram/packages/core/src/index` when the repositories are
   siblings under one directory.

3. Build the ZIPs:

   ```sh
   cd <REvenge-plugin-template>
   ./gradlew packageAllPlugins        # or: bun run build for JS bundles
   ```

   Produces `build/dist/com.kirkstagram.revenge@1.0.0.zip`.

4. Install: add the repository containing the ZIP in the app's
   **Settings > Revenge > Plugins** (see the rrevenge-plugin-template README,
   *Distribution*), or sideload the ZIP if your Revenge version supports it.

5. Enable the plugin and restart Discord. Test by sending a Reel and editing
   a message to add a link.

   See `platforms/revenge/README.md`.

### Equicord (desktop)

Equicord is Vencord-based and uses the same Vencord plugin system.

1. Copy the adapter into Equicord's plugins folder:

   ```sh
   mkdir -p <EQUICORD>/src/plugins/kirkstagram
   cp <KIRKSTAGRAM>/platforms/equicord/index.ts <EQUICORD>/src/plugins/kirkstagram/index.ts
   ```

   Replace `<EQUICORD>` with your Equicord checkout and `<KIRKSTAGRAM>` with
   your Kirkstagram checkout.

2. Adjust the core import in `index.ts`: from
   `<EQUICORD>/src/plugins/kirkstagram/`, point it to
   `<KIRKSTAGRAM>/packages/core/src/index` with a relative path. Example:
   `../../../../kirkstagram/packages/core/src/index` when the repositories
   are siblings under one directory.

3. Build Equicord:

   ```sh
   cd <EQUICORD>
   pnpm install
   pnpm build
   pnpm inject
   ```

4. Open Discord → **Settings → Equicord → Plugins** → enable **Kirkstagram**.

   See `platforms/equicord/README.md` for a full install/use/test guide.

### Valenced (Android)

1. Place the plugin in the Valenced plugin repository template:

   ```sh
   mkdir -p <VALENCED-plugin-template>/plugins/kirkstagram
   cp <KIRKSTAGRAM>/platforms/valenced/index.js <KIRKSTAGRAM>/platforms/valenced/manifest.json <VALENCED-plugin-template>/plugins/kirkstagram/
   ```

2. Adjust the core import in `index.js` to `<KIRKSTAGRAM>/packages/core/src/index`.

3. Build the ZIP:

   ```sh
   cd <VALENCED-plugin-template>
   valenced-plugin build
   ```

   Produces `build/dist/com.kirkstagram.valenced@1.0.0.zip`.

4. Install: in the app, **Settings > Valenced > Plugins** → **Install from
   file** (sideload), or add the ZIP to a repository. Enable the plugin and
   restart Discord. Test by sending a Reel and editing a message to add a
   link.

   See `platforms/valenced/README.md`.

## Releases

One-command installation of the pre-built plugins — Spicetify-style:

```powershell
iwr -useb https://raw.githubusercontent.com/iraqies/kirkstagram/main/install.ps1 | iex
```

or non-interactively:

```powershell
powershell install.ps1 -Client vencord -Root <VENCORD>
powershell install.ps1 -Client vesktop -Root <vesktop-install-dir>
powershell install.ps1 -Client revenge -Root <@revenge-plugin-template>
powershell install.ps1 -Client valenced -Root <@valenced-plugin-template>
powershell install.ps1 -Client equicord -Root <EQUICORD>
```

Linux/macOS: `curl -fsSL https://raw.githubusercontent.com/iraqies/kirkstagram/main/install.sh | sh`.

Artifacts:

| Artifact | Platform | Version |
| --- | --- | --- |
| `releases/vencord/Kirkstagram.zip` | Vencord | 1.0.0 |
| `releases/revenge/com.kirkstagram.revenge@1.0.0.zip` | Revenge | 1.0.0 |
| `releases/valenced/com.kirkstagram.valenced@1.0.0.zip` | Valenced | 1.0.0 |

Full install instructions per artifact: [RELEASES.md](RELEASES.md).
Repository: https://github.com/iraqies/kirkstagram

## Quick start (shared engine)

```sh
node --test      # run the unit tests (npm test is the same; npm is unavailable here)
```

Build each adapter with its platform toolchain (see the per-platform
sections above). Root scripts: `npm test`, `npm run build:vencord`,
`npm run build:revenge`, `npm run build:valenced`.

## Config (defaults, all platforms)

```json
{
  "enabled": true,
  "replacementDomain": "www.kirkstagram.com",
  "convertReels": true,
  "convertPosts": true,
  "convertTV": true,
  "convertStories": true,
  "convertOnEdit": true
}
```

## Development

- Core engine: `packages/core/src/*.ts`
- Tests: `tests/*.test.ts`, run with `node --test` (Node 24+, type stripping).
- Mobile adapters: built with the platform's own tooling; see the platform
  READMEs.

## Research artifacts

The repositories used during API research are kept in `.research/`:
`Vencord`, `Vesktop`, `revenge-bundle`, `revenge-bundle-next`,
`revenge-plugin-template`, and `valenced-plugin-template`. See
`docs/API_RESEARCH.md` for the full report.

## License

The Kirkstagram project is MIT licensed. The research repositories used for
API verification are under their own licenses.
