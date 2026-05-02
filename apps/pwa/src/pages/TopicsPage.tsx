import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Topic } from '@sortmysources/core';
import { createTopic, exportAll, importAll, listTopics, parseExportedSnapshot } from '@sortmysources/core';
import { useDb } from '../dbContext';

export default function TopicsPage() {
  const db = useDb();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const t = await listTopics(db);
    setTopics(t);
  }, [db]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createTopic(db, newName);
      setNewName('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleExport() {
    setError(null);
    try {
      const snap = await exportAll(db);
      const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sortmysources-backup-${snap.exportedAt}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleImportFile(f: File) {
    setError(null);
    try {
      const text = await f.text();
      const snap = parseExportedSnapshot(text);
      if (!window.confirm('Replace all local data with this backup?')) return;
      await importAll(db, snap);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="app-wrap">
      <header className="app-header">
        <div>
          <h1 className="app-title">SortMySources</h1>
          <p className="app-muted">
            Maps · http(s) URLs and text snippets · Stored on this device (IndexedDB)
          </p>
        </div>
      </header>

      <section className="card">
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Source kinds we scoped</h2>
        <p className="app-muted" style={{ margin: '0 0 0.65rem', fontSize: '0.85rem', lineHeight: 1.45 }}>
          Attachment types for maps: links and snippets are live in the PWA; the extension can add the current tab,
          capture page selection, or free-form snippets. Bookmarks import is still on the roadmap.
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem', lineHeight: 1.5 }}>
          <li style={{ marginBottom: '0.35rem' }}>
            <strong>HTTP(S) links</strong> — available (paste in PWA or use the browser extension panel).
          </li>
          <li style={{ marginBottom: '0.35rem' }}>
            <strong>Plain-text snippets / notes</strong> — available (no webpage required).
          </li>
          <li style={{ marginBottom: '0.35rem' }}>
            <strong>Selection from active page</strong> — available in the browser extension (reads highlighted text
            on the page into a snippet).
          </li>
          <li>
            <strong>Bookmarks / favorites import</strong> — planned; could populate a map from saved links.
          </li>
        </ul>
      </section>

      <section className="card">
        <h2 style={{ margin: '0 0 0.65rem', fontSize: '1rem' }}>New map</h2>
        <form className="row" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="e.g. Exam prep · Job hunt · Gifts"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Create
          </button>
        </form>
        {error ? <div className="msg-error">{error}</div> : null}
      </section>

      <section className="card">
        <h2 style={{ margin: '0 0 0.65rem', fontSize: '1rem' }}>Your maps</h2>
        {topics.length === 0 ? (
          <p className="app-muted">No maps yet.</p>
        ) : (
          <ul className="topic-list">
            {topics.map((t) => (
              <li key={t.id}>
                <Link className="topic-link" to={`/topic/${t.id}`}>
                  <strong>{t.name}</strong>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Updated {new Date(t.updatedAt).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="footer-tools">
        <div>
          Extension and PWA use <strong>separate browser storage</strong>. Use backup to move between them.
        </div>
        <div className="row" style={{ marginTop: '0.5rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => void handleExport()}>
            Export JSON backup
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            Import backup (replaces local)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void handleImportFile(f);
            }}
          />
        </div>
      </div>
    </div>
  );
}
