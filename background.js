import { createStore } from './src/controller.js';
import { mountOverlay } from './src/overlay.js';

const store = createStore(chrome.storage.local);
const origin = chrome.runtime.getURL('');
// Content scripts never need direct access to statistics.
const ready = chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
let grantsTail = Promise.resolve();
function grants(task) {
  const result = grantsTail.then(async () => {
    const { overlayGrants = {} } = await chrome.storage.session.get('overlayGrants');
    return task(overlayGrants);
  });
  grantsTail = result.catch(() => {});
  return result;
}
async function authorized(message, sender) {
  if (sender.id !== chrome.runtime.id) return false;
  const validToken = typeof message.token === 'string' && message.token.length > 0;
  if (message.channel === 'arcade-overlay') {
    return Boolean(validToken && sender.tab && await grants((map) => map[sender.tab.id] === message.token));
  }
  if (!sender.url) return false;
  const url = new URL(sender.url), own = new URL(origin);
  if (url.protocol !== own.protocol || url.host !== own.host || url.pathname !== '/popup.html') return false;
  if (sender.frameId > 0) return Boolean(validToken && sender.tab && await grants((map) => map[sender.tab.id] === message.token));
  return true;
}
async function configureAction(preferences) {
  await chrome.sidePanel.setOptions({ enabled: true });
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: preferences.mode === 'sidepanel' });
  await chrome.action.setPopup({ popup: preferences.mode === 'popup' ? 'popup.html' : '' });
}
async function closeOverlays() {
  const ids = await grants(async (map) => {
    await chrome.storage.session.set({ overlayGrants: {} });
    return Object.keys(map).map(Number);
  });
  await Promise.all(ids.map((tabId) => chrome.tabs.sendMessage(tabId, { channel: 'arcade-overlay', action: 'close' }).catch(() => {})));
}
async function openFloating(tab) {
  if (!tab?.id) throw new Error('Open a regular web page, then click the extension icon.');
  const { preferences } = await store.dispatch({ action: 'get' });
  const token = crypto.randomUUID();
  await grants(async (map) => { map[tab.id] = token; await chrome.storage.session.set({ overlayGrants: map }); });
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id }, func: mountOverlay,
      args: [chrome.runtime.getURL(`popup.html?surface=floating&token=${token}`), token, preferences]
    });
  } catch {
    await grants(async (map) => { if (map[tab.id] === token) delete map[tab.id]; await chrome.storage.session.set({ overlayGrants: map }); });
    throw new Error('Click the extension icon on this web page to place the timer. Browser settings and other protected pages do not allow floating mode.');
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  ready.then(async () => {
    await store.dispatch({ action: 'installed', reason: details.reason, previousVersion: details.previousVersion });
    const { preferences } = await store.dispatch({ action: 'get' });
    await configureAction(preferences);
  }).catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  ready.then(async () => configureAction((await store.dispatch({ action: 'get' })).preferences)).catch(console.error);
});

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!['arcade', 'arcade-overlay'].includes(message?.channel)) return false;
  (async () => {
    await ready;
    if (!await authorized(message, sender)) throw new Error('This timer view is no longer connected. Reopen it from the extension icon.');
    if (message.channel === 'arcade-overlay') {
      if (message.action === 'close') {
        await grants(async (map) => { if (map[sender.tab.id] === message.token) delete map[sender.tab.id]; await chrome.storage.session.set({ overlayGrants: map }); });
        return null;
      }
      if (message.action !== 'placement') throw new Error('Unknown overlay operation.');
      const { x, y, locked, compact } = message.value || {};
      return store.dispatch({ action: 'preferences', value: { x, y, locked, compact } });
    }
    if (message.action === 'context') {
      const windowId = sender.tab?.windowId ?? (await chrome.windows.getCurrent()).id;
      return { windowId };
    }
    if (message.action === 'openFloating') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await openFloating(tab);
      return null;
    }
    if (message.action === 'leaveSurface') {
      if (message.surface === 'floating') await closeOverlays();
      if (message.surface === 'sidepanel') await chrome.sidePanel.setOptions({ enabled: false });
      return null;
    }
    if (message.action === 'prepareSidepanel') {
      await chrome.sidePanel.setOptions({ enabled: true });
      return null;
    }
    if (!['get', 'toggle', 'count', 'resetTimer', 'resetCount', 'resetSession', 'setting', 'theme', 'preferences', 'clear', 'claimNotice'].includes(message.action)) throw new Error('Unknown operation.');
    const result = await store.dispatch(message);
    if (message.action === 'preferences' || message.action === 'clear') await configureAction(result.preferences);
    return result;
  })().then((value) => respond({ ok: true, value }), (error) => respond({ ok: false, error: error.message }));
  return true;
});

chrome.action.onClicked.addListener((tab) => {
  // Side-panel mode uses Chrome's native action behavior, preserving the gesture.
  handleAction(tab).catch(async (error) => {
    await chrome.action.setPopup({ popup: `popup.html?error=${encodeURIComponent(error.message)}` });
    if (chrome.action.openPopup) await chrome.action.openPopup().catch(() => {});
  });
});
async function handleAction(tab) {
  const { preferences } = await store.dispatch({ action: 'get' });
  if (preferences.mode === 'floating') await openFloating(tab);
}
chrome.tabs.onRemoved.addListener((tabId) => {
  grants(async (map) => { delete map[tabId]; await chrome.storage.session.set({ overlayGrants: map }); }).catch(console.error);
});
