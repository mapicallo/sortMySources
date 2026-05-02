/** UI strings — extension panel (EN / ES). */
export type Locale = 'en' | 'es';

export interface Messages {
  exportJson: string;
  importJson: string;
  /** Collapsible section for whole-DB backup (advanced). */
  backupAdvancedSummary: string;
  backupAdvancedHelp: string;
  exportMapButton: string;
  importMapButton: string;
  exportMapTitle: string;
  importMapTitle: string;
  exportMapDone: string;
  importMapDone: (name: string) => string;
  importConfirm: string;
  searchLabel: string;
  searchPlaceholder: string;
  snippetCopied: string;
  copySnippetFailed: string;
  addSnippetHeading: string;
  snippetTitlePlaceholder: string;
  snippetBodyPlaceholder: string;
  addSnippet: string;
  addedSnippetDone: string;
  openSnippetTooltip: string;
  openSnippetHighlightTooltip: string;
  copySnippetTooltip: string;
  copySnippetShort: string;
  renameSourceShort: string;
  renameSourceTitle: string;
  renameSourceSave: string;
  renameSourceCancel: string;
  sourceRenamedDone: string;
  removedSnippet: string;
  snippetKindLabel: string;
  noMatches: string;
  mapBtn: string;
  showMapTitle: string;
  mapPickerLabel: string;
  selectMap: string;
  savedSourcesHeading: string;
  /** Bulk actions for saved sources list */
  selectAllSavedSources: string;
  removeSelectedSources: string;
  removedSelectedSourcesBulk: string;
  savedSourceRowSelectAria: (label: string) => string;
  addSourcesHeading: string;
  noRecent: string;
  newMapPlaceholder: string;
  addMapTitle: string;
  deleteMapButton: string;
  deleteMapTitle: string;
  deleteMapConfirm: (mapName: string) => string;
  mapDeletedDone: (mapName: string) => string;
  renameMapButton: string;
  renameMapTitle: string;
  renameMapPlaceholder: string;
  mapRenamedDone: (name: string) => string;
  errMapRenameEmpty: string;
  errMapRenameDuplicate: string;
  addCurrentTab: string;
  tabSaveTitlePlaceholder: string;
  tabMustHttp: string;
  addTabFoldDesc: string;
  addDomSelection: string;
  addDomSelectionDesc: string;
  addSnippetFoldDesc: string;
  selectionFoldHowto: string;
  refreshSelection: string;
  saveSelectionSnippet: string;
  addedSelectionDone: string;
  selectionSourceLabel: string;
  errSelectionNoTab: string;
  errSelectionNotHttp: string;
  errSelectionEmpty: string;
  errSelectionScriptFailed: string;
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
  addLocalFileFoldTitle: string;
  addLocalFileFoldDesc: string;
  fileMetaPickerHint: string;
  fileMetaLocationNoteLabel: string;
  fileMetaLocationNotePlaceholder: string;
  renameFileLocationLabel: string;
  pickLocalFiles: string;
  pickLocalFolder: string;
  fileKindLabel: string;
  addedFileMetaDone: (savedCount: number) => string;
  addedFileMetaTruncated: (savedCount: number, maxAllowed: number) => string;
  removedFile: string;
  addedFolderAggregateDone: (folderName: string, fileCount: number) => string;
  folderAggregateCardTitle: (folderName: string, fileCount: number) => string;
  folderAggregateKindLabel: string;
  fileDetailFileNameLabel: string;
  fileDetailLocationNoteLabel: string;
  fileDetailRelativePathLabel: string;
  fileDetailRelativePathAbsent: string;
  fileDetailNestedFilesLine: (countFormatted: string) => string;
  fileDetailCombinedSizeHint: string;
  fileDetailFolderNewestModifiedHint: string;
  fileDetailSize: string;
  fileDetailModified: string;
  fileDetailKind: string;
  fileDetailTechnicalMimeNote: string;
  fileDetailUnknownKind: string;
  panelMinimize: string;
  panelMinimizeTitle: string;
  panelFloatingHint: string;
}


