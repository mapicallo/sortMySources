import type { ExportedSnapshot, Reference, ReferenceSearchHit, Topic, UrlReference } from './types.js';
import type { SortMySourcesDexie } from './db.js';

function now(): number {
  return Date.now();
}

/** Normalize for uniqueness check (v1). */
function topicNameKey(raw: string): string {
  return raw.trim().toLowerCase();
}

async function topicNameExists(db: SortMySourcesDexie, name: string, excludeTopicId?: string): Promise<boolean> {
  const key = topicNameKey(name);
  if (!key) return false;
  const topics = await db.topics.toArray();
  return topics.some((t) => t.id !== excludeTopicId && topicNameKey(t.name) === key);
}

/** Stable form for comparing / storing http(s) URLs (host case, no hash, trimmed trailing slash). */
function canonicalHttpUrlHref(parsed: URL): string {
  const u = new URL(parsed.href);
  u.hostname = u.hostname.toLowerCase();
  u.hash = '';
  if (u.port === '443' && u.protocol === 'https:') u.port = '';
  if (u.port === '80' && u.protocol === 'http:') u.port = '';
  let pathname = u.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
  if (pathname === '') pathname = '/';
  u.pathname = pathname;
  return u.href;
}

/** Public identity for collapsing duplicate-looking links (popup, etc.). */
export function referenceUrlIdentity(href: string): string | null {
  try {
    return canonicalHttpUrlHref(new URL(href.trim()));
  } catch {
    return null;
  }
}

/**
 * Build a Chromium text-fragment URL (similar to «Copy link to highlight»).
 * @see https://wicg.github.io/scroll-to-text-fragment/
 */
