# Kirkstagram — API Research Report

This report records the documentation and source code reviewed before writing
any platform adapter. All signatures below are from the actual repos/docs,
not from tutorials or guesses. Research date: November 20, 2026.

## Repository log

| Repo | Clone URL | Commit |
| --- | --- | --- |
| Vencord | https://github.com/Vendicated/Vencord | `a846785` WebScreenShare: fix crash if getDisplayMedia is unavailable |
| Vesktop | https://github.com/Vencord/Vesktop | cloned 2026-11-20 |
| rrevenge-plugin-template | https://github.com/revenge-mod/revenge-plugin-template | `daaca76` |
| Revenge runtime repo | https://github.com/revenge-mod/revenge-bundle-next | cloned 2026-11-20 |
| Revenge app repo (Discord JS bundle) | https://github.com/revenge-mod/revenge-bundle | cloned 2026-11-20 |
| Revenge plugin CLI / types / themes-api | https://github.com/revenge-mod/revenge-plugin-cli, revenge-types, revenge-themes-types | (org repos, main) |
| valenced-plugin-template | https://github.com/Valenced/valenced-plugin-template | `9a4f918` feat!: rebrand to Valenced |
| Valenced app repo | https://github.com/Valenced/valenced | not cloned; referenced by docs (Valenced is Revenge Next) |

Repository URL corrections (verified 404s on the URLs in the task spec):
- `https://github.com/Vesktop/Vesktop` does not exist; the repo moved to `Vencord/Vesktop`.
- `https://github.com/revenge-mod/revenge-mod` does not exist. The main
  Revenge app repo is `revenge-mod/revenge-bundle`; the Revenge runtime repo
  is `revenge-mod/revenge-bundle-next`. The org (GitHub API) lists 17 repos;
  there is no separate `revenge-mod/revenge` client repo.

## Vencord (desktop)

Docs reviewed: https://docs.vencord.dev/plugins/ and https://docs.vencord.dev/plugins/common/
Source: Vendicated/Vencord@a846785.

### Plugin definition and lifecycle

- `definePlugin(p)` — `src/utils/types.ts:32`. `PluginDef` — `src/utils/types.ts:126-221`.
  Fields used by Kirkstagram: `name`, `description`, `tags: PluginTag[]`, `authors: PluginAuthor[]`,
  `settings?: DefinedSettings`, `onBeforeMessageSend?`, `onBeforeMessageEdit?`.
- Settings: `definePluginSettings` — `src/api/Settings.ts:261`; `OptionType` — `src/utils/types.ts:243+`.
  Read/write via `settings.store.<key>` (docs: common page, "Plugin Settings").
- Lifecycle: plugins define `start?()`/`stop?()` on the def; PluginManager calls
  them (src/api/PluginManager.ts).

### Message events (verified signatures)

From `src/api/MessageEvents.ts` and `src/api/PluginManager.ts`:

```ts
export interface MessageObject {
    content: string;
    validNonShortcutEmojis: CustomEmoji[];
    invalidEmojis: any[];
    tts: boolean;
}
export type MessageSendListener =
    (channelId: string, messageObj: MessageObject, options: SendMessageOptions, props: SendMessageProps)
        => Promisable<void | { cancel: boolean; }>;
export type MessageEditListener =
    (channelId: string, messageId: string, messageObj: MessageObject) => Promisable<void | { cancel: boolean; }>;
```

- `PluginDef.onBeforeMessageSend?: MessageSendListener` — src/utils/types.ts:214
- `PluginDef.onBeforeMessageEdit?: MessageEditListener` — src/utils/types.ts:215
- Listeners are registered on start and removed on stop:
  `addMessagePreSendListener` — src/api/MessageEvents.ts:94,
  `addMessagePreEditListener` — :101, `removeMessagePreSendListener` — :105,
  `removeMessagePreEditListener` — :108. PluginManager: startPlugin → :253-254,
  stopPlugin → :315, neededApiPlugins (MessageEventsAPI) → :362.
- Mutation model: mutate `messageObj.content` in place. Returning `undefined`
  is valid (clearURLs does exactly this — src/plugins/clearURLs/index.ts:66-72);
  `{ cancel: true }` cancels the send.

