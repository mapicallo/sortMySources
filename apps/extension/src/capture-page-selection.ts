import { getActiveTabInLastNormalWindow } from './active-browser-tab';

export type CaptureSelectionIssue = 'no_tab' | 'not_http' | 'empty' | 'script_failed';

export type CaptureSelectionOutcome =
  | { ok: true; text: string; pageUrl: string; pageTitle: string }
  | { ok: false; issue: CaptureSelectionIssue; pageUrl?: string; pageTitle?: string };

export async function readSelectionFromFocusedPage(): Promise<CaptureSelectionOutcome> {
  let pageUrl = '';
  let pageTitle = '';

  try {
    const tab = await getActiveTabInLastNormalWindow();
    const tabId = tab?.id;
    pageUrl = tab?.url ?? '';
    pageTitle = tab?.title?.trim() ?? '';
    if (!tabId || typeof tabId !== 'number') return { ok: false, issue: 'no_tab' };

    const isHttp =
      typeof pageUrl === 'string' && (pageUrl.startsWith('http://') || pageUrl.startsWith('https://'));
    if (!isHttp) return { ok: false, issue: 'not_http' };

    const [inj] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => (window.getSelection()?.toString() ?? '').trim(),
    });
    const text = typeof inj?.result === 'string' ? inj.result.trim() : '';
    if (!text) return { ok: false, issue: 'empty', pageUrl, pageTitle };

    return { ok: true, text, pageUrl, pageTitle };
  } catch {
    return { ok: false, issue: 'script_failed', pageUrl, pageTitle };
  }
}
