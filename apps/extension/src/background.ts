const PANEL_REL = 'panel.html';
const SESSION_KEY = 'sortmysources_window_id';

chrome.action.onClicked.addListener(async () => {
  try {
    const data = await chrome.storage.session.get(SESSION_KEY);
    const wid = data[SESSION_KEY] as number | undefined;
    if (typeof wid === 'number') {
      try {
        await chrome.windows.get(wid);
        await chrome.windows.update(wid, { focused: true });
        return;
      } catch {
        await chrome.storage.session.remove(SESSION_KEY);
      }
    }
    const panelUrl = chrome.runtime.getURL(PANEL_REL);
    const created = await chrome.windows.create({
      url: panelUrl,
      type: 'popup',
      width: 404,
      height: 688,
      focused: true,
    });
    if (created?.id !== undefined) {
      await chrome.storage.session.set({ [SESSION_KEY]: created.id });
    }
  } catch (e) {
    console.error('SortMySources: failed to open panel', e);
  }
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  const data = await chrome.storage.session.get(SESSION_KEY);
  const wid = data[SESSION_KEY];
  if (wid === windowId) {
    await chrome.storage.session.remove(SESSION_KEY);
  }
});

export {};