export function buildSnippetHighlightUrl(pageUrl: string, selectedPlainText: string): string | null {
  try {
    const parsed = new URL(pageUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    const base = canonicalHttpUrlHref(parsed);
    const normalized = selectedPlainText.replace(/\s+/g, ' ').trim();
    if (!normalized) return null;

    const MAX_SINGLE = 280;
    let frag: string;
    if (normalized.length <= MAX_SINGLE) {
      frag = encodeURIComponent(normalized);
    } else {
      const chunk = Math.min(48, Math.max(24, Math.floor(normalized.length * 0.12)));
      frag = `${encodeURIComponent(normalized.slice(0, chunk))},${encodeURIComponent(normalized.slice(-chunk))}`;
    }
    return `${base}#:~:text=${frag}`;
  } catch {
    return null;
  }
}

/** Up to `limit` newest references: snippets always counted; URLs de-duplicated by canonical identity walking from newest. */
export function recentRefsForPreview(refs: Reference[], limit: number): Reference[] {
  const sorted = [...refs].sort((a, b) => a.createdAt - b.createdAt);
  const picked: Reference[] = [];
  const urlKeys = new Set<string>();
  for (let i = sorted.length - 1; i >= 0 && picked.length < limit; i--) {
    const r = sorted[i]!;
    if (r.type === 'url') {
      const k = referenceUrlIdentity(r.url);
      if (!k || urlKeys.has(k)) continue;
      urlKeys.add(k);
      picked.push(r);
    } else {
      picked.push(r);
    }
  }
  return picked.reverse();
}

/** @deprecated Use `recentRefsForPreview`; kept for callers that still import it. */
export function recentUniqueUrlReferences(refs: Reference[], limit: number): Reference[] {
  const urlsOnly = refs.filter((r): r is UrlReference => r.type === 'url');
  const sorted = urlsOnly.sort((a, b) => a.createdAt - b.createdAt);
  const picked: UrlReference[] = [];
  const keys = new Set<string>();
  for (let i = sorted.length - 1; i >= 0 && picked.length < limit; i--) {
    const r = sorted[i]!;
    const k = referenceUrlIdentity(r.url);
    if (!k || keys.has(k)) continue;
    keys.add(k);
    picked.push(r);
  }
  picked.reverse();
  return picked;
}

function normalizeImportedTopic(raw: unknown): Topic {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid topic in snapshot');
  const o = raw as Record<string, unknown>;
  const id = o.id;
  const name = o.name;
  if (typeof id !== 'string' || !id.trim()) throw new Error('Invalid topic in snapshot');
  if (typeof name !== 'string' || !name.trim()) throw new Error('Invalid topic in snapshot');
  const createdAt =
    typeof o.createdAt === 'number' ? o.createdAt : typeof o.updatedAt === 'number' ? o.updatedAt : now();
  const updatedAt = typeof o.updatedAt === 'number' ? o.updatedAt : createdAt;
  return { id, name: name.trim(), createdAt, updatedAt };
}

/** Coerce exported JSON rows into `{Reference}`; canonicalizes URLs. */
export function normalizeImportedReference(raw: unknown): Reference {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid reference in snapshot');
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id.trim() : '';
  const topicId = typeof o.topicId === 'string' ? o.topicId.trim() : '';
  if (!id || !topicId) throw new Error('Invalid reference in snapshot');

  const typeRaw = typeof o.type === 'string' ? o.type.trim().toLowerCase() : '';
  const type: 'url' | 'snippet' | 'file' =
    typeRaw === 'snippet' ? 'snippet' : typeRaw === 'file' ? 'file' : 'url';
  const titleRaw = typeof o.title === 'string' ? o.title.trim() : '';
  const createdAt =
    typeof o.createdAt === 'number' && Number.isFinite(o.createdAt)
      ? o.createdAt
      : now();

  if (type === 'snippet') {
    const body = typeof o.body === 'string' ? o.body.trim() : '';
    if (!body) throw new Error('Invalid snippet in snapshot');
    const sourceRaw = typeof o.sourcePageUrl === 'string' ? o.sourcePageUrl.trim() : '';
    let sourcePageUrl: string | undefined;
    if (sourceRaw) {
      try {
        const pu = new URL(sourceRaw);
        if (pu.protocol === 'http:' || pu.protocol === 'https:') {
          sourcePageUrl = canonicalHttpUrlHref(pu);
        }
      } catch {
        /* ignore invalid */
      }
    }
    const hiRaw = typeof o.sourceHighlightUrl === 'string' ? o.sourceHighlightUrl.trim() : '';
    let sourceHighlightUrl: string | undefined;
    if (hiRaw) {
      try {
        const hu = new URL(hiRaw);
        if ((hu.protocol === 'http:' || hu.protocol === 'https:') && hu.href.includes(':~:text')) {
          sourceHighlightUrl = hu.href;
        }
      } catch {
        /* ignore invalid */
      }
    }
    return {
      id,
      topicId,
      type: 'snippet',
      title: titleRaw || body.slice(0, 80) || 'Snippet',
      body,
      url: '',
      createdAt,
      ...(sourcePageUrl ? { sourcePageUrl } : {}),
      ...(sourceHighlightUrl ? { sourceHighlightUrl } : {}),
    };
  }

  if (type === 'file') {
    const fileName = typeof o.fileName === 'string' ? o.fileName.trim() : '';
    if (!fileName) throw new Error('Invalid file reference in snapshot');
    const size =
      typeof o.size === 'number' && Number.isFinite(o.size) ? Math.max(0, Math.floor(o.size)) : 0;
    const lastModified =
      typeof o.lastModified === 'number' && Number.isFinite(o.lastModified)
        ? Math.floor(o.lastModified)
        : createdAt;
    const relRaw = typeof o.relativePath === 'string' ? o.relativePath.trim() : '';
    const mimeTypeRaw = typeof o.mimeType === 'string' ? o.mimeType.trim() : '';
    const nestedRaw = o.nestedFileCount;
    const nested =
      typeof nestedRaw === 'number' && Number.isFinite(nestedRaw) && nestedRaw >= 1
        ? Math.floor(nestedRaw)
        : undefined;
    const locRaw = typeof o.locationNote === 'string' ? o.locationNote.trim() : '';
    return {
      id,
      topicId,
      type: 'file',
      url: '',
      title: titleRaw || (relRaw && relRaw !== fileName ? relRaw : fileName).slice(0, 240) || fileName,
      fileName,
      ...(locRaw ? { locationNote: locRaw } : {}),
      ...(relRaw ? { relativePath: relRaw } : {}),
      size,
      lastModified,
      ...(mimeTypeRaw ? { mimeType: mimeTypeRaw } : {}),
      ...(nested !== undefined ? { nestedFileCount: nested } : {}),
      createdAt,
    };
  }

  const urlRaw = typeof o.url === 'string' ? o.url.trim() : '';
  if (!urlRaw) throw new Error('Invalid URL reference in snapshot');
  let parsed: URL;
  try {
    parsed = new URL(urlRaw);
  } catch {
    throw new Error('Invalid URL reference in snapshot');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are supported in snapshot');
  }
  const canonicalHref = canonicalHttpUrlHref(parsed);

  const noteRaw = typeof o.note === 'string' ? o.note.trim() : '';
  const ref: UrlReference = {
    id,
    topicId,
    type: 'url',
    url: canonicalHref,
    title: titleRaw || parsed.hostname,
    note: noteRaw || undefined,
    createdAt,
  };
  return ref;
}

export async function createTopic(db: SortMySourcesDexie, name: string): Promise<Topic> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Topic name cannot be empty');
  if (await topicNameExists(db, trimmed)) {
    throw new Error('A map with this name already exists');
  }
  const topic: Topic = {
    id: crypto.randomUUID(),
    name: trimmed,
    createdAt: now(),
    updatedAt: now(),
  };
  await db.transaction('rw', db.topics, async () => {
    await db.topics.add(topic);
  });
  return topic;
}

