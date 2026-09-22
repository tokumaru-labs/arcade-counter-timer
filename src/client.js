const params = new URLSearchParams(globalThis.location?.search || '');
export const surface = params.get('surface') || 'popup';
export async function request(action, extra = {}) {
  const result = await chrome.runtime.sendMessage({ channel: 'arcade', token: params.get('token'), action, ...extra });
  if (!result?.ok) throw new Error(result?.error || 'Could not save. Please reopen the timer and try again.');
  return result.value;
}
