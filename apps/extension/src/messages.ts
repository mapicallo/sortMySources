/** UI strings — extension panel (EN / ES). */
export type Locale = 'en' | 'es';

export interface Messages {
  subtitle: string;
  exportJson: string;
  importJson: string;
  importConfirm: string;
  searchLabel: string;
  searchPlaceholder: string;
  noMatches: string;
  mapBtn: string;
  showMapTitle: string;
  mapPickerLabel: string;
  selectMap: string;
  recentLabel: string;
  noRecent: string;
  newMapPlaceholder: string;
  addMapTitle: string;
  addCurrentTab: string;
  tabMustHttp: string;
  footerPwaHint: string;
  backupDownloaded: string;
  backupImported: string;
  addedTabDone: string;
  removedLink: string;
  errSelectMap: string;
  errTabHttpShort: string;
  langLabel: string;
  byPrefix: string;
  brandStrong: string;
  supportLink: string;
  supportLabel: string;
  versionPrefix: string;
  createdMap: (name: string) => string;
  removedSameUrlLinks: (n: number) => string;
  removeFromMapTooltip: string;
}

const en: Messages = {
  subtitle:
    'Saves locally in this extension (IndexedDB). Use Backup below to sync with the PWA.',
  exportJson: 'Export JSON',
  importJson: 'Import JSON',
  importConfirm: 'Replace all data in this extension with this backup?',
  searchLabel: 'Search all maps',
  searchPlaceholder: 'Title, URL, note, map name…',
  noMatches: 'No matches.',
  mapBtn: 'Map',
  showMapTitle: 'Show this map in the list below',
  mapPickerLabel: 'Map',
  selectMap: 'Select…',
  recentLabel: 'Recent in this map',
  noRecent: 'No references yet.',
  newMapPlaceholder: 'New map…',
  addMapTitle: 'Add map',
  addCurrentTab: 'Add current tab',
  tabMustHttp: 'Active tab must be http(s)',
  footerPwaHint:
    'Full editing and lists live in the PWA. Extension and PWA storage stay separate unless you exchange JSON backups.',
  backupDownloaded: 'Backup downloaded',
  backupImported: 'Backup imported ✓',
  addedTabDone: 'Added current tab ✓',
  removedLink: 'Removed link',
  errSelectMap: 'Select or create a map first.',
  errTabHttpShort: 'Active tab must be http(s)',
  langLabel: 'Language',
  byPrefix: 'by ',
  brandStrong: 'AI4Context',
  supportLink: 'https://github.com/mapicallo',
  supportLabel: 'Support',
  versionPrefix: 'Version',
  createdMap: (name) => `Created map "${name}"`,
  removedSameUrlLinks: (n) => `Removed ${n} links (same URL)`,
  removeFromMapTooltip: 'Remove from map',
};

const es: Messages = {
  subtitle:
    'Se guarda en esta extensión (IndexedDB). Usa copia JSON abajo para sincronizar con la PWA.',
  exportJson: 'Exportar JSON',
  importJson: 'Importar JSON',
  importConfirm: '¿Sustituir todos los datos de esta extensión por esta copia?',
  searchLabel: 'Buscar en todos los mapas',
  searchPlaceholder: 'Título, URL, nota, nombre del mapa…',
  noMatches: 'Sin resultados.',
  mapBtn: 'Mapa',
  showMapTitle: 'Mostrar este mapa en la lista inferior',
  mapPickerLabel: 'Mapa',
  selectMap: 'Elegir…',
  recentLabel: 'Recientes en este mapa',
  noRecent: 'Aún no hay fuentes.',
  newMapPlaceholder: 'Nuevo mapa…',
  addMapTitle: 'Añadir mapa',
  addCurrentTab: 'Añadir pestaña actual',
  tabMustHttp: 'La pestaña activa debe ser http(s)',
  footerPwaHint:
    'Edición completa en la PWA. La extensión y la PWA usan almacenamiento distinto salvo que intercambies copias JSON.',
  backupDownloaded: 'Copia descargada',
  backupImported: 'Copia importada ✓',
  addedTabDone: 'Pestaña añadida ✓',
  removedLink: 'Enlace eliminado',
  errSelectMap: 'Elige o crea un mapa primero.',
  errTabHttpShort: 'La pestaña activa debe ser http(s)',
  langLabel: 'Idioma',
  byPrefix: 'por ',
  brandStrong: 'AI4Context',
  supportLink: 'https://github.com/mapicallo',
  supportLabel: 'Apoyar',
  versionPrefix: 'Versión',
  createdMap: (name) => `Mapa «${name}» creado`,
  removedSameUrlLinks: (n) => `Eliminados ${n} enlaces (misma URL)`,
  removeFromMapTooltip: 'Quitar del mapa',
};

export function getMessages(locale: Locale): Messages {
  return locale === 'es' ? es : en;
}

export function detectInitialLocale(): Locale {
  try {
    if (navigator.language.toLowerCase().startsWith('es')) return 'es';
  } catch {
    /* ignore */
  }
  return 'en';
}