export async function renameTopic(db: SortMySourcesDexie, topicId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Topic name cannot be empty');
  const t = await db.topics.get(topicId);
  if (!t) throw new Error('Topic not found');
  if (await topicNameExists(db, trimmed, topicId)) {
    throw new Error('A map with this name already exists');
  }
  await db.topics.put({ ...t, name: trimmed, updatedAt: now() });
}

export async function deleteTopic(db: SortMySourcesDexie, topicId: string): Promise<void> {
  await db.transaction('rw', db.topics, db.references, async () => {
    await db.references.where('topicId').equals(topicId).delete();
    await db.topics.delete(topicId);
  });
}

export async function listTopics(db: SortMySourcesDexie): Promise<Topic[]> {
  return db.topics.orderBy('updatedAt').reverse().toArray();
}

/** Substring search on title, URL, note/snippet body, and map name; newest first. */
export async function searchReferencesAllMaps(
  db: SortMySourcesDexie,
  query: string,
  limit = 25,
): Promise<ReferenceSearchHit[]> {
  const q = query.trim().toLowerCase();
  if (!q || limit <= 0) return [];
  const [topicRows, refs] = await Promise.all([db.topics.toArray(), db.references.toArray()]);
  const topicById = new Map(topicRows.map((t) => [t.id, t]));
  const out: ReferenceSearchHit[] = [];
  for (const r of refs) {
    const topic = topicById.get(r.topicId);
    if (!topic) continue;
    let blob = '';
    if (r.type === 'url') {
      blob = `${topic.name}\n${r.title}\n${r.url}\n${r.note ?? ''}`.toLowerCase();
    } else if (r.type === 'snippet') {
      blob =
        `${topic.name}\n${r.title}\n${r.body}\n${r.sourcePageUrl ?? ''}\n${r.sourceHighlightUrl ?? ''}`.toLowerCase();
    } else {
      blob =
        `${topic.name}\n${r.title}\n${r.fileName}\n${r.locationNote ?? ''}\n${r.relativePath ?? ''}\n${r.mimeType ?? ''}\n${r.size}\n${r.lastModified}\n${r.nestedFileCount ?? ''}`
          .toLowerCase();
    }
    if (!blob.includes(q)) continue;
    out.push({ reference: r, topic });
  }
  out.sort((a, b) => b.reference.createdAt - a.reference.createdAt);
  return out.slice(0, limit);
}

export async function addUrlReference(
  db: SortMySourcesDexie,
  topicId: string,
  opts: { url: string; title: string; note?: string },
): Promise<Reference> {
  const topic = await db.topics.get(topicId);
  if (!topic) throw new Error('Topic not found');

  let parsed: URL;
  try {
    parsed = new URL(opts.url.trim());
  } catch {
    throw new Error('Invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are supported');
  }

  const canonicalHref = canonicalHttpUrlHref(parsed);

  const inTopic = await db.references.where('topicId').equals(topicId).toArray();
  const dup = inTopic.find((r) => {
    if (r.type !== 'url') return false;
    const k = referenceUrlIdentity(r.url);
    return k !== null && k === canonicalHref;
  });
  if (dup) throw new Error('That URL is already in this map');

  const ref: UrlReference = {
    id: crypto.randomUUID(),
    topicId,
    type: 'url',
    url: canonicalHref,
    title: opts.title.trim() || parsed.hostname,
    note: opts.note?.trim() || undefined,
    createdAt: now(),
  };

  await db.transaction('rw', db.topics, db.references, async () => {
    await db.references.add(ref);
    await db.topics.put({ ...topic, updatedAt: now() });
  });
  return ref;
}

