import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import type { Reference, Topic } from '@sortmysources/core';
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
} from '@sortmysources/core';

/** Brand purple used for primary controls (matches maqueta). */
const purple = '#4f46e5';
const purpleHi = '#6366f1';
const slate = '#334155';

function PopupApp() {
  const db = useMemo(() => createDb(), []);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState('');
  const [previewRefs, setPreviewRefs] = useState<Reference[]>([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  /** null = still checking */
  const [activeTabOk, setActiveTabOk] = useState<boolean | null>(null);

  const reload = useCallback(async () => {
    const ts = await listTopics(db);
    setTopics(ts);
    setTopicId((prev) =>
      prev && ts.some((t) => t.id === prev) ? prev : ts[0]?.id ?? '',
    );
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    async function loadPreview() {
      if (!topicId) {
        if (!cancelled) setPreviewRefs([]);
        return;
      }
      const all = await listReferences(db, topicId);
      if (!cancelled) setPreviewRefs(recentUniqueUrlReferences(all, 5));
    }
    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [db, topicId]);

  useEffect(() => {
    let cancelled = false;
    async function checkActiveTabHttp() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
        setMsg('Backup downloaded');
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
      if (!window.confirm('Replace all data in this extension with this backup?')) return;
      await importAll(db, snap);
      await reload();
      setMsg('Backup imported ✓');
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
      await reload();
      setMsg(`Created map "${t.name}"`);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  async function handleAddTab() {
    setErr(null);
    setMsg(null);
    try {
      if (!topicId) {
        setErr('Select or create a map first.');
        return;
      }
      if (activeTabOk === false) {
        setErr('Active tab must be http(s)');
        return;
      }
      if (activeTabOk === null) {
        return;
      }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const u = tab?.url;
      if (!u?.startsWith('http://') && !u?.startsWith('https://')) {
        setErr('Active tab must be http(s)');
        return;
      }
      const title = tab.title?.trim() || new URL(u).hostname;
      await addUrlReference(db, topicId, { url: u, title });
      await reload();
      setMsg('Added current tab ✓');
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
      await reload();
      setMsg(before > 1 ? `Removed ${before} links (same URL)` : 'Removed link');
      window.setTimeout(() => setMsg(null), 2500);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  const showHttpHint = activeTabOk === false;

  const btnGhost: React.CSSProperties = {
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
    <div style={{ padding: '12px 14px 14px' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
        SortMySources
      </h2>

      <div style={{ fontSize: 12, marginBottom: 12, color: '#64748b', lineHeight: 1.45 }}>
        Saves locally in this extension (IndexedDB). Use Backup below to sync with the PWA.
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => void handleExportBackup()} style={btnGhost}>
          Export JSON
        </button>
        <button type="button" onClick={() => importRef.current?.click()} style={btnGhost}>
          Import JSON
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

      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: slate }}>
        Map
        <select
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
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
          <option value="">Select…</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <div style={{ fontSize: 11, fontWeight: 600, color: slate, marginBottom: 6 }}>Recent in this map</div>
      {previewRefs.length === 0 ? (
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>No references yet.</div>
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
                aria-label={`Remove ${r.title}`}
                title="Remove from map"
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
            placeholder="New map..."
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              minWidth: 0,
            }}
          />
          <button
            type="submit"
            title="Add map"
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
        Add current tab
      </button>

      {showHttpHint ? (
        <p style={{ color: '#b91c1c', fontSize: 12, margin: '10px 0 0', minHeight: 18 }}>
          Active tab must be http(s)
        </p>
      ) : (
        <div style={{ marginTop: 10, minHeight: 18 }} />
      )}

      {msg ? <p style={{ color: '#166534', fontSize: 12, marginTop: 6 }}>{msg}</p> : null}
      {err && !(showHttpHint && err.includes('Active tab')) ? (
        <p style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>{err}</p>
      ) : null}

      <p style={{ marginTop: 14, fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
        Full editing and lists live in the PWA. Extension and PWA storage stay separate unless you exchange JSON backups.
      </p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<PopupApp />);