const en: Messages = {
  exportJson: 'Export JSON',
  importJson: 'Import JSON',
  backupAdvancedSummary: 'Full backup (advanced)',
  backupAdvancedHelp:
    'Exports or replaces all extension data. To share only one map, use Export map / Import map next to the map controls.',
  exportMapButton: 'Export map',
  importMapButton: 'Import map',
  exportMapTitle: 'Download the selected map as a JSON file',
  importMapTitle: 'Create a new map from a single-map JSON file',
  exportMapDone: 'Map exported ✓',
  importMapDone: (name) => `Imported map «${name}» ✓`,
  importConfirm: 'Replace all data in this extension with this backup?',
  searchLabel: 'Search all maps',
  searchPlaceholder: 'Title, URL, note, snippet text, map name…',
  snippetCopied: 'Snippet copied ✓',
  copySnippetFailed: 'Could not copy to clipboard.',
  addSnippetHeading: 'Save text snippet',
  snippetTitlePlaceholder: 'Title (optional)',
  snippetBodyPlaceholder: 'Paste text…',
  addSnippet: 'Add snippet',
  addedSnippetDone: 'Snippet saved ✓',
  openSnippetTooltip: 'Show or hide snippet text',
  openSnippetHighlightTooltip:
    'Open the webpage — scrolls to your saved passage when supported (text fragment)',
  copySnippetTooltip: 'Copy snippet to clipboard',
  copySnippetShort: 'Copy',
  renameSourceShort: 'Rename',
  renameSourceTitle: 'Edit how this source appears in the map',
  renameSourceSave: 'Save',
  renameSourceCancel: 'Cancel',
  sourceRenamedDone: 'Title updated ✓',
  removedSnippet: 'Snippet removed',
  snippetKindLabel: 'Snippet',
  noMatches: 'No matches.',
  mapBtn: 'Map',
  showMapTitle: 'Show this map in the list below',
  mapPickerLabel: 'Map',
  selectMap: 'Select…',
  savedSourcesHeading: 'Saved sources in the selected map:',
  selectAllSavedSources: 'Select all',
  removeSelectedSources: 'Remove selected',
  removedSelectedSourcesBulk: 'Selected sources removed ✓',
  savedSourceRowSelectAria: (label) => `Select source: ${label}`,
  addSourcesHeading: 'Add new sources to the selected map:',
  noRecent: 'Nothing in this map yet.',
  newMapPlaceholder: 'New map…',
  addMapTitle: 'Add map',
  deleteMapButton: 'Delete map',
  deleteMapTitle: 'Delete the selected map and all its sources',
  deleteMapConfirm: (mapName) =>
    `Delete map "${mapName}" and all sources inside it? This cannot be undone.`,
  mapDeletedDone: (mapName) => `Map "${mapName}" deleted ✓`,
  renameMapButton: 'Rename map',
  renameMapTitle: 'Change the name of the selected map',
  renameMapPlaceholder: 'New map name',
  mapRenamedDone: (name) => `Map renamed to «${name}» ✓`,
  errMapRenameEmpty: 'The map name cannot be empty.',
  errMapRenameDuplicate: 'A map with that name already exists.',
  addCurrentTab: 'Add current tab',
  tabSaveTitlePlaceholder: 'Custom title (empty = page title)',
  tabMustHttp: 'Active tab must be http(s)',
  addTabFoldDesc: 'Save this tab as a link. You can rename how it appears in the map.',
  addDomSelection: 'Add page selection',
  addDomSelectionDesc: 'Turn highlighted text on the page into a snippet (page URL is kept for context).',
  addSnippetFoldDesc: 'Save a plain-text clip — paste from anywhere; no page required.',
  selectionFoldHowto:
    'Highlight text in the website, then use Refresh (or open this section again). You can edit before saving.',
  refreshSelection: 'Refresh from page',
  saveSelectionSnippet: 'Save selection',
  addedSelectionDone: 'Selection saved ✓',
  selectionSourceLabel: 'Source page',
  errSelectionNoTab: 'Could not find the active browser tab.',
  errSelectionNotHttp: 'The active tab must be http(s) to read a selection.',
  errSelectionEmpty: 'No text is selected on the page — select some text or paste below.',
  errSelectionScriptFailed: 'Could not read the selection (try refreshing the page).',
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
  addLocalFileFoldTitle: 'Add file or folder (metadata)',
  addLocalFileFoldDesc:
    'Pick files or a folder. We save names, sizes and dates the browser gives us (no full disk paths). Folder choice becomes one summary row in the map.',
  fileMetaPickerHint:
    'Folder: one summary (file count, total size, latest change). Files: up to 200 per picker. Single files have no subfolder path unless you pick a folder.',
  fileMetaLocationNoteLabel: 'Folder or file location (optional):',
  fileMetaLocationNotePlaceholder:
    'e.g. C:\\Users\\you\\project — browsers never send real paths; paste yours here',
  renameFileLocationLabel: 'Location note (optional)',
  pickLocalFiles: 'Choose files',
  pickLocalFolder: 'Choose folder',
  fileKindLabel: 'Local file',
  addedFileMetaDone: (n) => `${n} file${n === 1 ? '' : 's'} metadata saved ✓`,
  addedFileMetaTruncated: (n, max) =>
    `Imported first ${n} items (${max} max per picker). Run again if you had more.`,
  removedFile: 'File metadata removed',
  addedFolderAggregateDone: (folder, n) =>
    `Folder summary «${folder}»: ${n.toLocaleString()} file${n === 1 ? '' : 's'} (totals in one row) ✓`,
  folderAggregateCardTitle: (folder, n) => `${folder} · ${n.toLocaleString()} files`,
  folderAggregateKindLabel: 'Folder summary',
  fileDetailFileNameLabel: 'Name',
  fileDetailLocationNoteLabel: 'Location (your note)',
  fileDetailRelativePathLabel: 'Relative path (inside picker)',
  fileDetailRelativePathAbsent:
    'No subfolder path: when you choose loose files (not “folder”), the browser only sends the bare file name — not which folder it came from.',
  fileDetailNestedFilesLine: (cf) =>
    `${cf} file entries enumerated under this folder by the browser (used for totals).`,
  fileDetailCombinedSizeHint: 'Total size summed over those files.',
  fileDetailFolderNewestModifiedHint: '“Modified” shows the newest change among those files.',
  fileDetailSize: 'Total size',
  fileDetailModified: 'Modified (latest)',
  fileDetailKind: 'Kind',
  fileDetailTechnicalMimeNote: 'Technical MIME (used by apps; can be opaque):',
  fileDetailUnknownKind: '(type not reported by browser)',
  panelMinimize: 'Minimize',
  panelMinimizeTitle: 'Minimize this window (restore from the taskbar)',
  panelFloatingHint:
    'This panel uses its own window — it stays open while you browse. Minimize it if you need more screen space.',
};

