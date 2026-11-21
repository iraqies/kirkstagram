# Kirkstagram — Equicord adapter

Rewrites Instagram links in outgoing messages before Discord sends them.

Equicord is Vencord-based and uses the same Vencord plugin system
(`src/plugins/` with the same `definePlugin` API). This adapter patches
Discord's send entry points (`async _sendMessage` / `async editMessage`)
so Instagram links are rewritten before Discord queues the message.

## Install

1. Copy the adapter into Equicord's plugins folder:

   ```sh
   mkdir -p <EQUICORD>/src/plugins/kirkstagram
   cp <KIRKSTAGRAM>/platforms/equicord/index.ts <EQUICORD>/src/plugins/kirkstagram/index.ts
   ```

   Replace `<EQUICORD>` with your Equicord checkout and `<KIRKSTAGRAM>` with
   your Kirkstagram checkout.

2. Adjust the core import in `index.js`:
   from `<EQUICORD>/src/plugins/kirkstagram/`, point it to
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

   See the Equicord README for build details:
   https://github.com/Equicord/Equicord

## Config

Defaults come from the shared core (`DEFAULT_CONFIG`):

| Setting | Default |
|---------|---------|
| `enabled` | `true` |
| `replacementDomain` | `www.kirkstagram.com` |
| `convertReels` / `convertPosts` / `convertTV` / `convertStories` | `true` |
| `convertOnEdit` | `true` |

## Verification (device)

- Send `Check this out https://www.instagram.com/reel/ABC123/`; confirm
  `[instagram.com/reel/ABC123](https://www.kirkstagram.com/reel/ABC123/)`
  is sent.
- Edit a message and add an Instagram link; confirm conversion.
