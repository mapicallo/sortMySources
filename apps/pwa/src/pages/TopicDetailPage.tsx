import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import type { Reference, Topic } from '@sortmysources/core';
import { addUrlReference, deleteReference, deleteTopic, listReferences, renameTopic } from '@sortmysources/core';
import { useDb } from '../dbContext';

export default function TopicDetailPage() {
  const db = useDb();
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [refs, setRefs] = useState<Reference[]>([]);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [rename, setRename] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!topicId) return;
    const t = await db.topics.get(topicId);
    setTopic(t ?? null);
    setRename(t?.name ?? '');
    const rs = await listReferences(db, topicId);
    setRefs(rs);
  }, [db, topicId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!topicId) return <Navigate to="/" replace />;

  const tid = topicId;

  async function submitRef(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      let pageTitle = title.trim();
      if (!pageTitle) {
        try {
          pageTitle = new URL(url.trim()).hostname;
        } catch {
          pageTitle = 'Untitled link';
        }
      }
      await addUrlReference(db, tid, { url: url.trim(), title: pageTitle, note: note.trim() || undefined });
      setUrl('');
      setTitle('');
      setNote('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeRef(id: string) {
    await deleteReference(db, id);
    await load();
  }

  async function saveRename() {
    setError(null);
    try {
      await renameTopic(db, tid, rename);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function zapTopic() {
    if (!topic) return;
    if (!window.confirm(`Delete map "${topic.name}" and all its references?`)) return;
    await deleteTopic(db, tid);
    navigate('/');
  }

  if (!topic)
    return (
      <div className="app-wrap">
        <p>Map not found.</p>
        <Link to="/">Home</Link>
      </div>
    );

  return (
    <div className="app-wrap">
      <header className="app-header">
        <div style={{ flex: 1 }}>
          <Link to="/" style={{ fontSize: '0.82rem' }}>
            ← Maps
          </Link>
          <div className="row" style={{ marginTop: '0.5rem', alignItems: 'flex-end' }}>
            <label style={{ flex: 2, width: '100%' }}>
              <span className="app-muted">Map name</span>
              <input type="text" value={rename} onChange={(e) => setRename(e.target.value)} style={{ marginTop: 4, width: '100%' }} />
            </label>
            <button type="button" className="btn btn-ghost" onClick={() => void saveRename()} style={{ marginBottom: '0.12rem' }}>
              Save name
            </button>
          </div>
          <button type="button" className="btn btn-danger" style={{ marginTop: '0.75rem' }} onClick={() => void zapTopic()}>
            Delete map…
          </button>
          {error ? <div className="msg-error">{error}</div> : null}
        </div>
      </header>

      <section className="card">
        <h2 style={{ margin: '0 0 0.65rem', fontSize: '1rem' }}>Add URL</h2>
        <form onSubmit={(e) => void submitRef(e)}>
          <div className="row" style={{ marginBottom: '0.5rem' }}>
            <input type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} required />
          </div>
          <div className="row" style={{ marginBottom: '0.5rem' }}>
            <input type="text" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <textarea placeholder="Short note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary">
            Add source
          </button>
        </form>
      </section>

      <section className="card">
        <h2 style={{ margin: '0 0 0.65rem', fontSize: '1rem' }}>Sources ({refs.length})</h2>
        {refs.length === 0 ? (
          <p className="app-muted">No references yet.</p>
        ) : (
          refs.map((r) => (
            <div key={r.id} className="ref-item">
              <div className="ref-title-row">
                <div>
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    <strong>{r.title}</strong>
                  </a>
                  <div className="ref-meta">{r.url}</div>
                  {r.note ? <div style={{ marginTop: '0.35rem', fontSize: '0.85rem' }}>{r.note}</div> : null}
                </div>
                <button type="button" className="btn btn-ghost" onClick={() => void removeRef(r.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
