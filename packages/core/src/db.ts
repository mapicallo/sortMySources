import Dexie, { type Table } from 'dexie';
import type { Reference, Topic } from './types.js';

/** Single DB name; IndexedDB isolation is still per-origin (PWA ≠ extension). */
const DB_NAME = 'SortMySources_v1';

export class SortMySourcesDexie extends Dexie {
  topics!: Table<Topic, string>;
  references!: Table<Reference, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      topics: 'id, name, updatedAt',
      references: 'id, topicId, url, createdAt, type',
    });
  }
}

/** Open a new Dexie connection (call once per UI root / popup). */
export function createDb(): SortMySourcesDexie {
  return new SortMySourcesDexie();
}
