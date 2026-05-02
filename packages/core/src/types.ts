export type ReferenceType = 'url' | 'snippet' | 'file';

export interface Topic {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

interface ReferenceCommon {
  id: string;
  topicId: string;
  title: string;
  createdAt: number;
}

export interface UrlReference extends ReferenceCommon {
  type: 'url';
  /** Normalized absolute URL string */
  url: string;
  note?: string;
}

/** Text clip stored in a map. `url` is always '' in IndexedDB (Dexie index compatibility). */
export interface SnippetReference extends ReferenceCommon {
  type: 'snippet';
  body: string;
  url: '';
  /** Canonical document URL (no #:~:…) when the clip came from the browser; optional */
  sourcePageUrl?: string;
  /** Full opener with text fragment (#:~:text=…) — optional */
  sourceHighlightUrl?: string;
}

/** Local file / folder entry metadata captured via picker (browser cannot store absolute paths). */
export interface FileReference extends ReferenceCommon {
  type: 'file';
  url: '';
  fileName: string;
  /**
   * User-supplied path or location hint (e.g. pasted from Explorer). Browsers do not expose real disk paths.
   */
  locationNote?: string;
  /** When picking a folder, WebKit-style path relative to that folder */
  relativePath?: string;
  size: number;
  lastModified: number;
  mimeType?: string;
  /**
   * If set, this row summarizes a whole folder picker result: size is summed file sizes,
   * lastModified is latest among files Chrome listed, nestedFileCount is how many paths were enumerated.
   */
  nestedFileCount?: number;
}

export type Reference = UrlReference | SnippetReference | FileReference;

/** Legacy export (URL references only). */
export interface ExportedSnapshotV1 {
  version: 1;
  exportedAt: number;
  topics: Topic[];
  references: UrlReference[];
}

export interface ExportedSnapshotV2 {
  version: 2;
  exportedAt: number;
  topics: Topic[];
  references: Reference[];
}

export type ExportedSnapshot = ExportedSnapshotV1 | ExportedSnapshotV2;

export interface ReferenceSearchHit {
  reference: Reference;
  topic: Topic;
}
