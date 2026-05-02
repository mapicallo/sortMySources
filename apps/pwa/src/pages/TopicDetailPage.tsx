import { useCallback, useEffect, useState } from 'react';

import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import type { Reference, Topic } from '@sortmysources/core';

import { addSnippetReference, addUrlReference, deleteReference, deleteTopic, listReferences, renameTopic } from '@sortmysources/core';

import { useDb } from '../dbContext';



async function writeClipboard(text: string): Promise<boolean> {

  try {

    await navigator.clipboard.writeText(text);

    return true;

  } catch {

    try {

      const ta = document.createElement('textarea');

      ta.value = text;

      ta.style.position = 'fixed';

      ta.style.opacity = '0';

      document.body.appendChild(ta);

      ta.select();

      document.execCommand('copy');

      ta.remove();

      return true;

    } catch {

      return false;

    }

  }

}



type FileRef = Extract<Reference, { type: 'file' }>;



function formatByteSize(bytes: number): string {

  if (!Number.isFinite(bytes) || bytes < 0) return '—';

  const units = ['B', 'KB', 'MB', 'GB'] as const;

  let value = bytes;

  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {

    value /= 1024;

    unit++;

  }

  const digits = unit === 0 ? 0 : value < 10 ? 2 : value < 100 ? 1 : 0;

  return `${value.toFixed(digits)} ${units[unit]}`;

}



function pwaPreferEs(): boolean {

  try {

    return navigator.language.toLowerCase().startsWith('es');

  } catch {

    return false;

  }

}



const MIME_PWA: Record<string, string> = {

  'application/pdf': 'PDF',

  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word (.docx)',

  'application/msword': 'Word (.doc)',

  'application/zip': 'ZIP',

  'application/json': 'JSON',

};



function mimePwaFriendly(mime: string, es: boolean): string {

  const k = mime.trim().toLowerCase();

  const known = MIME_PWA[k];

  if (known) return known;

  if (mime.startsWith('image/')) return es ? `Imagen (${mime})` : `Image (${mime})`;

  if (mime.startsWith('text/')) return es ? `Texto (${mime})` : `Text (${mime})`;

  return mime;

}



/** Plain detail block for synced file/folder refs. */

function formatFileDetailText(r: FileRef): string {

  const es = pwaPreferEs();

  const loc = es ? 'es' : 'en';

  const lines: string[] = [];

  const isAgg = typeof r.nestedFileCount === 'number';

  lines.push(es ? `Nombre: ${r.fileName}` : `Name: ${r.fileName}`);

  if (r.locationNote?.trim()) {

    const ln = r.locationNote.trim();

    lines.push(

      (es ? 'Ubicación (nota): ' : 'Location (your note): ') + ln,

    );

  }

  if (isAgg) {

    lines.push(

      (es ? 'Archivos enumerados por el navegador: ' : 'Files enumerated by browser: ') +

        String(r.nestedFileCount),

    );

    lines.push(es ? 'Tamaño total (suma de ficheros).' : 'Total size (sum of file sizes).');

    lines.push(

      es

        ? 'Modificado = fecha más reciente entre esos ficheros.'

        : 'Modified = latest change among those files.',

    );

    lines.push((es ? 'Tamaño total: ' : 'Total size: ') + formatByteSize(r.size));

    lines.push(

      (es ? 'Modificado (más reciente): ' : 'Modified (latest): ') +

        new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeStyle: 'short' }).format(

          new Date(r.lastModified),

        ),

    );

    return lines.join('\n');

  }

  if (r.relativePath?.trim()) {

    lines.push((es ? 'Ruta relativa: ' : 'Relative path: ') + r.relativePath);

  } else {

    lines.push(

      es

        ? 'Sin ruta de subcarpeta: con archivos sueltos el navegador solo da el nombre de fichero.'

        : 'No subfolder path: with loose-file picks the browser only sends the file name.',

    );

  }

  lines.push((es ? 'Tamaño: ' : 'Size: ') + formatByteSize(r.size));

  lines.push(

    (es ? 'Modificado: ' : 'Modified: ') +

      new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(r.lastModified)),

  );

  const raw = r.mimeType?.trim();

  if (raw) {

    const nice = mimePwaFriendly(raw, es);

    lines.push((es ? 'Tipo: ' : 'Kind: ') + nice);

    if (nice.toLowerCase() !== raw.toLowerCase() && !nice.toLowerCase().includes(raw.toLowerCase())) {

      lines.push((es ? 'MIME técnico: ' : 'Technical MIME: ') + raw);

    }

  } else {

    lines.push((es ? 'Tipo: ' : 'Kind: ') + (es ? '(no informado)' : '(not reported)'));

  }

  return lines.join('\n');

}



