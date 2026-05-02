import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Reference, ReferenceSearchHit, Topic, FileReference } from '@sortmysources/core';
import {
  addSnippetReference,
  addFileMetadataReference,
  addUrlReference,
  buildSnippetHighlightUrl,
  createDb,
  createTopic,
  deleteTopic,
  deleteUrlReferenceGroup,
  exportAll,
  exportTopicToSnapshot,
  importAll,
  importTopicFromSnapshot,
  listReferences,
  listTopics,
  parseExportedSnapshot,
  referenceUrlIdentity,
  renameTopic,
  searchReferencesAllMaps,
  updateReferenceMeta,
} from '@sortmysources/core';
import { readSelectionFromFocusedPage, type CaptureSelectionIssue } from './capture-page-selection';
import { getActiveTabInLastNormalWindow } from './active-browser-tab';
import { useI18n } from './i18n-context';
import type { Messages } from './messages';
const purple = '#4f46e5';
const purpleHi = '#6366f1';
const slate = '#334155';

const zoneMid: CSSProperties = {
  padding: '10px 10px',
  marginBottom: 10,
  borderRadius: 10,
  border: '1px solid #e7e5e4',
  background: '#fafaf9',
  boxSizing: 'border-box',
};

const zoneAdd: CSSProperties = {
  padding: '10px 10px',
  marginBottom: 10,
  borderRadius: 10,
  border: '1px solid #e9d5ff',
  background: '#faf5ff',
  boxSizing: 'border-box',
};

/** Section titles the user wants visually prominent */
const panelSectionTitle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#0f172a',
  letterSpacing: '0.02em',
  lineHeight: 1.3,
};