Example plugin: `src/plugins/clearURLs/index.ts` (mutates `msg.content` in
`onBeforeMessageSend` and `onBeforeMessageEdit`).

## Vesktop (desktop)

Docs reviewed: https://vesktop.dev/
Source: Vesktop/Vesktop (cloned).

- `src/main/utils/vencordLoader.ts:18-23` — `FILES_TO_DOWNLOAD` =
  `vencordDesktopMain.js`, `vencordDesktopPreload.js`,
  `vencordDesktopRenderer.js`, `vencordDesktopRenderer.css`.
  `downloadVencordFiles()` fetches the latest release from
  `https://api.github.com/repos/Vendicated/Vencord/releases/latest` and writes
  the files to `VENCORD_FILES_DIR` (defined in `src/main/vencordFilesDir.ts:13`
  = `State.store.vencordDir || join(SESSION_DATA_DIR, "vencordFiles")`).
- The app is served the Vencord stack: `GET_VENCORD_RENDERER_SCRIPT` in
  `src/main/ipc.ts:32-34`; `runVencordMain` in `src/main/mainWindow.ts:463`.
- Conclusion: Vesktop uses the stock Vencord stack (same runtime, same
  userplugins mechanism). No separate Vesktop adapter is needed.

## Revenge (Android)

Docs reviewed: https://revenge.palmdevs.me/docs/plugin-development/ (API
Reference index, Patcher, Modules, Plugins section of revenge-plugin-template
README, Revenge bundle runtime).
Source: revenge-plugin-template, revenge-bundle-next, revenge-plugin-cli.

### Plugin definition and lifecycle

- Definition entry: `export default plugin({ preInit() {}, init() {}, start(api) {}, stop() {} })`
  — `lib/plugins/src/types.ts:182-197` (`PluginLifecycles`), example entry
  `revenge-plugin-template/plugins/example-plugin/js/index.ts`.
- Start API: `PluginApi` = `{ decorate, unscoped, cleanup, plugin }` —
  `lib/plugins/src/types.ts:124-131`. `api.cleanup(fn)` registers teardown.
- Manifest format (example): `{"format":1, "id":"com.example.plugin",
  "name":..., "version":"1.0.0", "dependencies":{"revenge.api":{"version":">=1.2.1 <2"},
  "discord":{"version":"*"}}, "dist":{"script":"index.js", ...}}`
  - revenge-plugin-template/plugins/example-plugin/manifest.json.
- Build: `revenge-plugin build` (revenge-plugin-template/package.json:5-8).

### Patcher (verified signatures)

