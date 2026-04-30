import { createContext, useContext } from 'react';
import type { SortMySourcesDexie } from '@sortmysources/core';

const DbContext = createContext<SortMySourcesDexie | null>(null);

export function DbProvider({
  db,
  children,
}: {
  db: SortMySourcesDexie;
  children: React.ReactNode;
}) {
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

export function useDb(): SortMySourcesDexie {
  const db = useContext(DbContext);
  if (!db) throw new Error('Db missing');
  return db;
}
