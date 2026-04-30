import type { ExportedSnapshot, Reference, ReferenceSearchHit, Topic } from './types.js';
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

/** Up to `limit` most recent URL refs, one row per canonical identity (newest row wins). */
export function recentUniqueUrlReferences(refs: Reference[], limit: number): Reference[] {
  const asc = [...refs]
    .filter((r) => r.type === 'url')
    .sort((a, b) => a.createdAt - b.createdAt);
  const picked: Reference[] = [];
  const keys = new Set<string>();
  for (let i = asc.length - 1; i >= 0 && picked.length < limit; i--) {
    const r = asc[i]!;
    const k = referenceUrlIdentity(r.url);
    if (!k || keys.has(k)) continue;
    keys.add(k);
    picked.push(r);
  }
  picked.reverse();
  return picked;
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

/** Substring search on title, URL, note, and map name; newest first. */
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
    if (r.type !== 'url') continue;
    const topic = topicById.get(r.topicId);
    if (!topic) continue;
    const blob = `${topic.name}\n${r.title}\n${r.url}\n${r.note ?? ''}`.toLowerCase();
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

  const ref: Reference = {
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

/** Remove this URL reference and any same-canonical duplicates in that map (popup UX). */
export async function deleteUrlReferenceGroup(db: SortMySourcesDexie, ref: Reference): Promise<void> {
  const topic = await db.topics.get(ref.topicId);
  if (!topic) throw new Error('Topic not found');
  const key = ref.type === 'url' ? referenceUrlIdentity(ref.url) : null;
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
  opts: { title?: string; note?: string },
): Promise<void> {
  const row = await db.references.get(referenceId);
  if (!row) throw new Error('Reference not found');
  const title = opts.title !== undefined ? opts.title.trim() : row.title;
  await db.references.put({
    ...row,
    title: title || row.title,
    note: opts.note !== undefined ? opts.note.trim() || undefined : row.note,
  });
}

/** Full backup for JSON file (cross-origin manual sync). */
export async function exportAll(db: SortMySourcesDexie): Promise<ExportedSnapshot> {
  const [topics, references] = await Promise.all([db.topics.toArray(), db.references.toArray()]);
  return {
    version: 1,
    exportedAt: now(),
    topics,
    references,
  };
}

/** Replace DB contents with snapshot (destructive). */
export async function importAll(db: SortMySourcesDexie, snapshot: ExportedSnapshot): Promise<void> {
  if (snapshot.version !== 1) throw new Error('Unsupported export version');
  await db.transaction('rw', db.topics, db.references, async () => {
    await db.references.clear();
    await db.topics.clear();
    await db.topics.bulkAdd(snapshot.topics);
    await db.references.bulkAdd(snapshot.references);
  });
}

export function parseExportedSnapshot(raw: string): ExportedSnapshot {
  const data = JSON.parse(raw) as ExportedSnapshot;
  if (data?.version !== 1 || !Array.isArray(data.topics) || !Array.isArray(data.references)) {
    throw new Error('Invalid snapshot file');
  }
  return data;
}
