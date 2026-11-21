# Kirkstagram — Valenced adapter

Rewrites Instagram links in outgoing messages before Discord sends them.

## Interception target

On the mobile bundle the adapter patches, via `@valenced/patcher`'s `before`
hooks (the hook mutates the message object's `content` or replaces a string
payload in the args array):

```ts
// Metro module "Messages" (community-proven target; see the Valenced
// community plugin `clear-urls`):
Messages.default.sendMessage(channelId, { content }, options, extra)

// Metro module with a `sendBotMessage` export (its exports are the
// community "messageUtil"):
messageUtil.sendMessage(channelId, { content }, ...)
```

The adapter uses `@valenced/patcher`'s `before` hook, which receives the
arguments as an array, mutates the message object's `content`, and returns
the arguments array (string payloads are replaced in the args array).

Modules are located with `@valenced/modules/finders` (`getModules`,
`lookupModules`) and filters from `@valenced/modules/finders/filters`
(`withName`, `withProps`).

## Build

1. Copy the plugin into the **valenced-plugin-template** folder:

   ```sh
   mkdir -p <valenced-plugin-template>/plugins/kirkstagram
   cp platforms/valenced/index.js platforms/valenced/manifest.json <valenced-plugin-template>/plugins/kirkstagram/
   ```

   Replace `<valenced-plugin-template>` with the path of your
   `valenced-plugin-template` checkout.

2. Adjust the core import in `index.js`: from
   `<valenced-plugin-template>/plugins/kirkstagram/`, point it to
   `<KIRKSTAGRAM>/packages/core/src/index` with a relative path. Example:
   `../../../kirkstagram/packages/core/src/index` when the two checkouts are
   siblings under one directory.

3. Build the ZIP:

   ```sh
   cd <valenced-plugin-template>
   valenced-plugin build
   ```

   Produces `build/dist/com.kirkstagram.valenced@1.0.2.zip`.

## Install

1. Install: sideload the ZIP via
   **Settings > Valenced > Plugins > Install from file**, or add the ZIP to a
   Valenced repository (see the *Installing Add-ons* guide in the Valenced
   docs). **The repository index is
   [releases/valenced/index.json](releases/valenced/index.json)** — add it via
   the **+** button on the Plugins page → "Add a repository by URL", entering
   `https://raw.githubusercontent.com/iraqies/kirkstagram/main/releases/valenced/index.json`,
   then tap **Install** on the Kirkstagram entry.
2. Enable the plugin from the Plugins panel and restart Discord.

Or install the prebuilt artifact: `releases/valenced/com.kirkstagram.valenced@1.0.2.zip`
(see [RELEASES.md](RELEASES.md)). The artifact is Valenced-canonical: the ZIP
holds `manifest.json` (plugin metadata, including `dist.script`) plus
`index.js`, a self-contained bundled script with the shared core engine
inlined.

## Config

- Defaults come from the shared core (`DEFAULT_CONFIG`).
- `start({ jsonStorage })` reads persisted settings from the plugin's
  storage (`jsonStorage.cache`); writes are not part of this adapter.

| Setting | Default |
| --- | --- |
| `enabled` | `true` |
| `replacementDomain` | `www.kirkstagram.com` |
| `convertReels` / `convertPosts` / `convertTV` / `convertStories` | `true` |
| `convertOnEdit` | `true` |

## Verification (device)

- Send `Check this out https://www.instagram.com/reel/ABC123/`; confirm
  `[instagram.com/reel/ABC123](https://www.kirkstagram.com/reel/ABC123/)`
  is sent.
- Edit a message and add an Instagram link; confirm conversion.
- Check the Valenced Debug Logs screen for errors during the patch.

Documentation: https://valenced.app/docs/plugin-development/
