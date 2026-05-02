import { type ReactNode, useCallback } from 'react';
import { useI18n } from './i18n-context';

function windowGetSelf(): Promise<chrome.windows.Window | undefined> {
  return new Promise((resolve) => {
    chrome.windows.getCurrent((w) => resolve(w));
  });
}

export function PanelShell({ children }: { children: ReactNode }) {
  const { locale, setLocale, messages: m } = useI18n();
  const ver = chrome.runtime.getManifest().version;

  const minimizeSelf = useCallback(() => {
    void chrome.windows.getCurrent((w) => {
      if (w?.id != null) void chrome.windows.update(w.id, { state: 'minimized' });
    });
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

  /** AI4Context brand mark — vertical green bar + filled white circle (matches sister extensions). */
  const footerBrandMark = (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span
        style={{
          width: 5,
          height: 22,
          background: '#22c55e',
          borderRadius: 1,
          flexShrink: 0,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
        }}
      />
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 9999,
          background: '#fafafa',
          flexShrink: 0,
          boxSizing: 'border-box',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
        }}
      />
    </span>
  );

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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px 8px' }}>
          <div
            data-no-drag
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 8,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                minWidth: 0,
                flex: '1 1 160px',
              }}
            >
              <button
                type="button"
                onClick={minimizeSelf}
                title={m.panelMinimizeTitle}
                style={{
                  alignSelf: 'flex-start',
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#475569',
                }}
              >
                {m.panelMinimize}
              </button>
              <p style={{ margin: 0, fontSize: 10, lineHeight: 1.35, color: '#64748b', maxWidth: 300 }}>
                {m.panelFloatingHint}
              </p>
            </div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', flexShrink: 0 }}>
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
        {footerBrandMark}

        <div style={{ paddingLeft: 44, paddingRight: 96, textAlign: 'center' }}>
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
