import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import './panel-shell.css';
import { I18nProvider } from './i18n-context';
import { PanelShell } from './panel-shell';
import { SortMySourcesPanelContent } from './panel-app';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <PanelShell>
        <SortMySourcesPanelContent />
      </PanelShell>
    </I18nProvider>
  </StrictMode>,
);