export default function TopicDetailPage() {

  const db = useDb();

  const { topicId } = useParams<{ topicId: string }>();

  const navigate = useNavigate();

  const [topic, setTopic] = useState<Topic | null>(null);

  const [refs, setRefs] = useState<Reference[]>([]);

  const [url, setUrl] = useState('');

  const [title, setTitle] = useState('');

  const [note, setNote] = useState('');

  const [snippetTitle, setSnippetTitle] = useState('');

  const [snippetBody, setSnippetBody] = useState('');

  const [rename, setRename] = useState('');

  const [error, setError] = useState<string | null>(null);

  const [copyHint, setCopyHint] = useState<string | null>(null);



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



  async function submitSnippet(e: React.FormEvent) {

    e.preventDefault();

    setError(null);

    try {

      await addSnippetReference(db, tid, { title: snippetTitle.trim(), body: snippetBody });

      setSnippetTitle('');

      setSnippetBody('');

      await load();

    } catch (err) {

      setError(err instanceof Error ? err.message : String(err));

    }

  }



  async function removeRef(id: string) {

    await deleteReference(db, id);

    await load();

  }



  async function copySnippetBody(body: string) {

    const ok = await writeClipboard(body);

    setCopyHint(ok ? 'Copied to clipboard.' : 'Could not copy.');

    window.setTimeout(() => setCopyHint(null), 2000);

  }



  async function copyFileDetail(r: FileRef) {

    const ok = await writeClipboard(formatFileDetailText(r));

    setCopyHint(ok ? 'Copied to clipboard.' : 'Could not copy.');

    window.setTimeout(() => setCopyHint(null), 2000);

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

          {copyHint ? <div style={{ marginTop: 8, color: '#166534', fontSize: '0.85rem' }}>{copyHint}</div> : null}

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

        <h2 style={{ margin: '0 0 0.65rem', fontSize: '1rem' }}>Add text snippet</h2>

        <form onSubmit={(e) => void submitSnippet(e)}>

          <div className="row" style={{ marginBottom: '0.5rem' }}>

            <input

              type="text"

              placeholder="Title (optional; first line of text used if empty)"

              value={snippetTitle}

              onChange={(e) => setSnippetTitle(e.target.value)}

            />

          </div>

          <div style={{ marginBottom: '0.5rem' }}>

            <textarea

              placeholder="Paste or type the text to save…"

              value={snippetBody}

              onChange={(e) => setSnippetBody(e.target.value)}

              required

              rows={5}

            />

          </div>

          <button type="submit" className="btn btn-primary">

            Add snippet

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

                  {r.type === 'url' ? (

                    <>

                      <a href={r.url} target="_blank" rel="noopener noreferrer">

                        <strong>{r.title}</strong>

                      </a>

                      <div className="ref-meta">{r.url}</div>

                      {r.note ? <div style={{ marginTop: '0.35rem', fontSize: '0.85rem' }}>{r.note}</div> : null}

                    </>

                  ) : r.type === 'file' ? (

                    <>

                      <div className="app-muted" style={{ fontSize: '0.72rem', marginBottom: 4 }}>

                        {typeof r.nestedFileCount === 'number'

                          ? pwaPreferEs()

                            ? 'Resumen de carpeta'

                            : 'Folder summary'

                          : pwaPreferEs()

                            ? 'Metadatos de archivo'

                            : 'Local file metadata'}

                      </div>

                      <strong>{r.title}</strong>

                      <pre

                        style={{

                          marginTop: '0.35rem',

                          fontSize: '0.82rem',

                          whiteSpace: 'pre-wrap',

                          wordBreak: 'break-word',

                          fontFamily: 'inherit',

                        }}

                      >

                        {formatFileDetailText(r)}

                      </pre>

                      <button type="button" className="btn btn-ghost" style={{ marginTop: '0.35rem' }} onClick={() => void copyFileDetail(r)}>

                        Copy details

                      </button>

                    </>

                  ) : (

                    <>

                      <div className="app-muted" style={{ fontSize: '0.72rem', marginBottom: 4 }}>

                        Snippet

                      </div>

                      {r.sourceHighlightUrl?.startsWith('http') ? (
                        <a href={r.sourceHighlightUrl} target="_blank" rel="noopener noreferrer">
                          <strong>{r.title}</strong>
                        </a>
                      ) : r.sourcePageUrl?.startsWith('http') ? (
                        <a href={r.sourcePageUrl} target="_blank" rel="noopener noreferrer">
                          <strong>{r.title}</strong>
                        </a>
                      ) : (
                        <strong>{r.title}</strong>
                      )}

                      <pre

                        style={{

                          marginTop: '0.35rem',

                          fontSize: '0.82rem',

                          whiteSpace: 'pre-wrap',

                          wordBreak: 'break-word',

                          fontFamily: 'inherit',

                        }}

                      >

                        {r.body}

                      </pre>

                      <button type="button" className="btn btn-ghost" style={{ marginTop: '0.35rem' }} onClick={() => void copySnippetBody(r.body)}>

                        Copy text

                      </button>

                    </>

                  )}

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