export async function addSnippetReference(
  db: SortMySourcesDexie,
  topicId: string,
  opts: { title: string; body: string; sourcePageUrl?: string; sourceHighlightUrl?: string },
): Promise<Reference> {
  const topic = await db.topics.get(topicId);
  if (!topic) throw new Error('Topic not found');

  const trimmedTitle = opts.title.trim();
  const trimmedBody = opts.body.trim();
  if (!trimmedBody) throw new Error('Snippet text cannot be empty');

  let sourcePageUrl: string | undefined;
  const src = opts.sourcePageUrl?.trim();
  if (src) {
    try {
      const pu = new URL(src);
      if (pu.protocol === 'http:' || pu.protocol === 'https:') {
        sourcePageUrl = canonicalHttpUrlHref(pu);
      }
    } catch {
      /* ignore */
    }
  }

  let sourceHighlightUrl: string | undefined;
  const hi = opts.sourceHighlightUrl?.trim();
  if (hi) {
    try {
      const hu = new URL(hi);
      if ((hu.protocol === 'http:' || hu.protocol === 'https:') && hu.href.includes(':~:text')) {
        sourceHighlightUrl = hu.href;
      }
    } catch {
      /* ignore */
    }
  }

  const ref: Reference = {
    id: crypto.randomUUID(),
    topicId,
    type: 'snippet',
    title: trimmedTitle || trimmedBody.slice(0, 80) || 'Snippet',
    body: trimmedBody,
    url: '',
    ...(sourcePageUrl ? { sourcePageUrl } : {}),
    ...(sourceHighlightUrl ? { sourceHighlightUrl } : {}),
    createdAt: now(),
  };

  await db.transaction('rw', db.topics, db.references, async () => {
    await db.references.add(ref);
    await db.topics.put({ ...topic, updatedAt: now() });
  });
  return ref;
}

export async function addFileMetadataReference(
  db: SortMySourcesDexie,
  topicId: string,
    opts: {
    fileName: string;
    /** Stored list title — if omitted, derived from name / relative path (see below). */
    title?: string;
    /** Optional path/location the user provides (browser cannot supply absolute paths). */
    locationNote?: string;
    relativePath?: string;
    size: number;
    lastModified: number;
    mimeType?: string;
    nestedFileCount?: number;
  },
): Promise<Reference> {
  const topic = await db.topics.get(topicId);
  if (!topic) throw new Error('Topic not found');

  const fileName = opts.fileName.trim();
  if (!fileName) throw new Error('File name cannot be empty');
  const rel = opts.relativePath?.trim();

  const displayStem = rel && rel !== fileName ? rel : fileName;
  const titleOverride = opts.title?.trim();
  const nested =
    typeof opts.nestedFileCount === 'number' &&
    Number.isFinite(opts.nestedFileCount) &&
    opts.nestedFileCount >= 1
      ? Math.floor(opts.nestedFileCount)
      : undefined;

  const locNote = opts.locationNote?.trim();
  const ref: Reference = {
    id: crypto.randomUUID(),
    topicId,
    type: 'file',
    url: '',
    title: titleOverride || displayStem.slice(0, 240) || fileName,
    fileName,
    ...(locNote ? { locationNote: locNote } : {}),
    ...(rel && nested === undefined ? { relativePath: rel } : {}),
    size: Number.isFinite(opts.size) && opts.size >= 0 ? Math.floor(opts.size) : 0,
    lastModified:
      typeof opts.lastModified === 'number' && Number.isFinite(opts.lastModified)
        ? Math.floor(opts.lastModified)
        : now(),
    ...(opts.mimeType?.trim() && nested === undefined ? { mimeType: opts.mimeType.trim() } : {}),
    ...(nested !== undefined ? { nestedFileCount: nested } : {}),
    createdAt: now(),
  };

  await db.transaction('rw', db.topics, db.references, async () => {
    await db.references.add(ref);
    await db.topics.put({ ...topic, updatedAt: now() });
  });
  return ref;
}

