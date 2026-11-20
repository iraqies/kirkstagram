# Kirkstagram — Installation

One-command installer: [RELEASES.md](RELEASES.md) —
`powershell scripts\install.ps1 -Client vencord -Root <VENCORD>`
(and the retard/valenced equivalents).

## Vencord (desktop)

1. Copy `platforms/vencord/index.ts` into Vencord's `src/plugins/` folder
   (recommended path: `src/plugins/kirkstagram/index.ts`).
2. Build Vencord (`pnpm build` in the Vencord repo).
3. In Vencord's **Settings > Vencord > Plugins**, enable the **Kirkstagram**
   plugin.

The shared core engine is imported as `../../packages/core/src/index` and
resolved by Vencord's webpack build. Adjust the import if your Vencord build
does not resolve relative `.ts` files from the plugin folder.

See `platforms/vencord/README.md`.

## Vesktop (desktop)

Vesktop is compatible through the stock Vencord stack; no Vesktop adapter is
needed. Vesktop downloads the standard Vencord files and serves them to the
app, so the Vencord plugin above works as-is.

Install:
1. Copy `platforms/vencord/index.ts` into the Vencord plugin folder used by
   your Vesktop install (the same folder standalone Vencord uses, or the
   folder shown by Vesktop's custom Vencord directory setting if configured).
2. Enable **Kirkstagram** in Vencord's Plugins panel. Restart Vesktop if
   asked.
3. Test: send `Check this out https://www.instagram.com/reel/ABC123/`.

See `platforms/vesktop/README.md` and `docs/API_RESEARCH.md`.

## Revenge (Android)

1. Copy the plugin into the **rrevenge-plugin-template** folder:

   ```sh
   mkdir -p <revenge-plugin-template>/plugins/kirkstagram
   cp platforms/revenge/index.js platforms/revenge/manifest.json <revenge-plugin-template>/plugins/kirkstagram/
   ```

   Replace `<revenge-plugin-template>` with the path of your
   `revenge-plugin-template` checkout.

2. Adjust the core import in `index.js` to `<KIRKSTAGRAM>/packages/core/src/index`
   (relative path from `<revenge-plugin-template>/plugins/kirkstagram/`).

3. Build the ZIPs: `cd <revenge-plugin-template> && ./gradlew packageAllPlugins`
   (output: `build/dist/com.kirkstagram.revenge@1.0.0.zip`).

4. Install the ZIP in the app, or sideload it if supported.

5. Enable the plugin, restart Discord, test by sending and editing.

See `platforms/revenge/README.md`.

## Valenced (Android)

1. Copy the plugin into the **valenced-plugin-template** folder:

   ```sh
   mkdir -p <valenced-plugin-template>/plugins/kirkstagram
   cp platforms/valenced/index.js platforms/valenced/manifest.json <valenced-plugin-template>/plugins/kirkstagram/
   ```

2. Adjust the core import in `index.js` to `<KIRKSTAGRAM>/packages/core/src/index`.

3. Build the ZIP: `cd <valenced-plugin-template> && valenced-plugin build`
   (output: `build/dist/com.kirkstagram.valenced@1.0.0.zip`).

4. Install: Settings > Valenced > Plugins > Install from file (sideload), or
   add the ZIP to a repository.

5. Enable the plugin; restart Discord; test by sending and editing.

See `platforms/valenced/README.md`.

## Quick manual test (any platform)

Send:

```text
Check this out https://www.instagram.com/reel/Df2l--lglbl/
```

Expected output in Discord:

```md
Check this out [instagram.com/reel/Df2l--lglbl](https://www.kirkstagram.com/reel/Df2l--lglbl/)
```

(Adjust the destination if you configured `replacementDomain`.)