const snippetBodyPanel: CSSProperties = {
  marginTop: 6,
  padding: '8px 10px',
  borderRadius: 6,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  maxHeight: 160,
  overflowY: 'auto',
  fontSize: 11,
  lineHeight: 1.45,
  color: '#1e293b',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const snippetCopyMiniBtn: CSSProperties = {
  flexShrink: 0,
  fontSize: 10,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 4,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  cursor: 'pointer',
  color: slate,
};

const snippetRenameMiniBtn: CSSProperties = {
  flexShrink: 0,
  fontSize: 10,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 4,
  border: `1px solid ${purpleHi}`,
  background: '#f5f3ff',
  cursor: 'pointer',
  color: purple,
};

const snippetFoldToggleMini: CSSProperties = {
  flexShrink: 0,
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1,
  padding: '1px 5px',
  borderRadius: 4,
  border: '1px solid #cbd5e1',
  background: '#f8fafc',
  cursor: 'pointer',
  color: slate,
};

type AddFoldMode = null | 'tab' | 'selection' | 'snippet' | 'file';

function snippetNavigateUrl(ref: Reference): string | undefined {
  if (ref.type !== 'snippet') return undefined;
  if (ref.sourceHighlightUrl?.startsWith('http')) return ref.sourceHighlightUrl;
  if (ref.sourcePageUrl?.startsWith('http')) return ref.sourcePageUrl;
  return undefined;
}

function formatByteSize(bytes: number): string {
  const n = Math.max(0, bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

const MIME_FRIENDLY: Record<string, { en: string; es: string }> = {
  'application/pdf': { en: 'PDF document', es: 'Documento PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    en: 'Word (.docx)',
    es: 'Word (.docx)',
  },
  'application/msword': { en: 'Word (.doc)', es: 'Word (.doc)' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    en: 'PowerPoint (.pptx)',
    es: 'PowerPoint (.pptx)',
  },
  'application/vnd.ms-powerpoint': { en: 'PowerPoint (.ppt)', es: 'PowerPoint (.ppt)' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    en: 'Excel (.xlsx)',
    es: 'Excel (.xlsx)',
  },
  'application/vnd.ms-excel': { en: 'Excel (.xls)', es: 'Excel (.xls)' },
  'text/plain': { en: 'Plain text', es: 'Texto plano' },
  'text/html': { en: 'HTML document', es: 'Documento HTML' },
  'application/json': { en: 'JSON data', es: 'Datos JSON' },
  'application/zip': { en: 'ZIP archive', es: 'Archivo ZIP' },
};

function mimeFriendlyPrimary(mime: string, localeEs: boolean): string {
  const k = mime.trim().toLowerCase();
  const row = MIME_FRIENDLY[k];
  if (row) return localeEs ? row.es : row.en;
  if (mime.startsWith('audio/')) return localeEs ? 'Audio' : 'Audio';
  if (mime.startsWith('video/')) return localeEs ? 'Vídeo' : 'Video';
  if (mime.startsWith('image/')) return localeEs ? `Imagen (${mime})` : `Image (${mime})`;
  if (mime.startsWith('text/')) return localeEs ? `Texto (${mime})` : `Text (${mime})`;
  return mime;
}

/** First path segment from webkit-relative paths Chrome gives when a folder was picked */
function folderPickRootLabel(snapshot: readonly File[]): string {
  const first = snapshot[0];
  if (!first) throw new Error('Empty selection');
  const wf = first as File & { webkitRelativePath?: string };
  const rp = wf.webkitRelativePath?.trim();
  if (!rp) return first.name.replace(/\\/g, '/');
  const segment = rp.split(/[/\\]/)[0];
  return (segment ?? '').trim() || first.name;
}

function formatFileDetailText(r: FileReference, messages: Messages, localeTag: string, localeEs: boolean): string {
  const lines: string[] = [];
  const isAgg = typeof r.nestedFileCount === 'number';
  lines.push(`${messages.fileDetailFileNameLabel}: ${r.fileName}`);
  if (r.locationNote?.trim()) {
    lines.push(`${messages.fileDetailLocationNoteLabel}: ${r.locationNote.trim()}`);
  }
  if (isAgg) {
    const nfmt = Number(r.nestedFileCount).toLocaleString(localeTag);
    lines.push(messages.fileDetailNestedFilesLine(nfmt));
    lines.push(messages.fileDetailCombinedSizeHint);
    lines.push(messages.fileDetailFolderNewestModifiedHint);
    lines.push(`${messages.fileDetailSize}: ${formatByteSize(r.size)}`);
    lines.push(
      `${messages.fileDetailModified}: ${new Date(r.lastModified).toLocaleString(localeTag, {
        dateStyle: 'short',
        timeStyle: 'short',
      })}`,
    );
    return lines.join('\n');
  }
  if (r.relativePath?.trim()) {
    lines.push(`${messages.fileDetailRelativePathLabel}: ${r.relativePath}`);
  } else {
    lines.push(messages.fileDetailRelativePathAbsent);
  }
  lines.push(`${messages.fileDetailSize}: ${formatByteSize(r.size)}`);
  lines.push(
    `${messages.fileDetailModified}: ${new Date(r.lastModified).toLocaleString(localeTag, {
      dateStyle: 'short',
      timeStyle: 'short',
    })}`,
  );
  const raw = r.mimeType?.trim();
  if (raw) {
    const nice = mimeFriendlyPrimary(raw, localeEs);
    lines.push(`${messages.fileDetailKind}: ${nice}`);
    const lowNice = nice.toLowerCase();
    const lowRaw = raw.toLowerCase();
    if (lowNice !== lowRaw && !lowNice.includes(lowRaw)) {
      lines.push(`${messages.fileDetailTechnicalMimeNote} ${raw}`);
    }
  } else {
    lines.push(`${messages.fileDetailKind}: ${messages.fileDetailUnknownKind}`);
  }
  return lines.join('\n');
}

function referenceRowPrimaryLabel(
  r: Reference,
  snippetFallback: string,
  fileFallback: string,
  folderAggFallback: string,
): string {
  if (r.type === 'url') return r.title || r.url;
  if (r.type === 'snippet') return r.title || snippetFallback;
  if (r.type === 'file' && typeof r.nestedFileCount === 'number') return r.title || r.fileName || folderAggFallback;
  return r.title || r.fileName || fileFallback;
}

function referenceRowTitleColor(nav: string | undefined, r: Reference): string {
  if (r.type === 'url') return '#2563eb';
  if (r.type === 'snippet') return nav ? '#2563eb' : '#0f766e';
  return '#92400e';
}

/** Value shown when opening «rename»; matches what users see as the row label where possible. */
function initialRenameDraft(r: Reference): string {
  const stored = r.title?.trim() ?? '';
  if (r.type === 'url') return stored || r.url;
  if (r.type === 'snippet') return stored;
  return stored || r.fileName || '';
}

export function SortMySourcesPanelContent() {
  const { messages: m, locale } = useI18n();
  const localeEs = locale === 'es';
  const localeTag = localeEs ? 'es' : 'en';
  const db = useMemo(() => createDb(), []);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState('');
  const [previewRefs, setPreviewRefs] = useState<Reference[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<ReferenceSearchHit[]>([]);
  const [dataRevision, setDataRevision] = useState(0);
  const [newTopicName, setNewTopicName] = useState('');
  const [snippetTitle, setSnippetTitle] = useState('');
  const [snippetBody, setSnippetBody] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  /** Optional path/location note when adding file metadata (browser does not provide real paths). */
  const [fileMetaLocationNote, setFileMetaLocationNote] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const importMapRef = useRef<HTMLInputElement>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);
  const folderPickerRef = useRef<HTMLInputElement>(null);
  /** Always in sync with topicId; survives async gaps where React defers setState updaters. */
  const topicIdRef = useRef('');

  /** null = still checking */
  const [activeTabOk, setActiveTabOk] = useState<boolean | null>(null);
  /** Shown title for «Add current tab»; resets when active tab URL changes. */
  const [tabSaveTitleDraft, setTabSaveTitleDraft] = useState('');
  /** Avoid overwriting the draft while typing until the underlying tab URL changes. */
  const tabSaveTitleSyncUrlRef = useRef('');
  /** Snippet ref id whose body is shown expanded (search + recent lists). */
  const [expandedSnippetId, setExpandedSnippetId] = useState<string | null>(null);
  /** Multi-select for bulk delete in «Saved sources» list */
  const [selectedSavedRefIds, setSelectedSavedRefIds] = useState<Set<string>>(() => new Set());
  const selectAllSavedRef = useRef<HTMLInputElement | null>(null);

  /** Inline rename title for a saved source */
  const [renamingSourceId, setRenamingSourceId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [renameLocationDraft, setRenameLocationDraft] = useState('');
  /** Rename selected map (topic) */
  const [mapRenameOpen, setMapRenameOpen] = useState(false);
  const [mapRenameDraft, setMapRenameDraft] = useState('');

  /** Add-sources accordion — only one pane open */
  const [addFold, setAddFold] = useState<AddFoldMode>(null);
  const [selectionDraftTitle, setSelectionDraftTitle] = useState('');
  const [selectionDraftBody, setSelectionDraftBody] = useState('');
  const [selectionPageUrl, setSelectionPageUrl] = useState('');
  const [selectionPullErr, setSelectionPullErr] = useState<string | null>(null);

  useEffect(() => {
    topicIdRef.current = topicId;
  }, [topicId]);

  useEffect(() => {
    setExpandedSnippetId(null);
    setSelectedSavedRefIds(new Set());
    setRenamingSourceId(null);
    setRenameDraft('');
    setRenameLocationDraft('');
    setMapRenameOpen(false);
    setMapRenameDraft('');
  }, [topicId]);

  useEffect(() => {
    setSelectedSavedRefIds((prev) => {
      const ids = new Set(previewRefs.map((r) => r.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [previewRefs]);

  useEffect(() => {
    const el = selectAllSavedRef.current;
    if (!el || previewRefs.length === 0) {
      return;
    }
    el.indeterminate =
      selectedSavedRefIds.size > 0 && selectedSavedRefIds.size < previewRefs.length;
  }, [previewRefs.length, selectedSavedRefIds]);

  const loadPreviewRefs = useCallback(async (tid: string) => {
    if (!tid) {
      setPreviewRefs([]);
      return;
    }
    const all = await listReferences(db, tid);
    const sorted = [...all].sort((a, b) => b.createdAt - a.createdAt);
    setPreviewRefs(sorted);
  }, [db]);

  const switchToMap = useCallback(
    (tid: string) => {
      topicIdRef.current = tid;
      setTopicId(tid);
      void loadPreviewRefs(tid);
    },
    [loadPreviewRefs],
  );

  /** Returns selected map id. Uses refs so returning after `await` is not broken by deferred React updates. */
  const reloadTopics = useCallback(async (): Promise<string> => {
    const ts = await listTopics(db);
    setTopics(ts);
    const prev = topicIdRef.current;
    const nextId = prev && ts.some((t) => t.id === prev) ? prev : ts[0]?.id ?? '';
    topicIdRef.current = nextId;
    setTopicId(nextId);
    return nextId;
  }, [db]);



  useEffect(() => {
    void (async () => {
      const tid = await reloadTopics();
      await loadPreviewRefs(tid);
    })();
  }, [reloadTopics, loadPreviewRefs]);

  useEffect(() => {
    let cancelled = false;
    const q = searchQuery.trim();
    if (!q) {
      setSearchHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        const hits = await searchReferencesAllMaps(db, q, 25);
        if (!cancelled) setSearchHits(hits);
      })();
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, dataRevision, db]);



  useEffect(() => {
    let cancelled = false;
    async function checkActiveTabHttp() {
      try {
        const tab = await getActiveTabInLastNormalWindow();
        const u = tab?.url ?? '';
        const ok = u.startsWith('http://') || u.startsWith('https://');
        if (!cancelled) {
          setActiveTabOk(ok);
          if (ok) {
            setErr(null);
            const prev = tabSaveTitleSyncUrlRef.current;
            if (u !== prev) {
              tabSaveTitleSyncUrlRef.current = u;
              const suggested = tab?.title?.trim() || new URL(u).hostname;
              setTabSaveTitleDraft(suggested);
            }
          }
        }
      } catch {
        if (!cancelled) setActiveTabOk(false);
      }
    }
    void checkActiveTabHttp();
    const refresh = () => {
      void checkActiveTabHttp();
    };
    chrome.tabs.onActivated.addListener(refresh);
    chrome.tabs.onUpdated.addListener(refresh);
    return () => {
      cancelled = true;
      chrome.tabs.onActivated.removeListener(refresh);
      chrome.tabs.onUpdated.removeListener(refresh);
    };
  }, []);

  async function handleExportBackup() {
    setErr(null);
    setMsg(null);
    try {
      const snap = await exportAll(db);
      const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = `sortmysources-backup-${snap.exportedAt}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setMsg(m.backupDownloaded);
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  async function handleImportBackup(f: File) {
    setErr(null);
    setMsg(null);
    try {
      const text = await f.text();
      const snap = parseExportedSnapshot(text);
      if (!window.confirm(m.importConfirm)) return;
      await importAll(db, snap);
      const nid = await reloadTopics();
      await loadPreviewRefs(nid);
      setMsg(m.backupImported);
      setDataRevision((n) => n + 1);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  async function handleExportSelectedMap() {
    setErr(null);
    setMsg(null);
    const tid = topicIdRef.current;
    if (!tid) {
      setErr(m.errSelectMap);
      return;
    }
    try {
      const snap = await exportTopicToSnapshot(db, tid);
      const t = await db.topics.get(tid);
      const safe = (t?.name ?? 'map')
        .replace(/[^\w\-\s]+/g, '_')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 48) || 'map';
      const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = `sortmysources-map-${safe}-${snap.exportedAt}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setMsg(m.exportMapDone);
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  async function handleImportMapFile(f: File) {
    setErr(null);
    setMsg(null);
    try {
      const text = await f.text();
      const snap = parseExportedSnapshot(text);
      const topic = await importTopicFromSnapshot(db, snap);
      const ts = await listTopics(db);
      setTopics(ts);
      switchToMap(topic.id);
      setMsg(m.importMapDone(topic.name));
      setDataRevision((n) => n + 1);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  async function handleAddQuickTopic(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      const t = await createTopic(db, newTopicName);
      setNewTopicName('');
      setTopicId(t.id);
      topicIdRef.current = t.id;
      const nid = await reloadTopics();
      await loadPreviewRefs(nid);
      setMsg(m.createdMap(t.name));
      setDataRevision((n) => n + 1);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  async function copySnippetToClipboard(body: string) {
    try {
      await navigator.clipboard.writeText(body);
      setMsg(m.snippetCopied);
      window.setTimeout(() => setMsg(null), 2200);
    } catch {
      setErr(m.copySnippetFailed);
    }
  }

  async function handleAddSnippet(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      if (!topicIdRef.current) {
        setErr(m.errSelectMap);
        return;
      }
      const tid = topicIdRef.current;
      await addSnippetReference(db, tid, { title: snippetTitle.trim(), body: snippetBody });
      setSnippetTitle('');
      setSnippetBody('');
      const nid = await reloadTopics();
      await loadPreviewRefs(nid);
      setMsg(m.addedSnippetDone);
      setDataRevision((n) => n + 1);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  async function handleAddTab() {
    setErr(null);
    setMsg(null);
    try {
      if (!topicIdRef.current) {
        setErr(m.errSelectMap);
        return;
      }
      if (activeTabOk === false) {
        setErr(m.errTabHttpShort);
        return;
      }
      if (activeTabOk === null) {
        return;
      }
      const tab = await getActiveTabInLastNormalWindow();
      const u = tab?.url;
      if (!u?.startsWith('http://') && !u?.startsWith('https://')) {
        setErr(m.errTabHttpShort);
        return;
      }
      const trimmedDraft = tabSaveTitleDraft.trim();
      const fallbackTitle = tab?.title?.trim() || new URL(u).hostname;
      const title = trimmedDraft || fallbackTitle;
      const tid = topicIdRef.current;
      await addUrlReference(db, tid, { url: u, title });
      const nid = await reloadTopics();
      await loadPreviewRefs(nid);
      setMsg(m.addedTabDone);
      setDataRevision((n) => n + 1);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  function msgForSelectionIssue(issue: CaptureSelectionIssue): string {
    switch (issue) {
      case 'no_tab':
        return m.errSelectionNoTab;
      case 'not_http':
        return m.errSelectionNotHttp;
      case 'empty':
        return m.errSelectionEmpty;
      case 'script_failed':
        return m.errSelectionScriptFailed;
    }
  }

  const refreshSelectionDraft = useCallback(async () => {
    setSelectionPullErr(null);
    const r = await readSelectionFromFocusedPage();
    if (r.ok) {
      setSelectionDraftBody(r.text);
      setSelectionPageUrl(r.pageUrl);
      setSelectionDraftTitle(r.pageTitle || '');
      return;
    }
    if (r.issue === 'no_tab' || r.issue === 'not_http') setSelectionPageUrl('');
    else if (r.pageUrl) setSelectionPageUrl(r.pageUrl);
    if (r.issue === 'empty') setSelectionDraftBody('');
    setSelectionPullErr(msgForSelectionIssue(r.issue));
  }, [m]);

  useEffect(() => {
    if (addFold !== 'selection') return;
    void refreshSelectionDraft();
  }, [addFold, refreshSelectionDraft]);

  async function handleSaveSelection(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setSelectionPullErr(null);
    try {
      if (!topicIdRef.current) {
        setErr(m.errSelectMap);
        return;
      }
      const trimmed = selectionDraftBody.trim();
      if (!trimmed) {
        setErr(m.errSelectionEmpty);
        return;
      }
      const hilite =
        selectionPageUrl && trimmed ? buildSnippetHighlightUrl(selectionPageUrl, trimmed) : null;
      const tid = topicIdRef.current;
      await addSnippetReference(db, tid, {
        title: selectionDraftTitle.trim(),
        body: trimmed,
        sourcePageUrl: selectionPageUrl || undefined,
        ...(hilite ? { sourceHighlightUrl: hilite } : {}),
      });
      const nid = await reloadTopics();
      await loadPreviewRefs(nid);
      setMsg(m.addedSelectionDone);
      setDataRevision((n) => n + 1);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  function toggleAddFold(mode: Exclude<AddFoldMode, null>) {
    setSelectionPullErr(null);
    setAddFold((cur) => (cur === mode ? null : mode));
  }

  async function handleLocalFilesChosen(snapshot: readonly File[], fromFolder: boolean) {
    if (!snapshot.length) return;
    setErr(null);
    setMsg(null);
    try {
      if (!topicIdRef.current) {
        setErr(m.errSelectMap);
        return;
      }
      const tid = topicIdRef.current;
      const locationExtra = fileMetaLocationNote.trim();

      if (fromFolder) {
        const folderName = folderPickRootLabel(snapshot);
        let totalSize = 0;
        let maxM = 0;
        for (const f of snapshot) {
          totalSize += f.size;
          maxM = Math.max(maxM, f.lastModified);
        }
        if (!Number.isSafeInteger(totalSize)) totalSize = Number.MAX_SAFE_INTEGER;
        await addFileMetadataReference(db, tid, {
          fileName: folderName,
          title: m.folderAggregateCardTitle(folderName, snapshot.length),
          size: totalSize,
          lastModified: maxM,
          nestedFileCount: snapshot.length,
          ...(locationExtra ? { locationNote: locationExtra } : {}),
        });
        const nid = await reloadTopics();
        await loadPreviewRefs(nid);
        setMsg(m.addedFolderAggregateDone(folderName, snapshot.length));
        setFileMetaLocationNote('');
        setDataRevision((n) => n + 1);
        return;
      }

      const maxBatch = 200;
      const list = [...snapshot];
      const truncated = list.length > maxBatch;
      const slice = truncated ? list.slice(0, maxBatch) : list;
      for (const f of slice) {
        const wf = f as File & { webkitRelativePath?: string };
        const rel = wf.webkitRelativePath?.trim();
        await addFileMetadataReference(db, tid, {
          fileName: f.name,
          ...(rel ? { relativePath: rel } : {}),
          size: f.size,
          lastModified: f.lastModified,
          mimeType: f.type?.trim() || undefined,
          ...(locationExtra ? { locationNote: locationExtra } : {}),
        });
      }
      const nid = await reloadTopics();
      await loadPreviewRefs(nid);
      setMsg(
        truncated ? m.addedFileMetaTruncated(slice.length, maxBatch) : m.addedFileMetaDone(slice.length),
      );
      setFileMetaLocationNote('');
      setDataRevision((n) => n + 1);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }



  async function removePreviewRef(r: Reference) {
    setErr(null);
    setMsg(null);
    try {
      let before = 1;
      if (r.type === 'url') {
        const k = referenceUrlIdentity(r.url);
        before =
          k !== null
            ? (await listReferences(db, r.topicId)).filter(
                (x) => x.type === 'url' && referenceUrlIdentity(x.url) === k,
              ).length
            : 1;
      }
      await deleteUrlReferenceGroup(db, r);
      const nid = await reloadTopics();
      await loadPreviewRefs(nid);
      setMsg(
        r.type === 'snippet'
          ? m.removedSnippet
          : r.type === 'file'
            ? m.removedFile
            : before > 1
              ? m.removedSameUrlLinks(before)
              : m.removedLink,
      );
      window.setTimeout(() => setMsg(null), 2500);
      setDataRevision((n) => n + 1);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  const toggleSelectAllSaved = () => {
    setSelectedSavedRefIds((prev) => {
      if (previewRefs.length === 0) {
        return new Set();
      }
      if (prev.size === previewRefs.length) {
        return new Set();
      }
      return new Set(previewRefs.map((r) => r.id));
    });
  };

  const toggleSavedRefSelected = (id: string) => {
    setSelectedSavedRefIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const removeSelectedSavedRefs = async () => {
    const selected = previewRefs.filter((r) => selectedSavedRefIds.has(r.id));
    if (selected.length === 0) {
      return;
    }
    setErr(null);
    setMsg(null);
    try {
      const urlKeysDone = new Set<string>();
      for (const r of selected) {
        if (r.type === 'url') {
          const k = referenceUrlIdentity(r.url);
          if (k && urlKeysDone.has(k)) {
            continue;
          }
          if (k) {
            urlKeysDone.add(k);
          }
        }
        await deleteUrlReferenceGroup(db, r);
      }
      setSelectedSavedRefIds(new Set());
      const nid = await reloadTopics();
      await loadPreviewRefs(nid);
      setMsg(m.removedSelectedSourcesBulk);
      window.setTimeout(() => setMsg(null), 2500);
      setDataRevision((n) => n + 1);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  };

  const deleteCurrentMap = async () => {
    const tid = topicIdRef.current;
    if (!tid) {
      setErr(m.errSelectMap);
      return;
    }
    const topic = topics.find((t) => t.id === tid);
    const name = topic?.name ?? tid;
    if (!window.confirm(m.deleteMapConfirm(name))) {
      return;
    }
    setErr(null);
    setMsg(null);
    try {
      await deleteTopic(db, tid);
      setSelectedSavedRefIds(new Set());
      setExpandedSnippetId(null);
      const nid = await reloadTopics();
      await loadPreviewRefs(nid);
      setMsg(m.mapDeletedDone(name));
      window.setTimeout(() => setMsg(null), 2500);
      setDataRevision((n) => n + 1);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  };

  const beginRenameSource = (r: Reference) => {
    cancelRenameMap();
    setRenamingSourceId(r.id);
    setRenameDraft(initialRenameDraft(r));
    setRenameLocationDraft(r.type === 'file' ? (r.locationNote ?? '') : '');
  };

  const cancelRenameSource = () => {
    setRenamingSourceId(null);
    setRenameDraft('');
    setRenameLocationDraft('');
  };

  const commitRenameSource = async () => {
    const id = renamingSourceId;
    if (!id) {
      return;
    }
    setErr(null);
    try {
      const target =
        previewRefs.find((x) => x.id === id) ??
        searchHits.find((h) => h.reference.id === id)?.reference;
      await updateReferenceMeta(db, id, {
        title: renameDraft.trim(),
        ...(target?.type === 'file' ? { locationNote: renameLocationDraft.trim() } : {}),
      });
      cancelRenameSource();
      await loadPreviewRefs(topicIdRef.current);
      setDataRevision((n) => n + 1);
      setMsg(m.sourceRenamedDone);
      window.setTimeout(() => setMsg(null), 2200);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  };

  const beginRenameMap = () => {
    cancelRenameSource();
    const tid = topicIdRef.current;
    if (!tid) {
      setErr(m.errSelectMap);
      return;
    }
    const t = topics.find((x) => x.id === tid);
    setMapRenameDraft(t?.name ?? '');
    setMapRenameOpen(true);
  };

  const cancelRenameMap = () => {
    setMapRenameOpen(false);
    setMapRenameDraft('');
  };

  const commitRenameMap = async () => {
    const tid = topicIdRef.current;
    if (!tid) {
      return;
    }
    const nextName = mapRenameDraft.trim();
    setErr(null);
    try {
      await renameTopic(db, tid, nextName);
      cancelRenameMap();
      await reloadTopics();
      setDataRevision((n) => n + 1);
      setMsg(m.mapRenamedDone(nextName));
      window.setTimeout(() => setMsg(null), 2200);
    } catch (e2) {
      const raw = e2 instanceof Error ? e2.message : String(e2);
      if (raw === 'Topic name cannot be empty') {
        setErr(m.errMapRenameEmpty);
      } else if (raw === 'A map with this name already exists') {
        setErr(m.errMapRenameDuplicate);
      } else {
        setErr(raw);
      }
    }
  };

  const showHttpHint = activeTabOk === false;

  const btnGhost: CSSProperties = {
    flex: 1,
    cursor: 'pointer',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    background: '#fff',
    padding: '6px 8px',
    fontSize: 11,
    fontWeight: 600,
    color: slate,
  };

  const btnFoldInactive: CSSProperties = {
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    padding: '9px 10px',
    borderRadius: 8,
    border: '2px solid #ddd6fe',
    background: '#fff',
    marginBottom: 8,
    boxSizing: 'border-box',
    display: 'block',
  };

  const btnFoldActive: CSSProperties = {
    ...btnFoldInactive,
    borderColor: purple,
    background: '#f5f3ff',
    boxShadow: '0 0 0 1px rgba(79, 70, 229, 0.12)',
  };

  return (
    <div style={{ padding: '4px 0 8px', maxWidth: '100%' }}>
      <div style={zoneMid}>
        <details style={{ marginBottom: 12, color: '#64748b' }}>
          <summary
            style={{
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: 11,
              fontWeight: 600,
              listStylePosition: 'outside',
            }}
          >
            {m.backupAdvancedSummary}
          </summary>
          <p
            style={{
              margin: '8px 0 10px',
              fontSize: 10,
              lineHeight: 1.45,
              color: '#64748b',
            }}
          >
            {m.backupAdvancedHelp}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => void handleExportBackup()} style={btnGhost}>
              {m.exportJson}
            </button>
            <button type="button" onClick={() => importRef.current?.click()} style={btnGhost}>
              {m.importJson}
            </button>
          </div>
        </details>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void handleImportBackup(f);
          }}
        />
        <input
          ref={importMapRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void handleImportMapFile(f);
          }}
        />
        <div style={{ ...panelSectionTitle, marginBottom: 8 }}>{m.searchLabel}</div>
        <div style={{ marginBottom: 12 }}>
        <input
          type="search"
          value={searchQuery}
          placeholder={m.searchPlaceholder}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '7px 8px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            fontSize: 12,
            background: '#fff',
          }}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {searchQuery.trim()
          ? searchHits.length === 0
            ? (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>{m.noMatches}</div>
              )
            : (
                <ul
                  style={{
                    margin: '8px 0 0',
                    padding: 0,
                    listStyle: 'none',
                    maxHeight: 220,
                    overflowY: 'auto',
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  {searchHits.map(({ reference: r, topic: t }) => {
                    const nav = snippetNavigateUrl(r);
                    const showFold = (r.type === 'snippet' && nav) || r.type === 'file';
                    return (
                    <li
                      key={r.id}
                      style={{
                        padding: '6px 0',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{t.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              type="button"
                              title={
                                r.type === 'url'
                                  ? `Open: ${r.title || r.url}`
                                  : r.type === 'snippet'
                                    ? nav
                                      ? m.openSnippetHighlightTooltip
                                      : m.openSnippetTooltip
                                    : m.openSnippetTooltip
                              }
                              onClick={() => {
                                if (r.type === 'url') chrome.tabs.create({ url: r.url });
                                else if (r.type === 'snippet') {
                                  if (nav) chrome.tabs.create({ url: nav });
                                  else setExpandedSnippetId((cur) => (cur === r.id ? null : r.id));
                                } else if (r.type === 'file') {
                                  setExpandedSnippetId((cur) => (cur === r.id ? null : r.id));
                                }
                              }}
                              style={{
                                cursor: 'pointer',
                                border: 'none',
                                background: 'transparent',
                                padding: 0,
                                textAlign: 'left',
                                fontSize: 11,
                                color: referenceRowTitleColor(nav, r),
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              {referenceRowPrimaryLabel(r, m.snippetKindLabel, m.fileKindLabel, m.folderAggregateKindLabel)}
                            </button>
                            {showFold ? (
                              <button
                                type="button"
                                title={m.openSnippetTooltip}
                                aria-expanded={expandedSnippetId === r.id}
                                aria-label={m.openSnippetTooltip}
                                onClick={() =>
                                  setExpandedSnippetId((cur) => (cur === r.id ? null : r.id))
                                }
                                style={snippetFoldToggleMini}
                              >
                                {expandedSnippetId === r.id ? '▴' : '▾'}
                              </button>
                            ) : null}
                            {r.type === 'snippet' ? (
                              <button
                                type="button"
                                title={m.copySnippetTooltip}
                                onClick={() => void copySnippetToClipboard(r.body)}
                                style={snippetCopyMiniBtn}
                              >
                                {m.copySnippetShort}
                              </button>
                            ) : null}
                            {r.type === 'file' ? (
                              <button
                                type="button"
                                title={m.copySnippetTooltip}
                                onClick={() =>
                                  void navigator.clipboard
                                    .writeText(
                                      formatFileDetailText(r, m, localeTag, localeEs),
                                    )
                                    .then(() => {
                                      setMsg(m.snippetCopied);
                                      window.setTimeout(() => setMsg(null), 2200);
                                    })
                                    .catch(() => setErr(m.copySnippetFailed))
                                }
                                style={snippetCopyMiniBtn}
                              >
                                {m.copySnippetShort}
                              </button>
                            ) : null}
                            {renamingSourceId !== r.id ? (
                              <button
                                type="button"
                                title={m.renameSourceTitle}
                                onClick={() => beginRenameSource(r)}
                                style={snippetRenameMiniBtn}
                              >
                                {m.renameSourceShort}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          title={m.showMapTitle}
                          onClick={() => switchToMap(t.id)}
                          style={{
                            flexShrink: 0,
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '3px 6px',
                            borderRadius: 4,
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            color: slate,
                          }}
                        >
                          {m.mapBtn}
                        </button>
                      </div>
                      {renamingSourceId === r.id ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            marginTop: 6,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 6,
                              alignItems: 'center',
                            }}
                          >
                            <input
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void commitRenameSource();
                                }
                                if (e.key === 'Escape') {
                                  cancelRenameSource();
                                }
                              }}
                              aria-label={m.renameSourceTitle}
                              autoFocus
                              style={{
                                flex: '1 1 120px',
                                minWidth: 100,
                                padding: '5px 8px',
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                fontSize: 11,
                                boxSizing: 'border-box',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => void commitRenameSource()}
                              style={snippetCopyMiniBtn}
                            >
                              {m.renameSourceSave}
                            </button>
                            <button
                              type="button"
                              onClick={cancelRenameSource}
                              style={snippetCopyMiniBtn}
                            >
                              {m.renameSourceCancel}
                            </button>
                          </div>
                          {r.type === 'file' ? (
                            <input
                              value={renameLocationDraft}
                              onChange={(e) => setRenameLocationDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void commitRenameSource();
                                }
                                if (e.key === 'Escape') {
                                  cancelRenameSource();
                                }
                              }}
                              placeholder={m.fileMetaLocationNotePlaceholder}
                              aria-label={m.renameFileLocationLabel}
                              style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '5px 8px',
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                fontSize: 11,
                              }}
                            />
                          ) : null}
                        </div>
                      ) : null}
                      {expandedSnippetId === r.id &&
                      (r.type === 'snippet' || r.type === 'file') ? (
                        <div style={snippetBodyPanel}>
                          {r.type === 'snippet'
                            ? r.body
                            : formatFileDetailText(r, m, localeTag, localeEs)}
                        </div>
                      ) : null}
                    </li>
                    );
                  })}
                </ul>
              )
          : null}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'stretch',
            gap: 8,
            marginBottom: 6,
            rowGap: 8,
          }}
        >
          <span style={{ ...panelSectionTitle, alignSelf: 'center', flexShrink: 0 }}>{m.mapPickerLabel}</span>
          <form
            onSubmit={(e) => void handleAddQuickTopic(e)}
            style={{
              flex: '1 1 120px',
              display: 'flex',
              gap: 6,
              alignItems: 'stretch',
              minWidth: 0,
            }}
          >
            <input
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder={m.newMapPlaceholder}
              style={{
                flex: 1,
                minWidth: 52,
                padding: '7px 8px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                background: '#fff',
                boxSizing: 'border-box',
              }}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <button
              type="submit"
              title={m.addMapTitle}
              style={{
                flexShrink: 0,
                width: 34,
                height: 34,
                cursor: 'pointer',
                borderRadius: 6,
                border: 'none',
                background: purple,
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              +
            </button>
            <button
              type="button"
              title={m.importMapTitle}
              onClick={() => importMapRef.current?.click()}
              style={{
                flexShrink: 0,
                height: 34,
                padding: '0 10px',
                cursor: 'pointer',
                borderRadius: 6,
                border: `1px solid ${purpleHi}`,
                background: '#f5f3ff',
                fontSize: 11,
                fontWeight: 600,
                color: purple,
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
              }}
            >
              {m.importMapButton}
            </button>
          </form>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'stretch',
            width: '100%',
          }}
        >
          <select
            value={topicId}
            onChange={(e) => switchToMap(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              boxSizing: 'border-box',
              padding: '7px 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontSize: 13,
            }}
          >
            <option value="">{m.selectMap}</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            title={m.renameMapTitle}
            disabled={!topicId}
            onClick={beginRenameMap}
            style={{
              flexShrink: 0,
              cursor: topicId ? 'pointer' : 'not-allowed',
              borderRadius: 6,
              border: `1px solid ${topicId ? purpleHi : '#e2e8f0'}`,
              background: topicId ? '#f5f3ff' : '#f8fafc',
              padding: '7px 10px',
              fontSize: 11,
              fontWeight: 600,
              color: topicId ? purple : '#94a3b8',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
            }}
          >
            {m.renameMapButton}
          </button>
          <button
            type="button"
            title={m.deleteMapTitle}
            disabled={!topicId}
            onClick={() => void deleteCurrentMap()}
            style={{
              flexShrink: 0,
              cursor: topicId ? 'pointer' : 'not-allowed',
              borderRadius: 6,
              border: '1px solid',
              borderColor: topicId ? '#fecaca' : '#e2e8f0',
              background: topicId ? '#fff1f2' : '#f8fafc',
              padding: '7px 10px',
              fontSize: 11,
              fontWeight: 600,
              color: topicId ? '#b91c1c' : '#94a3b8',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
            }}
          >
            {m.deleteMapButton}
          </button>
          <button
            type="button"
            title={m.exportMapTitle}
            disabled={!topicId}
            onClick={() => void handleExportSelectedMap()}
            style={{
              flexShrink: 0,
              cursor: topicId ? 'pointer' : 'not-allowed',
              borderRadius: 6,
              border: `1px solid ${topicId ? purpleHi : '#e2e8f0'}`,
              background: topicId ? '#f5f3ff' : '#f8fafc',
              padding: '7px 10px',
              fontSize: 11,
              fontWeight: 600,
              color: topicId ? purple : '#94a3b8',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
            }}
          >
            {m.exportMapButton}
          </button>
        </div>
        {mapRenameOpen ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 8,
              alignItems: 'center',
            }}
          >
            <input
              value={mapRenameDraft}
              onChange={(e) => setMapRenameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void commitRenameMap();
                }
                if (e.key === 'Escape') {
                  cancelRenameMap();
                }
              }}
              aria-label={m.renameMapTitle}
              autoFocus
              placeholder={m.renameMapPlaceholder}
              style={{
                flex: '1 1 160px',
                minWidth: 120,
                padding: '7px 8px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                boxSizing: 'border-box',
              }}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <button
              type="button"
              onClick={() => void commitRenameMap()}
              style={snippetCopyMiniBtn}
            >
              {m.renameSourceSave}
            </button>
            <button type="button" onClick={cancelRenameMap} style={snippetCopyMiniBtn}>
              {m.renameSourceCancel}
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ ...panelSectionTitle, marginTop: 4, marginBottom: 8 }}>{m.savedSourcesHeading}</div>
      {previewRefs.length === 0 ? null : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              cursor: 'pointer',
              color: slate,
              userSelect: 'none',
            }}
          >
            <input
              ref={selectAllSavedRef}
              type="checkbox"
              checked={
                previewRefs.length > 0 && selectedSavedRefIds.size === previewRefs.length
              }
              onChange={toggleSelectAllSaved}
            />
            {m.selectAllSavedSources}
          </label>
          <button
            type="button"
            disabled={selectedSavedRefIds.size === 0}
            onClick={() => void removeSelectedSavedRefs()}
            style={{
              ...snippetCopyMiniBtn,
              borderColor: selectedSavedRefIds.size === 0 ? '#e2e8f0' : '#fecaca',
              color: selectedSavedRefIds.size === 0 ? '#94a3b8' : '#b91c1c',
              background: selectedSavedRefIds.size === 0 ? '#f8fafc' : '#fff1f2',
            }}
          >
            {m.removeSelectedSources}
          </button>
        </div>
      )}
      {previewRefs.length === 0 ? (
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 0 }}>{m.noRecent}</div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: 280, overflowY: 'auto' }}>
          {previewRefs.map((r) => {
            const nav = snippetNavigateUrl(r);
            const showFold = (r.type === 'snippet' && nav) || r.type === 'file';
            return (
            <li
              key={r.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                padding: '6px 0',
                borderBottom: '1px solid #f1f5f9',
                fontSize: 11,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={selectedSavedRefIds.has(r.id)}
                  onChange={() => toggleSavedRefSelected(r.id)}
                  aria-label={m.savedSourceRowSelectAria(
                    referenceRowPrimaryLabel(r, m.snippetKindLabel, m.fileKindLabel, m.folderAggregateKindLabel),
                  )}
                  style={{ flexShrink: 0, cursor: 'pointer' }}
                />
                <button
                  type="button"
                  title={
                    r.type === 'url'
                      ? `Open: ${r.title || r.url}`
                      : r.type === 'snippet'
                        ? nav
                          ? m.openSnippetHighlightTooltip
                          : m.openSnippetTooltip
                        : m.openSnippetTooltip
                  }
                  onClick={() => {
                    if (r.type === 'url') chrome.tabs.create({ url: r.url });
                    else if (r.type === 'snippet') {
                      if (nav) chrome.tabs.create({ url: nav });
                      else setExpandedSnippetId((cur) => (cur === r.id ? null : r.id));
                    } else if (r.type === 'file') {
                      setExpandedSnippetId((cur) => (cur === r.id ? null : r.id));
                    }
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    fontSize: 11,
                    color: referenceRowTitleColor(nav, r),
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {referenceRowPrimaryLabel(r, m.snippetKindLabel, m.fileKindLabel, m.folderAggregateKindLabel)}
                </button>
                {showFold ? (
                  <button
                    type="button"
                    title={m.openSnippetTooltip}
                    aria-expanded={expandedSnippetId === r.id}
                    aria-label={m.openSnippetTooltip}
                    onClick={() => setExpandedSnippetId((cur) => (cur === r.id ? null : r.id))}
                    style={snippetFoldToggleMini}
                  >
                    {expandedSnippetId === r.id ? '▴' : '▾'}
                  </button>
                ) : null}
                {r.type === 'snippet' ? (
                  <button
                    type="button"
                    title={m.copySnippetTooltip}
                    onClick={() => void copySnippetToClipboard(r.body)}
                    style={snippetCopyMiniBtn}
                  >
                    {m.copySnippetShort}
                  </button>
                ) : null}
                {r.type === 'file' ? (
                  <button
                    type="button"
                    title={m.copySnippetTooltip}
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(
                          formatFileDetailText(r, m, localeTag, localeEs),
                        )
                        .then(() => {
                          setMsg(m.snippetCopied);
                          window.setTimeout(() => setMsg(null), 2200);
                        })
                        .catch(() => setErr(m.copySnippetFailed))
                    }
                    style={snippetCopyMiniBtn}
                  >
                    {m.copySnippetShort}
                  </button>
                ) : null}
                {renamingSourceId !== r.id ? (
                  <button
                    type="button"
                    title={m.renameSourceTitle}
                    onClick={() => beginRenameSource(r)}
                    style={snippetRenameMiniBtn}
                  >
                    {m.renameSourceShort}
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label={`${m.removeFromMapTooltip}: ${r.title}`}
                  title={m.removeFromMapTooltip}
                  onClick={() => void removePreviewRef(r)}
                  style={{
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    border: 'none',
                    borderRadius: 4,
                    background: '#f1f5f9',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: 13,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
              {renamingSourceId === r.id ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    marginTop: 6,
                    marginLeft: 20,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    <input
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void commitRenameSource();
                        }
                        if (e.key === 'Escape') {
                          cancelRenameSource();
                        }
                      }}
                      aria-label={m.renameSourceTitle}
                      autoFocus
                      style={{
                        flex: '1 1 120px',
                        minWidth: 100,
                        padding: '5px 8px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 11,
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void commitRenameSource()}
                      style={snippetCopyMiniBtn}
                    >
                      {m.renameSourceSave}
                    </button>
                    <button type="button" onClick={cancelRenameSource} style={snippetCopyMiniBtn}>
                      {m.renameSourceCancel}
                    </button>
                  </div>
                  {r.type === 'file' ? (
                    <input
                      value={renameLocationDraft}
                      onChange={(e) => setRenameLocationDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void commitRenameSource();
                        }
                        if (e.key === 'Escape') {
                          cancelRenameSource();
                        }
                      }}
                      placeholder={m.fileMetaLocationNotePlaceholder}
                      aria-label={m.renameFileLocationLabel}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '5px 8px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 11,
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
              {expandedSnippetId === r.id &&
              (r.type === 'snippet' || r.type === 'file') ? (
                <div style={snippetBodyPanel}>
                  {r.type === 'snippet'
                    ? r.body
                    : formatFileDetailText(r, m, localeTag, localeEs)}
                </div>
              ) : null}
            </li>
            );
          })}
        </ul>
      )}

      </div>

      <div style={zoneAdd}>
        <div style={{ ...panelSectionTitle, marginBottom: 10 }}>{m.addSourcesHeading}</div>

        <button
          type="button"
          onClick={() => toggleAddFold('tab')}
          style={addFold === 'tab' ? btnFoldActive : btnFoldInactive}
        >
          <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>{m.addCurrentTab}</div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 3, lineHeight: 1.35 }}>{m.addTabFoldDesc}</div>
        </button>

        <button
          type="button"
          onClick={() => toggleAddFold('selection')}
          style={addFold === 'selection' ? btnFoldActive : btnFoldInactive}
        >
          <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>{m.addDomSelection}</div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 3, lineHeight: 1.35 }}>{m.addDomSelectionDesc}</div>
        </button>

        <button
          type="button"
          onClick={() => toggleAddFold('snippet')}
          style={addFold === 'snippet' ? btnFoldActive : btnFoldInactive}
        >
          <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>{m.addSnippetHeading}</div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 3, lineHeight: 1.35 }}>{m.addSnippetFoldDesc}</div>
        </button>

        <button
          type="button"
          onClick={() => toggleAddFold('file')}
          style={addFold === 'file' ? btnFoldActive : btnFoldInactive}
        >
          <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>{m.addLocalFileFoldTitle}</div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 3, lineHeight: 1.35 }}>{m.addLocalFileFoldDesc}</div>
        </button>

        {addFold === 'tab' ? (
          <div style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid #ddd6fe' }}>
            <input
              value={tabSaveTitleDraft}
              onChange={(e) => setTabSaveTitleDraft(e.target.value)}
              placeholder={m.tabSaveTitlePlaceholder}
              aria-label={m.tabSaveTitlePlaceholder}
              disabled={activeTabOk !== true}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '7px 8px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                marginBottom: 8,
                background: activeTabOk === true ? '#fff' : '#f8fafc',
              }}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <button
              type="button"
              onClick={() => void handleAddTab()}
              style={{
                cursor: 'pointer',
                borderRadius: 10,
                border: 'none',
                background: `linear-gradient(135deg,${purple},${purpleHi})`,
                color: '#fff',
                fontWeight: 700,
                width: '100%',
                padding: '11px 12px',
                fontSize: 14,
                boxShadow: '0 1px 2px rgba(79,70,229,0.25)',
              }}
            >
              {m.addCurrentTab}
            </button>
            {activeTabOk === false ? (
              <p style={{ color: '#b91c1c', fontSize: 12, margin: '10px 0 0', minHeight: 18 }}>
                {m.tabMustHttp}
              </p>
            ) : null}
          </div>
        ) : null}

        {addFold === 'selection' ? (
          <div style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid #ddd6fe' }}>
            <p style={{ margin: '0 0 8px', fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>{m.selectionFoldHowto}</p>
            <button type="button" onClick={() => void refreshSelectionDraft()} style={{ ...btnGhost, width: '100%', marginBottom: 8, flex: 'unset' }}>
              {m.refreshSelection}
            </button>
            {selectionPullErr ? (
              <p style={{ margin: '0 0 8px', fontSize: 11, color: '#b45309', lineHeight: 1.35 }}>{selectionPullErr}</p>
            ) : null}
            {selectionPageUrl.startsWith('http') ? (
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
                <span style={{ fontWeight: 700 }}>{m.selectionSourceLabel}:</span>{' '}
                <button
                  type="button"
                  onClick={() => chrome.tabs.create({ url: selectionPageUrl })}
                  style={{
                    cursor: 'pointer',
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    maxWidth: '100%',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: '#2563eb',
                    fontSize: 10,
                  }}
                  title={selectionPageUrl}
                >
                  {selectionPageUrl.length > 52 ? `${selectionPageUrl.slice(0, 50)}…` : selectionPageUrl}
                </button>
              </div>
            ) : null}
            <form onSubmit={(e) => void handleSaveSelection(e)}>
              <input
                value={selectionDraftTitle}
                onChange={(e) => setSelectionDraftTitle(e.target.value)}
                placeholder={m.snippetTitlePlaceholder}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '7px 8px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  marginBottom: 6,
                }}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <textarea
                value={selectionDraftBody}
                onChange={(e) => setSelectionDraftBody(e.target.value)}
                placeholder={m.snippetBodyPlaceholder}
                rows={5}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '7px 8px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  resize: 'vertical',
                  marginBottom: 8,
                }}
                spellCheck
              />
              <button
                type="submit"
                style={{
                  cursor: 'pointer',
                  borderRadius: 10,
                  border: 'none',
                  background: `linear-gradient(135deg,${purple},${purpleHi})`,
                  color: '#fff',
                  fontWeight: 700,
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 13,
                  boxShadow: '0 1px 2px rgba(79,70,229,0.25)',
                }}
              >
                {m.saveSelectionSnippet}
              </button>
            </form>
          </div>
        ) : null}

        {addFold === 'snippet' ? (
          <div style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid #ddd6fe' }}>
            <form onSubmit={(e) => void handleAddSnippet(e)}>
              <input
                value={snippetTitle}
                onChange={(e) => setSnippetTitle(e.target.value)}
                placeholder={m.snippetTitlePlaceholder}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '7px 8px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  marginBottom: 6,
                }}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <textarea
                value={snippetBody}
                onChange={(e) => setSnippetBody(e.target.value)}
                placeholder={m.snippetBodyPlaceholder}
                rows={4}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '7px 8px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  resize: 'vertical',
                  marginBottom: 8,
                }}
                spellCheck
              />
              <button type="submit" style={{ ...btnGhost, width: '100%', boxSizing: 'border-box', flex: 'unset' }}>
                {m.addSnippet}
              </button>
            </form>
          </div>
        ) : null}

        {addFold === 'file' ? (
          <div style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid #ddd6fe' }}>
            <input
              ref={filePickerRef}
              type="file"
              hidden
              multiple
              onChange={(e) => {
                const el = e.target;
                const picked = el.files?.length ? Array.from(el.files) : [];
                el.value = '';
                void handleLocalFilesChosen(picked, false);
              }}
            />
            <input
              ref={folderPickerRef}
              type="file"
              hidden
              multiple
              {...({ webkitdirectory: '' } as Record<string, unknown>)}
              onChange={(e) => {
                const el = e.target;
                const picked = el.files?.length ? Array.from(el.files) : [];
                el.value = '';
                void handleLocalFilesChosen(picked, true);
              }}
            />
            <p style={{ margin: '0 0 8px', fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>{m.fileMetaPickerHint}</p>
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 600,
                color: slate,
                marginBottom: 4,
              }}
            >
              {m.fileMetaLocationNoteLabel}
            </label>
            <input
              value={fileMetaLocationNote}
              onChange={(e) => setFileMetaLocationNote(e.target.value)}
              placeholder={m.fileMetaLocationNotePlaceholder}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '7px 8px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 11,
                marginBottom: 8,
                background: '#fff',
              }}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              title={m.fileMetaLocationNotePlaceholder}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => filePickerRef.current?.click()}
                style={{ ...btnGhost, width: '100%', flex: 'unset' }}
              >
                {m.pickLocalFiles}
              </button>
              <button
                type="button"
                onClick={() => folderPickerRef.current?.click()}
                style={{ ...btnGhost, width: '100%', flex: 'unset' }}
              >
                {m.pickLocalFolder}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {msg ? <p style={{ color: '#166534', fontSize: 12, marginTop: 6 }}>{msg}</p> : null}
      {err &&
      !(
        showHttpHint &&
        (/active tab/i.test(err) || /pestaña activa|debe ser http/i.test(err))
      ) ? (
        <p style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>{err}</p>
      ) : null}

      <p style={{ marginTop: 14, fontSize: 11, color: '#78716c', lineHeight: 1.45 }}>{m.footerPwaHint}</p>
    </div>
  );
}

