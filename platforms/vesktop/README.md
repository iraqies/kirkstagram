# Vesktop — compatibility and installation guide

## Compatibility

Vesktop is verified compatible through the stock Vencord stack:

- Vesktop downloads the official Vencord desktop files from
  `https://api.github.com/repos/Vendicated/Vencord/releases/latest` and serves
  them to the app (`src/main/utils/vencordLoader.ts`, `vencordFilesDir.ts`,
  `ipc.ts` in the Vesktop repo).
- Vesktop runs the same `vencordDesktopMain.js` / `vencordDesktopRenderer.js`
  files standalone Vencord uses; there is no Vesktop-specific plugin system.

Therefore: **use the Vencord adapter as-is.** No separate Vesktop adapter is
required. The plugin works because Vesktop enables the Vencord web app stack
and all message events fire through it.

## Install

1. Build the plugin with the Vencord flow (copy `platforms/vencord/index.ts`
   into your Vencord `src/plugins/` folder and build, or use the project's
   `npm run build:vencord` flow).
2. Install the plugin into Vesktop:
   - If Vesktop is configured with a custom Vencord directory
     (`State.store.vencordDir`, exposed in Vesktop settings), copy the built
     plugin into that directory's Vencord plugins/userplugins location.
   - Otherwise, copy the built plugin into the default Vencord userplugins
     folder on your OS (the same folder standalone Vencord uses).
3. Enable the plugin in Vesktop's Vencord **Plugins** panel and restart
   Vesktop if it asks.
4. Send a message with an Instagram link; verify it is converted.

## Verification notes

- Send a test message `Check this out https://www.instagram.com/reel/ABC123/`
  and confirm Discord shows
  `[instagram.com/reel/ABC123](https://www.kirkstagram.com/reel/ABC123/)`.
- Edit a message and add an Instagram link; confirm conversion happens on
  edit when `convertOnEdit` is on.
- Check the Vesktop console (Developer Tools) for errors during message send.

Documentation: https://vesktop.dev/
