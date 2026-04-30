import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import type { Topic } from '@sortmysources/core';
import {
  addUrlReference,
  createDb,
  createTopic,
  listTopics,
} from '@sortmysources/core';

/** Brand purple used for primary controls (matches maqueta). */
const purple = '#4f46e5';
const purpleHi = '#6366f1';

function PopupApp() {
  const db = useMemo(() => createDb(), []);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  /** null = still checking */
  const [activeTabOk, setActiveTabOk] = useState<boolean | null>(null);

  const reload = useCallback(async () => {
    const ts = await listTopics(db);
    setTopics(ts);
    setTopicId((prev) => {
      if (prev && ts.some((t) => t.id === prev)) return prev;
      return ts[0]?.id ?? '';
    });
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

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

  const showHttpHint = activeTabOk === false;

  return (
    <div style={{ padding: '12px 14px 14px' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
        SortMySources
      </h2>

      <div style={{ fontSize: 12, marginBottom: 12, color: '#64748b', lineHeight: 1.45 }}>
        Saves to this browser (extension storage). Backup from the PWA or future export-in-popup (v2).
      </div>

      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#334155' }}>
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
      {err && !err.includes('http') ? <p style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>{err}</p> : null}

      <p style={{ marginTop: 14, fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
        Full UI (lists, export JSON): use the PWA build. Extension and PWA data are separate until you import a backup.
      </p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<PopupApp />);