`import { before, after, instead, HookPriority } from '@revenge-mod/patcher'`
(https://revenge.palmdevs.me/docs/plugin-development/api-reference/patcher):

- `before(parent, key, hook)` — returns unpatch callback. `hook(args, self)`
  receives arguments as an array and MUST return the arguments array
  ("A before hook must return an arguments array, even when it changes
  nothing. Returning undefined throws 'target arguments is not an object'").
- Same shape on Valenced: `before(parent, key, hook)`, `HookPriority`
  (LOWEST=-1000 ... HIGHEST=1000).

### Modules (verified signatures)

- `import { lookupModules } from '@revenge-mod/modules/finders'` — generator
  yielding all matching modules; `import { withProps } from
  '@revenge-mod/modules/finders/filters'` — prop-presence filter.
  (Valenced docs, identical engine: https://valenced.app/docs/plugin-development/api-reference/modules)

### Interception target (app source)

Verified in the app bundle, `revenge-bundle/src/lib/api/commands/index.ts:71`
and `src/core/commands/{debug,eval,plugins}.ts`:

```ts
import { messageUtil } from "@metro/common";
messageUtil.sendMessage(channelId, { content }, options, extra);
```

`@metro/common` is the Discord metro common module; `messageUtil` is the
app's outgoing message submit utility.

## Valenced (Android)

Docs reviewed: https://valenced.app/docs/plugin-development/ (index via
https://valenced.app/llms.txt, API Reference pages, Migrating from Revenge).
Source: valenced-plugin-template (cloned).

### Plugin definition and lifecycle

- Definition entry: `export default plugin({ preInit(), init(), start(api), stop() })`
  — https://valenced.app/docs/plugin-development/api-reference/plugin-api
  ("Lifecycle methods receive a scoped api argument").
- `start(api)` destructures: `cleanup, decorate, plugin, unscoped,
  jsonStorage, logger` — same page.
- `api.jsonStorage` — "A per-plugin JsonStorage instance backed by
  storage.json inside the plugin's data directory"; eager-load via plugin
  declaration `jsonStorage: { load: true }`; `jsonStorage.cache` populated at
  init. Same page, "Decorated APIs / jsonStorage".
- `api.unscoped.modules` — PluginApiModules `{ finders, metro, native }`
  (import: `import * as PluginApiModulesFinders_ from '@valenced/modules/finders'`
  — lib/plugins/src/apis/modules.ts:1-2).
- Manifest: same shape as Revenge manifests; `valenced.api` dependency
  `">=1 <2"` (Migrating guide; example manifest in valenced-plugin-template).
- Build: `valenced-plugin build` (valenced-plugin-template/package.json:5-11).

### Interception target

Same as Revenge: metro common `messageUtil.sendMessage` (verified in the app
bundle, see above). Valenced is "Revenge Next"
(https://valenced.app/docs/plugin-development/migrating-from-revenge/:
"Valenced is Revenge Next under a new name"), so Retrieved ND and Valenced
message flows are the same.

## Compatibility differences

| Area | Vencord | Vesktop | Revenge | Valenced |
| --- | --- | --- | --- | --- |
| Plugin entry | `definePlugin({...})` (TS) | — (uses Vencord) | `plugin({preInit, init, start(api), stop})` (JS/TS) | same as Revenge |
| Outgoing hook | `onBeforeMessageSend` / `onBeforeMessageEdit` on plugin def | same (Vencord runtime) | patcher `before(messageUtil, 'sendMessage', ...)` | same as Revenge |
| Args shape | `(channelId, msg: MessageObject, options, props)` | — | `([channelId, message, ...rest])` must return args array | same as Revenge |
| Persistence | `settings.store` via `definePluginSettings` | same (Vencord runtime) | none in adapter | `api.jsonStorage` (`storage.json`) |
| Target function | `messageObj.content` mutation | same | metro common `messageUtil.sendMessage` | same |
| Build | none (Vencord repo build) | - | `revenge-plugin build` (gradle) | `valenced-plugin build` (Deno/Rolldown) |

## Limitations and assumptions (to verify on device)

1. Gradle/Revenge-plugin/Deno builds resolve the relative core import
   (`../../packages/core/src/index`). If a build resolves it extensionally and
   fails, fallback: copy `packages/core/src/*.ts` into the plugin folder.
2. The patch target is `messageUtil.sendMessage` in the app bundle. If
   Discord changes this path in future app versions, the module finder in the
   adapters (`withProps('messageUtil')` + function check) is the extension
   point; no undocumented internal APIs are used elsewhere.
3. Mobile adapters read config from `DEFAULT_CONFIG` in-memory (Revenge) or
   `jsonStorage` (Valenced); editing settings on mobile requires a settings
   UI that was not built (the ND/Valenced API surfaces used here do not
   include a settings UI).
4. Vesktop install: place the built plugin in Vesktop's Vencord userplugins
   folder (the same folder standalone Vencord uses; if Vesktop is configured
   with a custom Vencord directory, place it there).

## Conversion engine (shared)

Implemented once in `packages/core/src/` and used by all adapters:
`parser.ts` (URL extraction/matching), `rewrite.ts` (rewrite + config),
`config.ts` (defaults/validation), `index.ts` (exports). Not platform-specific.

## Verification status

- Core engine: unit-tested in `tests/` with Node's test runner
  (`npm test` → `node --test`). 48 tests pass as of 2026-11-20.
- Vencord adapter: NOT built/tested on a Vencord instance (no Vencord
  instance available in this environment).
- Vesktop: compatibility verified via source; no runtime test possible here.
- Revenge: NOT built with `revenge-plugin build`; not installed on a device.
- Valenced: NOT built with `valenced-plugin build`; not installed on a device.
