import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { createDb } from '@sortmysources/core';
import { DbProvider } from './dbContext';
import TopicsPage from './pages/TopicsPage';
import TopicDetailPage from './pages/TopicDetailPage';
import './index.css';

function Shell() {
  const db = useMemo(() => createDb(), []);

  return (
    <DbProvider db={db}>
      <Routes>
        <Route path="/" element={<TopicsPage />} />
        <Route path="/topic/:topicId" element={<TopicDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DbProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Shell />
    </HashRouter>
  </React.StrictMode>,
);
