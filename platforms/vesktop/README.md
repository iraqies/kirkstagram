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

Vesktop loads its Vencord bundle from `vencordFiles`: when all files are
there it uses them instead of downloading the official build
(`src/main/utils/vencordLoader.ts`, `isValidVencordInstall` in
`src/main/mainWindow.ts`). So the flow is:

1. Build the Kirkstagram-patched Vencord:

   ```powershell
   cd D:\projects\kirkstagram\.research\Vencord
   pnpm install && pnpm build
   ```

   The built bundle is `dist\vencordDesktopMain.js`,
   `dist\vencordDesktopPreload.js`, `dist\vencordDesktopRenderer.js` and
   `dist\vencordDesktopRenderer.css`. (The installer automates this:
   `install.ps1 -Client vesktop`.)

2. Drop those files into Vesktop's `vencordFiles` dir — the installer copies
   them there automatically. The dir is
   `%APPDATA%\Vesktop\sessionData\vencordFiles` (or `sessionData\vencordFiles`
   under a custom `vencordDir`).

3. **Restart Vesktop** — with valid files present it skips the download and
   loads the patched bundle, so the **Kirkstagram** plugin appears in the
   **Vesktop → Plugins** panel.

4. Enable the plugin and send a message with an Instagram link to verify.

## Verification notes

- Send a test message `Check this out https://www.instagram.com/reel/ABC123/`
  and confirm Discord shows
  `[instagram.com/reel/ABC123](https://www.kirkstagram.com/reel/ABC123/)`.
- Edit a message and add an Instagram link; confirm conversion happens on
  edit when `convertOnEdit` is on.
- Check the Vesktop console (Developer Tools) for errors during message send.

Documentation: https://vesktop.dev/
