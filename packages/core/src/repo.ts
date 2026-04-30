import type { ExportedSnapshot, Reference, Topic } from './types.js';
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

  const inTopic = await db.references.where('topicId').equals(topicId).toArray();
  const dup = inTopic.find((r) => r.type === 'url' && r.url === parsed.href);
  if (dup) throw new Error('That URL is already in this map');

  const ref: Reference = {
    id: crypto.randomUUID(),
    topicId,
    type: 'url',
    url: parsed.href,
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
  await db.references.delete(referenceId);
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
