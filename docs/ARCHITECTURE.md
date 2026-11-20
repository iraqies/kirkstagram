# Kirkstagram Architecture

## Overview

One shared TypeScript conversion engine (`packages/core`), one adapter per
client (`platforms/<client>`). Adapters only contain client glue: module
lookup, message interception, config plumbing. The conversion logic lives in
one place.

```
kirkstagram/
├── packages/core/
│   └── src/
│       ├── parser.ts     URL extraction and matching
│       ├── rewrite.ts    Markdown rewrite + config toggles
│       ├── config.ts     KirkstagramConfig, defaults, validation
│       └── index.ts      public exports
├── platforms/
│   ├── vencord/          Vencord plugin (index.ts, README.md)
│   ├── vesktop/          Vesktop compatibility + install guide (README.md)
│   ├── revenge/          ND (Revenge) adapter (index.js, manifest.json)
│   └── valenced/         Valenced adapter (index.js, manifest.json)
├── tests/                Node test-runner suites (rewrite, parser, edge cases)
├── docs/                 API_RESEARCH, ARCHITECTURE, INSTALLATION
├── package.json          root scripts (test/build:vencord/build:revenge/build:valenced)
└── README.md             project overview
```

## Core: shared conversion engine

- `parser.ts` — `findInstagramUrls(text)` scans a message and returns
  `FoundInstagramUrl[]`: `{ start, end, path, trailingSlash, query, fragment,
  host, type }`. Only absolute `http(s)` URLs with the exact Instagram
  hostnames (`instagram.com`, `www.instagram.com`, `m.instagram.com`) and the
  supported paths (`/reel/{id}`, `/p/{id}`, `/tv/{id}`, `/stories/{user}`,
  `/stories/{user}/{id}`) match. Malicious lookalikes never match.
- Protected regions are excluded from matching: existing Markdown links
  (`[label](dest)`), inline code spans, fenced code blocks, and URLs preceded
  by a backslash. A URL with a longer path after the match is ignored
  (`/reel/ABC/extra` is not supported).
- `rewrite.ts` — `rewriteInstagramUrls(text, config?)` returns the message
  with each matched URL replaced by
  `[instagram.com<path>](https://<replacementDomain><path><trailingSlash><query><fragment>)`.
  Toggle flags (`convertReels`, `convertPosts`, `convertTV`, `convertStories`)
  filter by URL type. The engine is idempotent: already converted messages
  and Kirkstagram URLs never match again.
- `config.ts` — `KirkstagramConfig`, `DEFAULT_CONFIG`, `mergeConfig`,
  `validateReplacementDomain` (hostnames only: no scheme, credentials, path,
  query, fragment; no Instagram hosts).

## Platform adapters

### Vencord

`platforms/vencord/index.ts` — `definePlugin` with
`onBeforeMessageSend` / `onBeforeMessageEdit` listeners that mutate
`MessageObject.content` in place. Settings via `definePluginSettings`
(`@api/Settings`). PluginManager adds/removes the listeners on
start/stop (verified in `src/api/PluginManager.ts`).

### Vesktop

No adapter. Vesktop downloads and serves the standard Vencord stack
(`src/main/utils/vencordLoader.ts`). See `platforms/vesktop/README.md`.

### Revenge (Android)

`platforms/revenge/index.js` — `export default plugin({ preInit, init,
start(api) { api.cleanup(patchMessageUtils()) }, stop })`. Uses
`@revenge-mod/patcher`'s `before` on the metro common `messageUtil`
(verified target in the app bundle), mutating the message object and
returning the args array. Patches are registered in `start` and cleaned up via
`api.cleanup`.

### Valenced (Android)

`platforms/valenced/index.js` — same interception target as Revenge
(`@valenced/patcher`). `start({ cleanup, jsonStorage })` reads persisted
settings via `jsonStorage.cache`; `stop()` stops the patches via the
registered cleanups.

## Message flow (outgoing)

```
User types message  →  platform send entry
                     →  adapter intercepts (Vencord listeners / Revenge+Valenced patcher)
                     →  shared engine: findInstagramUrls(text)
                     →  rewriteInstagramUrls(text, config) → new content
                     →  adapter mutates message content in place
                     →  Discord proceeds with the rewritten content
```

- No messages are sent by the plugin, no Discord API requests are made, no
  attachments or metadata are touched.
- Edited messages: adapters call the rewrite in the edit hook when
  `convertOnEdit` is true (Vencord). The rewrite is idempotent, so
  re-editing a message is safe.
  re-editing is safe.
- On stop: all patcher hooks are unpatched; Vencord's PluginManager removes
  its message listeners automatically.

## Where the plugin does not do anything

- It never rewrites URLs of other domains, Kirkstagram URLs, or
  already-converted messages.
- Unsupported Instagram URLs (homepage, `/explore/*`, `/reel/` without id,
  longer paths) are left untouched.
- URLs inside Markdown links, inline code, or fenced code blocks are not
  rewritten.

## Verification strategy

- Unit tests (`tests/`, Node `node:test`): rewrite engine (standard links,
  queries, fragments, security cases, idempotency), parser
  (match details, unsupported URLs, protected regions), edge cases (unicode,
  emojis, newlines, long messages, parens, mixed types).
- Platform testing is documented per adapter in the platform READMEs
  (Vencord/Vesktop: manual; Revenge/Valenced: on-device) — see
  `docs/API_RESEARCH.md` "Verification status".
