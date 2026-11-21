# Kirkstagram — Revenge adapter

Rewrites Instagram links in outgoing messages before Discord sends them.

## Interception target

The adapter patches the metro common module's `messageUtil.sendMessage`.
Verified in the app bundle (`revenge-bundle/src/lib/api/commands/index.ts`
and `src/core/commands/*`):

```ts
messageUtil.sendMessage(channelId, { content }, options, extra)
```

The adapter uses `@revenge-mod/patcher`'s `before` hook, which receives the
arguments as an array, mutates the message object's `content`, and returns
the arguments array (per the patcher docs: a `before` hook must always return
the arguments array, even when it changes nothing).

Modules are located with `@revenge-mod/modules/finders` (`lookupModules`) and
filters from `@revenge-mod/modules/finders/filters` (`withProps`).

## Build

1. Copy the plugin into the <@revenge-plugin-template> folder:

   ```sh
   mkdir -p <@revenge-plugin-template>/plugins/kirkstagram
   cp platforms/revenge/index.js platforms/revenge/manifest.json <@revenge-plugin-template>/plugins/kirkstagram/
   ```

   Replace `<revenge-plugin-template>` with the path of your
   `revenge-plugin-template` checkout.

2. Adjust the core import in `index.js`: from
   `<revenge-plugin-template>/plugins/kirkstagram/`, point it to
   `<KIRKSTAGRAM>/packages/core/src/index` with a relative path. Example:
   `../../../kirkstagram/packages/core/src/index` when the two checkouts are
   siblings under one directory.

3. Build the ZIPs:

   ```sh
   cd <@revenge-plugin-template>
   ./gradlew packageAllPlugins        # or: bun run build for JS bundles
   ```

   Produces `build/dist/com.kirkstagram.revenge@1.0.0.zip`.

## Install

1. Install the ZIP (`build/dist/com.kirkstagram.revenge@1.0.0.zip`) through
   the app's plug-in loader, or sideload the ZIP. See the `revenge-plugin-template` README (*Distribution*).
2. Enable the plugin in the app's plug-in panel and restart Discord.

Or install the prebuilt artifact via URL
(`https://raw.githubusercontent.com/iraqies/kirkstagram/main/releases/revenge/polymanifest/`)
through the app's URL-based install, or sideload the ZIP:
`releases/revenge/com.kirkstagram.revenge@1.0.0.zip` (see [RELEASES.md](RELEASES.md)).

## Config

The engine defaults (`DEFAULT_CONFIG` from the shared core) apply:

| Setting | Default |
| --- | --- |
| `enabled` | `true` |
| `replacementDomain` | `www.kirkstagram.com` |
| `convertReels` / `convertPosts` / `convertTV` / `convertStories` | `true` |
| `convertOnEdit` | `true` |

There is no settings UI in this adapter; edit `DEFAULT_CONFIG` in
`platforms/revenge/index.js` to change defaults. The conversion is
idempotent, so re-enabling or editing does not corrupt messages.

## Verification (device)

- Send `Check this out https://www.instagram.com/reel/ABC123/`; confirm
  `[instagram.com/reel/ABC123](https://www.kirkstagram.com/reel/ABC123/)`
  is sent.
- Edit a message and add an Instagram link; confirm conversion.
- Check `adb logcat | grep ReactNativeJS` for errors during the patch.

Documentation: https://revenge.palmdevs.me/docs/plugin-development/
