const PANEL_REL = 'panel.html';
const SESSION_KEY = 'sortmysources_window_id';

/** `session` is preferred (cleared when browser exits); fallback for older Chromium builds. */
function sessionLike(): chrome.storage.StorageArea {
  return chrome.storage.session ?? chrome.storage.local;
}

/**
 * If we still have a recorded window id, focus it only when that window is actually
 * our SortMySources panel — otherwise stale ids caused "nothing happens" on click.
 */
async function tryFocusStoredPanel(): Promise<boolean> {
  try {
    const data = await sessionLike().get(SESSION_KEY);
    const wid = data[SESSION_KEY] as number | undefined;
    if (typeof wid !== 'number') return false;

    const w = await chrome.windows.get(wid, { populate: true });
    const tabUrl = w.tabs?.[0]?.url ?? '';
    const ours = chrome.runtime.getURL(PANEL_REL);
    if (!tabUrl || tabUrl.split(/[?#]/)[0] !== ours.split(/[?#]/)[0]) {
      await sessionLike().remove(SESSION_KEY);
      return false;
    }

    await chrome.windows.update(wid, { focused: true });
    return true;
  } catch {
    try {
      await sessionLike().remove(SESSION_KEY);
    } catch {
      /* ignore */
    }
    return false;
  }
}

chrome.action.onClicked.addListener(async () => {
  try {
    if (await tryFocusStoredPanel()) return;

    const panelUrl = chrome.runtime.getURL(PANEL_REL);
    const created = await chrome.windows.create({
      url: panelUrl,
      type: 'popup',
      width: 404,
      height: 688,
      focused: true,
    });
    if (created?.id !== undefined) {
      await sessionLike().set({ [SESSION_KEY]: created.id });
    }
  } catch (e) {
    console.error('SortMySources: failed to open panel', e);
  }
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  try {
    const data = await sessionLike().get(SESSION_KEY);
    if (data[SESSION_KEY] === windowId) {
      await sessionLike().remove(SESSION_KEY);
    }
  } catch {
    /* ignore */
  }
});

export {};
