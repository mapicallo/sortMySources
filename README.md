# SortMySources

Maps (topics) of heterogeneous references — start with **URLs**. **PWA** + **Chrome/Edge MV3 extension**. Data is **local** (IndexedDB per origin).

## Monorepo

| Package | Role |
|---------|------|
| `packages/core` | Types + Dexie DB + CRUD + JSON export/import |
| `apps/pwa` | Vite React PWA |
| `apps/extension` | Toolbar popup: map picker, recent links, backup JSON, add current tab |

## Dev

```bash
npm install
npm run dev:pwa      # http://localhost:5173 — open /sortMySources/ path if BASE set
npm run dev:ext      # load apps/extension/dist unpacked (build once)
```

```bash
npm run build
```

**Extension:** Chromium → Extensions → Developer mode → Load unpacked → `apps/extension/dist`. The popup includes **Export / Import JSON** (same format as the PWA home screen tools).

> PWA (`https://…`) and extension (`chrome-extension://…`) use **different IndexedDB** origins. Exchange **JSON backups** to move data between them.

## Core rules (v0.2)

- **Map names** are unique ignoring case; creating or renaming to a duplicate fails with a clear message.
- **URLs** are not duplicated inside the same map (same normalized `http(s)` URL).
## Env (PWA GitHub Pages)

`apps/pwa/.env.production`:

```env
VITE_BASE=/sortMySources/
```

## License

Private / TBD — align with AI4Context.
