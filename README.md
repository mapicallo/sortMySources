# SortMySources

Maps (topics) of heterogeneous references — start with **URLs**. **PWA** + **Chrome/Edge MV3 extension**. Data is **local** (IndexedDB per origin).

## Monorepo

| Package | Role |
|---------|------|
| `packages/core` | Types + Dexie DB + CRUD + JSON export/import |
| `apps/pwa` | Vite React PWA |
| `apps/extension` | Floating MV3 panel: maps, backup, search, i18n, AI4Context chrome |

## Dev

```bash
npm install
npm run dev:pwa      # http://localhost:5173 — open /sortMySources/ path if BASE set
npm run dev:ext      # watch build extension; reload in chrome://extensions
```

```bash
npm run build
```

**Extension:** Chromium → Extensions → Developer mode → **Load unpacked** → `apps/extension/dist`.  
Click the **toolbar icon** — it opens a **detachable Chrome window** (not the old anchored popup): drag via the beige strip under the **system title bar**, **corner resize**, locale selector, footer with version. Window **minimize / maximize / close** use the **native** controls on the window frame (Chrome only provides one set).  
Use **Export / Import JSON** (same format as the PWA).


> PWA (`https://…`) and extension (`chrome-extension://…`) use **different IndexedDB** origins. Exchange **JSON backups** to move data between them.

## Core rules (v0.2)

- **Map names** are unique ignoring case; creating or renaming to a duplicate fails with a clear message.
- **URLs** are not duplicated inside the same map: we store a **canonical http(s) form** (lowercase host, no `#fragment`, no useless trailing slash except root) and refuse adds that match an existing row.
- Legacy rows that look like duplicates still appear as one line in the **extension panel** preview; **Remove (×)** clears every row in that map that matches the same canonical URL.

## Env (PWA GitHub Pages)
`apps/pwa/.env.production`:

```env
VITE_BASE=/sortMySources/
```

## License

Private / TBD — align with AI4Context.
