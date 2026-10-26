// Release notices are bundled text, never remote announcements.
export const RELEASE_VERSION = '0.3.1';
const releases = [
  { version: '0.1.2', en: 'Optional live clock in the header', ja: 'ヘッダーに現在時刻を表示できます' },
  { version: '0.1.3', en: 'Selectable visual themes', ja: 'テーマを選べるようになりました' },
  { version: '0.2.0', en: 'Move your timer: Floating / Side panel / Popup', ja: '自由配置・サイドパネル・ポップアップを選べます' },
  { version: '0.3.0', en: 'Six themes and repeatable COUNT undo', ja: '6つのテーマと、繰り返し使えるCOUNT取り消し' }
];

export function compareVersions(a, b) {
  const aa = String(a).split('.').map(Number);
  const bb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const delta = (aa[i] || 0) - (bb[i] || 0);
    if (delta) return Math.sign(delta);
  }
  return 0;
}

export function updateNotice(previousVersion, current = RELEASE_VERSION) {
  if (!previousVersion || compareVersions(previousVersion, current) >= 0) return null;
  const notes = releases.filter((r) => compareVersions(r.version, previousVersion) > 0 && compareVersions(r.version, current) <= 0);
  return notes.length ? { version: current, notes } : null;
}