const es: Messages = {
  exportJson: 'Exportar JSON',
  importJson: 'Importar JSON',
  backupAdvancedSummary: 'Copia completa (avanzado)',
  backupAdvancedHelp:
    'Exporta o sustituye todos los datos de la extensión. Para compartir solo un mapa, usa Exportar mapa / Importar mapa junto al selector de mapa.',
  exportMapButton: 'Exportar mapa',
  importMapButton: 'Importar mapa',
  exportMapTitle: 'Descargar el mapa seleccionado como archivo JSON',
  importMapTitle: 'Crear un mapa nuevo desde un archivo JSON de un solo mapa',
  exportMapDone: 'Mapa exportado ✓',
  importMapDone: (name) => `Mapa «${name}» importado ✓`,
  importConfirm: '¿Sustituir todos los datos de esta extensión por esta copia?',
  searchLabel: 'Buscar en todos los mapas',
  searchPlaceholder: 'Título, URL, nota, texto del snippet, mapa…',
  snippetCopied: 'Snippet copiado ✓',
  copySnippetFailed: 'No se pudo copiar al portapapeles.',
  addSnippetHeading: 'Guardar texto (snippet)',
  snippetTitlePlaceholder: 'Título (opcional)',
  snippetBodyPlaceholder: 'Pega el texto…',
  addSnippet: 'Añadir snippet',
  addedSnippetDone: 'Snippet guardado ✓',
  openSnippetTooltip: 'Mostrar u ocultar el texto del snippet',
  openSnippetHighlightTooltip:
    'Abrir la página en el navegador — salta al fragmento cuando el sitio/navegador lo permiten (#:~:text)',
  copySnippetTooltip: 'Copiar snippet al portapapeles',
  copySnippetShort: 'Copiar',
  renameSourceShort: 'Renombrar',
  renameSourceTitle: 'Cambia el título de esta fuente en el mapa',
  renameSourceSave: 'Guardar',
  renameSourceCancel: 'Cancelar',
  sourceRenamedDone: 'Título actualizado ✓',
  removedSnippet: 'Snippet eliminado',
  snippetKindLabel: 'Snippet',
  noMatches: 'Sin resultados.',
  mapBtn: 'Mapa',
  showMapTitle: 'Mostrar este mapa en la lista inferior',
  mapPickerLabel: 'Mapa',
  selectMap: 'Elegir…',
  savedSourcesHeading: 'Fuentes guardadas en el mapa seleccionado:',
  selectAllSavedSources: 'Seleccionar todas',
  removeSelectedSources: 'Eliminar seleccionadas',
  removedSelectedSourcesBulk: 'Fuentes seleccionadas eliminadas ✓',
  savedSourceRowSelectAria: (label) => `Seleccionar fuente: ${label}`,
  addSourcesHeading: 'Añadir nuevas fuentes al mapa seleccionado:',
  noRecent: 'Este mapa aún no tiene fuentes.',
  newMapPlaceholder: 'Nuevo mapa…',
  addMapTitle: 'Añadir mapa',
  deleteMapButton: 'Eliminar mapa',
  deleteMapTitle: 'Eliminar el mapa seleccionado y todas sus fuentes',
  deleteMapConfirm: (mapName) =>
    `¿Eliminar el mapa «${mapName}» y todas las fuentes que contiene? No se puede deshacer.`,
  mapDeletedDone: (mapName) => `Mapa «${mapName}» eliminado ✓`,
  renameMapButton: 'Renombrar mapa',
  renameMapTitle: 'Cambiar el nombre del mapa seleccionado',
  renameMapPlaceholder: 'Nuevo nombre del mapa',
  mapRenamedDone: (name) => `Mapa renombrado a «${name}» ✓`,
  errMapRenameEmpty: 'El nombre del mapa no puede estar vacío.',
  errMapRenameDuplicate: 'Ya existe un mapa con ese nombre.',
  addCurrentTab: 'Añadir pestaña actual',
  tabSaveTitlePlaceholder: 'Título como lo verás en el mapa (vacío = título de la página)',
  tabMustHttp: 'La pestaña activa debe ser http(s)',
  addTabFoldDesc:
    'Guarda la pestaña como enlace al mapa. Puedes cambiar el título antes de guardar.',
  addDomSelection: 'Añadir elemento de la pestaña actual',
  addDomSelectionDesc:
    'Convierte en snippet el texto resaltado en la web (guardamos también la URL de la página como contexto).',
  addSnippetFoldDesc: 'Snippet de texto: pégalo donde quiera; no hace falta ninguna página.',
  selectionFoldHowto:
    'Resalta texto en la web y pulsa Actualizar (o abre de nuevo esta sección). Lo puedes revisar antes de guardar.',
  refreshSelection: 'Actualizar desde la página',
  saveSelectionSnippet: 'Guardar selección',
  addedSelectionDone: 'Selección guardada ✓',
  selectionSourceLabel: 'Página de origen',
  errSelectionNoTab: 'No se encontró la pestaña activa del navegador.',
  errSelectionNotHttp: 'La pestaña activa debe ser http(s) para leer la selección.',
  errSelectionEmpty:
    'No hay texto seleccionado en la página — selecciona algo o pega texto abajo.',
  errSelectionScriptFailed: 'No se pudo leer la selección (prueba recargar la página).',
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
  addLocalFileFoldTitle: 'Metadatos de archivo o carpeta',
  addLocalFileFoldDesc:
    'Elige archivos sueltos o una carpeta. Solo hay metadatos que el navegador envía (sin rutas absolutas del disco). Con carpeta guardamos un único bloque-resumen en el mapa.',
  fileMetaPickerHint:
    'Carpeta = un único bloque en el mapa (nº de ficheros listados por el navegador, tamaño total, fecha más reciente). Archivos sueltos: hasta 200 por selección.',
  fileMetaLocationNoteLabel: 'Ubicación de carpeta o archivo (opcional):',
  fileMetaLocationNotePlaceholder:
    'Ej.: C:\\Users\\tú\\proyecto — el navegador no envía rutas reales; pega aquí la tuya',
  renameFileLocationLabel: 'Ubicación (opcional)',
  pickLocalFiles: 'Elegir archivos',
  pickLocalFolder: 'Elegir carpeta',
  fileKindLabel: 'Archivo local',
  addedFileMetaDone: (n) => `Metadatos de ${n} archivo${n === 1 ? '' : 's'} guardados ✓`,
  addedFileMetaTruncated: (n, max) =>
    `Solo los primeros ${n} elementos (${max} máx. por selección). Repite si había más.`,
  removedFile: 'Metadatos de archivo quitados',
  addedFolderAggregateDone: (folder, n) =>
    `Resumen de carpeta «${folder}»: ${n.toLocaleString()} archivo${n === 1 ? '' : 's'} (todo en una fila) ✓`,
  folderAggregateCardTitle: (folder, n) => `${folder} · ${n.toLocaleString()} archivos`,
  folderAggregateKindLabel: 'Carpeta (resumen)',
  fileDetailFileNameLabel: 'Nombre',
  fileDetailLocationNoteLabel: 'Ubicación (nota tuya)',
  fileDetailRelativePathLabel: 'Ruta relativa (dentro del selector)',
  fileDetailRelativePathAbsent:
    'Sin ruta de subcarpeta: si eliges archivos sueltos (sin “elegir carpeta”), el navegador solo manda el nombre del fichero — no la carpeta de origen.',
  fileDetailNestedFilesLine: (cf) =>
    `${cf} rutas listadas dentro de esa carpeta (lo que cuenta el navegador; así calculamos los totales).`,
  fileDetailCombinedSizeHint: 'Tamaño sumando todos esos ficheros.',
  fileDetailFolderNewestModifiedHint:
    '«Modificado» es la fecha de cambio más reciente encontrada entre esos ficheros.',
  fileDetailSize: 'Tamaño total',
  fileDetailModified: 'Modificado (el más reciente)',
  fileDetailKind: 'Tipo',
  fileDetailTechnicalMimeNote: 'Tipo MIME técnico (interno para programas — a veces suena raro):',
  fileDetailUnknownKind: '(el navegador no informó tipo)',
  panelMinimize: 'Minimizar',
  panelMinimizeTitle:
    'Minimizar esta ventana (vuélvela a abrir desde la barra de tareas / dock)',
  panelFloatingHint:
    'Este panel tiene ventana propia: puede quedar abierta mientras navegas. Minímalo si necesitas más espacio en pantalla.',
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
