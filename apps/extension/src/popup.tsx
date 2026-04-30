import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import type { Topic } from '@sortmysources/core';
import {
  addUrlReference,
  createDb,
  createTopic,
  listTopics,
} from '@sortmysources/core';

function PopupApp() {
  const db = useMemo(() => createDb(), []);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const ts = await listTopics(db);
    setTopics(ts);
    if (!topicId && ts[0]?.id) setTopicId(ts[0].id);
  }, [db, topicId]);

  useEffect(() => {
    void reload();
  }, [reload]);

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

  return (
    <div style={{ padding: 12 }}>
      <h2 style={{ margin: '0 0 10px', fontSize: '1rem' }}>SortMySources</h2>

      <div style={{ fontSize: 12, marginBottom: 10, color: '#64748b' }}>
        Saves to this browser (extension storage). Backup from the PWA or future export-in-popup (v2).
      </div>

      <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>
        Map
        <select value={topicId} onChange={(e) => setTopicId(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
          <option value="">Select…</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <form onSubmit={(e) => void handleAddQuickTopic(e)} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
            placeholder="New map…"
            style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
          />
          <button type="submit" style={{ cursor: 'pointer', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', padding: '6px 10px', fontWeight: 600 }}>
            +
          </button>
        </div>
      </form>

      <button
        type="button"
        onClick={() => void handleAddTab()}
        style={{
          cursor: 'pointer',
          borderRadius: 8,
          border: 'none',
          background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
          color: '#fff',
          fontWeight: 700,
          width: '100%',
          padding: '10px 12px',
        }}
      >
        Add current tab
      </button>

      {msg ? <p style={{ color: '#166534', fontSize: 12, marginTop: 10 }}>{msg}</p> : null}
      {err ? <p style={{ color: '#b91c1c', fontSize: 12, marginTop: 10 }}>{err}</p> : null}

      <p style={{ marginTop: 14, fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
        Full UI (lists, export JSON): use the PWA build. Extension and PWA data are separate until you import a backup.
      </p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<PopupApp />);
