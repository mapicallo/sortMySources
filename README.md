# SortMySources

Maps (topics) of heterogeneous references — start with **URLs**. **PWA** + **Chrome/Edge MV3 extension**. Data is **local** (IndexedDB per origin).

## Monorepo

| Package | Role |
|---------|------|
| `packages/core` | Types + Dexie DB + CRUD + JSON export/import |
| `apps/pwa` | Vite React PWA |
| `apps/extension` | Toolbar popup adds current tab to a topic |

## Dev

```bash
npm install
npm run dev:pwa      # http://localhost:5173 — open /sortMySources/ path if BASE set
npm run dev:ext      # load apps/extension/dist unpacked (build once)
```

```bash
npm run build
```

**Extension:** Chromium → Extensions → Developer mode → Load unpacked → `apps/extension/dist`.

> PWA (`https://…`) and extension (`chrome-extension://…`) use **different IndexedDB** origins. Use **Export / Import JSON** on the Settings page (PWA and popup share the same UX pattern later; v1 export is in **PWA footer**).

## Env (PWA GitHub Pages)

`apps/pwa/.env.production`:

```env
VITE_BASE=/sortMySources/
```

## License

Private / TBD — align with AI4Context.
