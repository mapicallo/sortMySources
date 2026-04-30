/**
 * The panel runs in a chrome.windows "popup" window. `tabs.query({ currentWindow: true })`
 * resolves to *this* panel, not the user's browser — use the last-focused normal window instead.
 */
export async function getActiveTabInLastNormalWindow(): Promise<chrome.tabs.Tab | undefined> {
  try {
    const w = await chrome.windows.getLastFocused({ windowTypes: ['normal'], populate: true });
    const tab = w.tabs?.find((t) => t.active);
    if (tab?.id != null) return tab;
  } catch {
    /* ignore */
  }
  const fallback = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return fallback[0];
}
