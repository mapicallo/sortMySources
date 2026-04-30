import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Reference, ReferenceSearchHit, Topic } from '@sortmysources/core';
import {
  addUrlReference,
  createDb,
  createTopic,
  deleteUrlReferenceGroup,
  exportAll,
  importAll,
  listReferences,
  listTopics,
  parseExportedSnapshot,
  referenceUrlIdentity,
  recentUniqueUrlReferences,
  searchReferencesAllMaps,
} from '@sortmysources/core';
import { getActiveTabInLastNormalWindow } from './active-browser-tab';
import { useI18n } from './i18n-context';
const purple = '#4f46e5';
const purpleHi = '#6366f1';
const slate = '#334155';

export function SortMySourcesPanelContent() {
  const { messages: m } = useI18n();
  const db = useMemo(() => createDb(), []);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState('');
  const [previewRefs, setPreviewRefs] = useState<Reference[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<ReferenceSearchHit[]>([]);
  const [dataRevision, setDataRevision] = useState(0);
  const [newTopicName, setNewTopicName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  /** Always in sync with topicId; survives async gaps where React defers setState updaters. */
  const topicIdRef = useRef('');

  /** null = still checking */
  const [activeTabOk, setActiveTabOk] = useState<boolean | null>(null);

  useEffect(() => {
    topicIdRef.current = topicId;
  }, [topicId]);

  const loadPreviewRefs = useCallback(async (tid: string) => {
    if (!tid) {
      setPreviewRefs([]);
      return;
    }
    const all = await listReferences(db, tid);
    setPreviewRefs(recentUniqueUrlReferences(all, 5));
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
          if (ok) setErr(null);
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
      const title = tab?.title?.trim() || new URL(u).hostname;
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

  async function removePreviewRef(r: Reference) {
    setErr(null);
    setMsg(null);
    try {
      const k = referenceUrlIdentity(r.url);
      const before =
        k !== null
          ? (await listReferences(db, r.topicId)).filter(
              (x) => x.type === 'url' && referenceUrlIdentity(x.url) === k,
            ).length
          : 1;
      await deleteUrlReferenceGroup(db, r);
      const nid = await reloadTopics();
      await loadPreviewRefs(nid);
      setMsg(before > 1 ? m.removedSameUrlLinks(before) : m.removedLink);
      window.setTimeout(() => setMsg(null), 2500);
      setDataRevision((n) => n + 1);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

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

  return (
    <div style={{ padding: '4px 0 8px', maxWidth: '100%' }}>
      <div style={{ fontSize: 12, marginBottom: 12, color: '#57534e', lineHeight: 1.45 }}>
        {m.subtitle}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => void handleExportBackup()} style={btnGhost}>
          {m.exportJson}
        </button>
        <button type="button" onClick={() => importRef.current?.click()} style={btnGhost}>
          {m.importJson}
        </button>
      </div>
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

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: slate, marginBottom: 6 }}>{m.searchLabel}</div>
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
                    maxHeight: 150,
                    overflowY: 'auto',
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  {searchHits.map(({ reference: r, topic: t }) => (
                    <li
                      key={r.id}
                      style={{
                        padding: '6px 0',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        gap: 6,
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{t.name}</div>
                        <button
                          type="button"
                          title={r.title}
                          onClick={() => chrome.tabs.create({ url: r.url })}
                          style={{
                            cursor: 'pointer',
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            textAlign: 'left',
                            fontSize: 11,
                            color: '#2563eb',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            width: '100%',
                          }}
                        >
                          {r.title || r.url}
                        </button>
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
                    </li>
                  ))}
                </ul>
              )
          : null}
      </div>

      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: slate }}>
        {m.mapPickerLabel}
        <select
          value={topicId}
          onChange={(e) => switchToMap(e.target.value)}
          style={{
            width: '100%',
            marginTop: 6,
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
      </label>

      <div style={{ fontSize: 11, fontWeight: 600, color: slate, marginBottom: 6 }}>{m.recentLabel}</div>
      {previewRefs.length === 0 ? (
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>{m.noRecent}</div>
      ) : (
        <ul style={{ margin: '0 0 12px', padding: 0, listStyle: 'none', maxHeight: 120, overflowY: 'auto' }}>
          {previewRefs.map((r) => (
            <li
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 0',
                borderBottom: '1px solid #f1f5f9',
                fontSize: 11,
              }}
            >
              <button
                type="button"
                title={r.title}
                onClick={() => chrome.tabs.create({ url: r.url })}
                style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  fontSize: 11,
                  color: '#2563eb',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.title || r.url}
              </button>
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
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void handleAddQuickTopic(e)} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <input
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
            placeholder={m.newMapPlaceholder}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              minWidth: 0,
              background: '#fff',
            }}
          />
          <button
            type="submit"
            title={m.addMapTitle}
            style={{
              flexShrink: 0,
              width: 40,
              height: 40,
              cursor: 'pointer',
              borderRadius: 6,
              border: 'none',
              background: purple,
              color: '#fff',
              fontWeight: 700,
              fontSize: 18,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            +
          </button>
        </div>
      </form>

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

      {showHttpHint ? (
        <p style={{ color: '#b91c1c', fontSize: 12, margin: '10px 0 0', minHeight: 18 }}>
          {m.tabMustHttp}
        </p>
      ) : (
        <div style={{ marginTop: 10, minHeight: 18 }} />
      )}

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

