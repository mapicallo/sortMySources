import { type MouseEvent as ReactMouseEvent, type ReactNode, useCallback } from 'react';
import { useI18n } from './i18n-context';

function windowGetSelf(): Promise<chrome.windows.Window | undefined> {
  return new Promise((resolve) => {
    chrome.windows.getCurrent((w) => resolve(w));
  });
}

export function PanelShell({ children }: { children: ReactNode }) {
  const { locale, setLocale, messages: m } = useI18n();
  const ver = chrome.runtime.getManifest().version;
  const iconUrl = chrome.runtime.getURL('icons/icon32.png');

  const dragTitleMouseDown = useCallback((ev: ReactMouseEvent<HTMLDivElement>) => {
    if ((ev.target as HTMLElement).closest('[data-no-drag]')) return;
    ev.preventDefault();
    void (async () => {
      const w = await windowGetSelf();
      if (!w?.id || w.left == null || w.top == null) return;
      const sx = ev.screenX;
      const sy = ev.screenY;
      const ol = w.left;
      const ot = w.top;
      const onMove = (e: MouseEvent) => {
        void chrome.windows.update(w.id!, {
          left: Math.round(ol + e.screenX - sx),
          top: Math.round(ot + e.screenY - sy),
        });
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    })();
  }, []);

  const resizeMouseDown = useCallback((ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    void (async () => {
      const w = await windowGetSelf();
      if (!w?.id || !w.width || !w.height) return;
      const sx = ev.screenX;
      const sy = ev.screenY;
      const ow = w.width;
      const oh = w.height;
      const onMove = (e: MouseEvent) => {
        const nw = Math.max(360, ow + e.screenX - sx);
        const nh = Math.max(420, oh + e.screenY - sy);
        void chrome.windows.update(w.id!, { width: nw, height: nh });
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    })();
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: '#faf8f5',
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        color: '#1e293b',
        position: 'relative',
      }}
    >
      <div
        onMouseDown={dragTitleMouseDown}
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          background: 'linear-gradient(180deg, #f2ebe4 0%, #e6ddd2 100%)',
          borderBottom: '1px solid #cfc4b8',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <img src={iconUrl} alt="" width={20} height={20} style={{ flexShrink: 0, pointerEvents: 'none' }} />
        <span style={{ fontWeight: 700, fontSize: 14, flex: 1, letterSpacing: '-0.02em' }}>SortMySources</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px 8px' }}>
          <div
            data-no-drag
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'flex-end',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              {m.langLabel}
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as 'en' | 'es')}
                style={{
                  display: 'block',
                  marginTop: 4,
                  padding: '4px 6px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  background: '#fff',
                  minWidth: 120,
                }}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
          {children}
        </div>

        <div
          role="presentation"
          data-no-drag
          onMouseDown={resizeMouseDown}
          title="Resize"
          style={{
            position: 'absolute',
            right: 2,
            bottom: 44,
            width: 18,
            height: 18,
            cursor: 'nwse-resize',
            zIndex: 3,
            background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.12) 50%)',
            borderRadius: 2,
          }}
        />
      </div>

      <footer
        data-no-drag
        style={{
          flexShrink: 0,
          position: 'relative',
          minHeight: 40,
          padding: '8px 12px',
          background: '#171717',
          color: '#d4d4d4',
          fontSize: 11,
          borderTop: '3px solid #22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 9999, background: '#22c55e' }} />
          <span
            style={{ width: 10, height: 10, borderRadius: 9999, border: '2px solid #fafafa', boxSizing: 'border-box' }}
          />
        </span>

        <div style={{ paddingLeft: 36, paddingRight: 96, textAlign: 'center' }}>
          <span style={{ opacity: 0.9 }}>
            {m.byPrefix}
            <strong style={{ color: '#fff' }}>{m.brandStrong}</strong>
          </span>
          <span style={{ opacity: 0.5 }}> | </span>
          <a href={m.supportLink} target="_blank" rel="noreferrer" style={{ color: '#fbbf24', fontWeight: 600 }}>
            {m.supportLabel}
          </a>
        </div>

        <span style={{ position: 'absolute', right: 12, opacity: 0.75, whiteSpace: 'nowrap' }}>
          {m.versionPrefix} {ver}
        </span>
      </footer>
    </div>
  );
}