export async function listReferences(db: SortMySourcesDexie, topicId: string): Promise<Reference[]> {
  const rows = await db.references.where('topicId').equals(topicId).toArray();
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteReference(db: SortMySourcesDexie, referenceId: string): Promise<void> {
  const row = await db.references.get(referenceId);
  if (!row) return;
  const topic = await db.topics.get(row.topicId);
  await db.transaction('rw', db.topics, db.references, async () => {
    await db.references.delete(referenceId);
    if (topic) await db.topics.put({ ...topic, updatedAt: now() });
  });
}

/** Remove this URL reference and any same-canonical duplicates in that map (popup UX). Snippets and files delete only themselves. */
export async function deleteUrlReferenceGroup(db: SortMySourcesDexie, ref: Reference): Promise<void> {
  if (ref.type === 'snippet' || ref.type === 'file') {
    await deleteReference(db, ref.id);
    return;
  }
  const topic = await db.topics.get(ref.topicId);
  if (!topic) throw new Error('Topic not found');
  const key = referenceUrlIdentity(ref.url);
  const all = await db.references.where('topicId').equals(ref.topicId).toArray();
  const ids =
    key !== null
      ? all.filter((r) => r.type === 'url' && referenceUrlIdentity(r.url) === key).map((r) => r.id)
      : [ref.id];
  await db.transaction('rw', db.topics, db.references, async () => {
    for (const id of ids) await db.references.delete(id);
    await db.topics.put({ ...topic, updatedAt: now() });
  });
}

export async function updateReferenceMeta(
  db: SortMySourcesDexie,
  referenceId: string,
  opts: { title?: string; note?: string; body?: string; locationNote?: string },
): Promise<void> {
  const row = await db.references.get(referenceId);
  if (!row) throw new Error('Reference not found');
  if (row.type === 'url') {
    const title = opts.title !== undefined ? opts.title.trim() : row.title;
    await db.references.put({
      ...row,
      title: title || row.title,
      note: opts.note !== undefined ? opts.note.trim() || undefined : row.note,
    });
  } else if (row.type === 'file') {
    const title = opts.title !== undefined ? opts.title.trim() || row.title : row.title;
    await db.references.put({
      ...row,
      title,
      ...(opts.locationNote !== undefined
        ? { locationNote: opts.locationNote.trim() || undefined }
        : {}),
    });
  } else {
    const title = opts.title !== undefined ? opts.title.trim() || row.title : row.title;
    const body =
      opts.body !== undefined
        ? (() => {
            const next = opts.body.trim();
            if (!next) throw new Error('Snippet text cannot be empty');
            return next;
          })()
        : row.body;
    await db.references.put({ ...row, title, body });
  }
}

/**
 * Full backup — always emits snapshot **version 2**.
 *
 * Exports **every** `Topic` and **every** `Reference` from IndexedDB (Dexie keeps full row objects).
 * JSON includes all fields per type, e.g. URL `note`; snippet `body`, `sourcePageUrl`, `sourceHighlightUrl`;
 * file `fileName`, `locationNote`, `relativePath`, `size`, `lastModified`, `mimeType`, `nestedFileCount`.
 *
 * This is a **whole-database** snapshot (all maps). `importAll` replaces the entire local DB.
 * `parseExportedSnapshot` / `importAll` still accept legacy **v1** (URLs-only) files.
 */
export async function exportAll(db: SortMySourcesDexie): Promise<ExportedSnapshot> {
  const [topics, references] = await Promise.all([db.topics.toArray(), db.references.toArray()]);
  return { version: 2, exportedAt: now(), topics, references };
}

/**
 * Single-map export (one `Topic`, references for that id only). Same JSON shape as {@link exportAll}, but `topics` has one entry.
 * Pair with {@link importTopicFromSnapshot} on another device/profile to add a copy as a **new** map.
 */
export async function exportTopicToSnapshot(db: SortMySourcesDexie, topicId: string): Promise<ExportedSnapshot> {
  const topic = await db.topics.get(topicId);
  if (!topic) throw new Error('Map not found');
  const references = await db.references.where('topicId').equals(topicId).toArray();
  return { version: 2, exportedAt: now(), topics: [topic], references };
}

/**
 * Import exactly one map from a snapshot file: creates a **new** topic (new ids) with the imported sources.
 * Accepts v2 or legacy v1 when the file contains exactly one topic and every reference belongs to it.
 * Rejects full multi-map backups — use {@link importAll} for those.
 */
export async function importTopicFromSnapshot(db: SortMySourcesDexie, snapshot: ExportedSnapshot): Promise<Topic> {
  if (snapshot.version !== 1 && snapshot.version !== 2) {
    throw new Error('Unsupported snapshot version for map import');
  }
  if (!Array.isArray(snapshot.topics) || snapshot.topics.length !== 1) {
    throw new Error('This file must contain exactly one map (use full backup import only to restore everything)');
  }
  const topicNorm = normalizeImportedTopic(snapshot.topics[0]);
  const oldId = topicNorm.id;
  const refsRaw = snapshot.references;
  for (let i = 0; i < refsRaw.length; i++) {
    if (refsRaw[i]!.topicId !== oldId) {
      throw new Error(`Every source in the file must belong to the map being imported (see row ${i})`);
    }
  }
  let baseName = topicNorm.name.trim() || 'Imported map';
  let name = baseName;
  let suffix = 0;
  while (await topicNameExists(db, name)) {
    suffix++;
    name = `${baseName} (${suffix})`;
    if (suffix > 500) throw new Error('Could not find a free map name');
  }
  const newTopic = await createTopic(db, name);
  const newTopicId = newTopic.id;
  const newRefs: Reference[] = refsRaw.map((r) => {
    return { ...r, id: crypto.randomUUID(), topicId: newTopicId } as Reference;
  });
  await db.transaction('rw', db.topics, db.references, async () => {
    const t = await db.topics.get(newTopicId);
    if (!t) throw new Error('Map missing after create');
    for (const r of newRefs) {
      await db.references.add(r);
    }
    await db.topics.put({ ...t, updatedAt: now() });
  });
  return newTopic;
}

/**
 * Replace DB contents with snapshot (**destructive**).
 * Replaces **all** topics and references with normalized rows from the file.
 * v2 round-trips every schema field via `normalizeImportedReference` (extra keys in JSON are ignored).
 */
export async function importAll(db: SortMySourcesDexie, snapshot: ExportedSnapshot): Promise<void> {
  if (snapshot.version !== 1 && snapshot.version !== 2) throw new Error('Unsupported export version');
  const normalizedTopics = snapshot.topics.map((t, i) => {
    try {
      return normalizeImportedTopic(t);
    } catch {
      throw new Error(`Invalid topic at index ${i}`);
    }
  });
  const normalizedRefs =
    snapshot.version === 2
      ? snapshot.references.map((r, i) => {
          try {
            return normalizeImportedReference(r);
          } catch {
            throw new Error(`Invalid reference at index ${i}`);
          }
        })
      : snapshot.references.map((r, i) => {
          try {
            return normalizeImportedReference({
              ...(typeof r === 'object' && r ? r : {}),
              type: 'url',
            });
          } catch {
            throw new Error(`Invalid reference at index ${i}`);
          }
        });

  await db.transaction('rw', db.topics, db.references, async () => {
    await db.references.clear();
    await db.topics.clear();
    await db.topics.bulkAdd(normalizedTopics);
    await db.references.bulkAdd(normalizedRefs);
  });
}

export function parseExportedSnapshot(raw: string): ExportedSnapshot {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Invalid snapshot file');
  }
  if (!data || typeof data !== 'object') throw new Error('Invalid snapshot file');
  const root = data as Record<string, unknown>;
  const version = root.version;
  const exportedAt = root.exportedAt;
  const topicsRaw = root.topics;
  const refsRaw = root.references;

  if ((version !== 1 && version !== 2) || typeof exportedAt !== 'number') {
    throw new Error('Invalid snapshot file');
  }
  if (!Array.isArray(topicsRaw) || !Array.isArray(refsRaw)) {
    throw new Error('Invalid snapshot file');
  }

  const topics = topicsRaw.map((t, i) => {
    try {
      return normalizeImportedTopic(t);
    } catch {
      throw new Error(`Invalid topic at index ${i}`);
    }
  });

  if (version === 2) {
    const references = refsRaw.map((r, i) => {
      try {
        return normalizeImportedReference(r);
      } catch {
        throw new Error(`Invalid reference at index ${i}`);
      }
    });
    return { version: 2, exportedAt, topics, references };
  }

  const references = refsRaw
    .map((r, i) => {
      try {
        return normalizeImportedReference({
          ...(typeof r === 'object' && r ? r : {}),
          type: 'url',
        });
      } catch {
        throw new Error(`Invalid reference at index ${i}`);
      }
    })
    .filter((r): r is UrlReference => r.type === 'url');

  return { version: 1, exportedAt, topics, references };
}
