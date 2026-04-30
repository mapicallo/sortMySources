export type ReferenceType = 'url';

export interface Topic {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface Reference {
  id: string;
  topicId: string;
  type: ReferenceType;
  /** Normalized absolute URL string */
  url: string;
  title: string;
  note?: string;
  createdAt: number;
}

export interface ExportedSnapshot {
  version: 1;
  exportedAt: number;
  topics: Topic[];
  references: Reference[];
}
