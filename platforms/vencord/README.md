# Kirkstagram — Vencord adapter

Rewrites Instagram links in outgoing messages via Vencord's message events
API:

- `onBeforeMessageSend` — fires before every new message is sent. The
  listener mutates `messageObj.content` in place; the message then proceeds
  with the rewritten content.
- `onBeforeMessageEdit` — fires before a message edit is applied, when the
  `convertOnEdit` setting is on.

Intercepted APIs (verified against the current Vencord source):

- `PluginDef.onBeforeMessageSend?: MessageSendListener` — `(channelId, messageObj, options, props) => void | { cancel: boolean }`
- `PluginDef.onBeforeMessageEdit?: MessageEditListener` — `(channelId, messageId, messageObj) => void | { cancel: boolean }`
- `MessageObject.content: string` — the message content the listeners mutate.

PluginManager registers the listeners via `addMessagePreSendListener` /
`addMessagePreEditListener` when the plugin starts and removes them when it
stops, so no manual cleanup is needed.

## Requirements

- A development Vencord environment (node 20+, pnpm). See
  https://docs.vencord.dev/plugins/ and https://docs.vencord.dev/installing/.

## Install

1. Copy the plugin into Vencord's plugins folder:

   ```sh
   mkdir -p <VENCORD>/src/plugins/kirkstagram
   cp <KIRKSTAGRAM>/platforms/vencord/index.ts <VENCORD>/src/plugins/kirkstagram/index.ts
   ```

   Replace `<VENCORD>` with the path of your Vencord checkout, and
   `<KIRKSTAGRAM>` with the path of your Kirkstagram checkout.

2. The plugin imports the shared conversion engine as
   `../../packages/core/src/index` — correct for the original location
   (`<KIRKSTAGRAM>/platforms/vencord/index.ts`). After step 1 the file sits at
   `<VENCORD>/src/plugins/kirkstagram/index.ts`, so adjust the import to the
   relative path from there to `<KIRKSTAGRAM>/packages/core/src/index`. Example:
   if both checkouts are siblings under `~/code`, the import becomes
   `../../../../kirkstagram/packages/core/src/index`.

3. Build Vencord and install it:

   ```sh
   cd <VENCORD>
   pnpm install
   pnpm build        # or pnpm dev to watch for changes
   pnpm inject       # installs the patched Discord into your account
   ```

4. In Discord, open **Settings → Vencord → Plugins**, enable the
   **Kirkstagram** plugin.

Alternative: `pnpm buildWeb` + install the web extension, if you prefer the
browser extension distribution.

## Use

Send a test message:

```text
Check this out https://www.instagram.com/reel/Df2l--lglbl/
```

Expected output:

```md
Check this out [instagram.com/reel/Df2l--lglbl](https://www.kirkstagram.com/reel/Df2l--lglbl/)
```

Other patterns: `/p/`, `/tv/`, `/stories/`. Query strings, fragments and the
original trailing slash are preserved.

Verify the feature on a real send:
1. Open any channel, type the example message above, send it, and check the
   rendered message.
2. Type `https://www.instagram.com/reel/ABC123/` again, edit the message and
   append a new Instagram link, then save.
3. Check the browser console (F12) for errors during send/edit.

## Settings (Vencord Settings → Vencord → Plugins → Kirkstagram)

| Setting | Type | Default | Meaning |
| --- | --- | --- | --- |
| `enabled` | toggle | on | Master switch for the plugin. |
| `replacementDomain` | string | `www.kirkstagram.com` | Host written into the generated links. |
| `convertReels` | toggle | on | Convert `/reel/{id}` links. |
| `convertPosts` | toggle | on | Convert `/p/{id}` links. |
| `convertTV` | toggle | on | Convert `/tv/{id}` links. |
| `convertStories` | toggle | on | Convert `/stories/{user}/{id}` and `/stories/{user}` links. |
| `convertOnEdit` | toggle | on | Also rewrite when you edit a message. |

The plugin is idempotent: already converted messages are not converted again,
so re-enabling the plugin or editing old messages is safe.

## How it works

`onBeforeMessageSend` / `onBeforeMessageEdit` receive the message as a
`MessageObject` and the plugin rewrites `msg.content` with the shared engine
(`packages/core`). The engine:

- matches absolute `https?://` URLs whose host is exactly `instagram.com`,
  `www.instagram.com` or `m.instagram.com` (case-insensitive), with paths
  `/reel/{id}`, `/p/{id}`, `/tv/{id}`, `/stories/{user}`, `/stories/{user}/{id}`;
- produces `[instagram.com<path>](https://<replacementDomain><path><trailingSlash><query><fragment>)`;
- skips URLs inside existing Markdown links, inline code, fenced code blocks
  and URLs preceded by a backslash;
- leaves all other message text untouched.

## Troubleshooting

- **Plugin not listed:** Vencord discovers plugins from `src/plugins/` when it
  builds. After copying the file, rebuild (`pnpm build` or `pnpm dev`).
- **Plugin enabled but nothing happens:** check that a new message contains an
  absolute Instagram link (e.g. `https://www.instagram.com/reel/ABC/`). Reload
  Discord/Vencord after enabling the plugin.
- **Existing links changed unexpectedly:** make sure you did not type an IG
  username or bare `instagram.com` string — only absolute URLs with a
  supported host and path are rewritten.

## Verification status

- Unit tests for the shared engine: run `node --test` from the Kirkstagram
  repo root (48 tests, all passing as of 2026-11-20).
- On-device Vencord testing: see the steps above; not performed in this
  environment.

Docs: https://docs.vencord.dev/plugins/ | API research: `docs/API_RESEARCH.md`
