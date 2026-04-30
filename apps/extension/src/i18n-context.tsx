import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Locale } from './messages.js';
import { detectInitialLocale, getMessages } from './messages.js';

const STORAGE_KEY = 'sortmysources_locale';

type I18nValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  messages: ReturnType<typeof getMessages>;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectInitialLocale());

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY, (r: Record<string, unknown>) => {
      const raw = r[STORAGE_KEY];
      if (raw === 'en' || raw === 'es') setLocaleState(raw);
    });
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    void chrome.storage.local.set({ [STORAGE_KEY]: l });
  }, []);

  const messages = useMemo(() => getMessages(locale), [locale]);

  const value = useMemo(
    (): I18nValue => ({
      locale,
      setLocale,
      messages,
    }),
    [locale, setLocale, messages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n outside I18nProvider');
  return ctx;
}