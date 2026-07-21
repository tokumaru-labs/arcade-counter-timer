/**
 * Pre-release checks. Node standard library only, no dependencies.
 *
 *   npm run verify
 *
 * Exits non-zero on the first failing category so a broken package cannot be
 * uploaded by accident.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pngSize } from './png.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const EXPECTED = {
  manifestVersion: 3,
  name: 'Arcade Counter Timer',
  version: '0.1.0',
  descriptionLimit: 132,
  permissions: ['storage']
};

/** Files that belong in the published package, and nothing else. */
const RUNTIME_FILES = [
  'manifest.json',
  'popup.html',
  'popup.css',
  'popup.js',
  'src/time.js',
  'src/storage.js',
  'src/effects.js',
  'src/input.js',
  'assets/icons/icon16.png',
  'assets/icons/icon32.png',
  'assets/icons/icon48.png',
  'assets/icons/icon128.png',
  'LICENSE'
];

/** Manifest keys that must not appear: each widens the extension's reach. */
const FORBIDDEN_MANIFEST_KEYS = [
  'host_permissions',
  'content_scripts',
  'background',
  'externally_connectable',
  'oauth2',
  'key',
  'update_url',
  'optional_permissions',
  'optional_host_permissions',
  'web_accessible_resources',
  'declarative_net_request'
];

/** Remote-reference scanning is limited to code the browser actually runs. */
const SCANNED_SOURCES = ['popup.html', 'popup.css', 'popup.js', 'src/time.js', 'src/storage.js', 'src/effects.js', 'src/input.js'];

let failures = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/* ------------------------------------------------------------- manifest -- */

section('Manifest');

let manifest = null;
try {
  manifest = JSON.parse(read('manifest.json'));
  check('manifest.json is valid JSON', true);
} catch (err) {
  check('manifest.json is valid JSON', false, err.message);
}

if (manifest) {
  check('manifest_version is 3', manifest.manifest_version === EXPECTED.manifestVersion, String(manifest.manifest_version));
  check(`name is "${EXPECTED.name}"`, manifest.name === EXPECTED.name, manifest.name);
  check(`version is ${EXPECTED.version}`, manifest.version === EXPECTED.version, manifest.version);

  const description = manifest.description ?? '';
  check('description is present', description.length > 0);
  check(
    `description is within ${EXPECTED.descriptionLimit} characters`,
    description.length <= EXPECTED.descriptionLimit,
    `${description.length} characters`
  );

  const permissions = manifest.permissions ?? [];
  check(
    'permissions are exactly ["storage"]',
    permissions.length === EXPECTED.permissions.length && permissions.every((p, i) => p === EXPECTED.permissions[i]),
    JSON.stringify(permissions)
  );

  for (const key of FORBIDDEN_MANIFEST_KEYS) {
    check(`no "${key}" key`, !(key in manifest));
  }

  check('action.default_popup is popup.html', manifest.action?.default_popup === 'popup.html');
}

/* ---------------------------------------------------------------- files -- */

section('Runtime files');

for (const rel of RUNTIME_FILES) {
  check(`${rel} exists`, existsSync(join(ROOT, rel)));
}

/* ---------------------------------------------------------------- icons -- */

section('Icons');

if (manifest) {
  const declared = new Map();
  for (const group of [manifest.icons, manifest.action?.default_icon]) {
    for (const [size, path] of Object.entries(group ?? {})) declared.set(`${size}:${path}`, { size, path });
  }
  check('manifest declares icons', declared.size > 0);

  for (const { size, path } of declared.values()) {
    const abs = join(ROOT, path);
    if (!existsSync(abs)) {
      check(`${path} exists`, false);
      continue;
    }
    try {
      const { width, height } = pngSize(abs);
      const expected = Number(size);
      check(
        `${path} is a ${expected}x${expected} PNG`,
        width === expected && height === expected,
        `${width}x${height}`
      );
    } catch (err) {
      check(`${path} is a valid PNG`, false, err.message);
    }
  }
}

/* ------------------------------------------------------- code integrity -- */

section('No remote code or inline script');

const popupHtml = read('popup.html');

// Any <script> without a src attribute would be inline code.
const scriptTags = popupHtml.match(/<script\b[^>]*>/gi) ?? [];
check(
  'every <script> tag loads a local src',
  scriptTags.every((tag) => /\ssrc\s*=\s*"[^"]+"/i.test(tag)),
  scriptTags.join(' ')
);
check(
  'no <script> tag has inline content',
  !/<script\b[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(popupHtml)
);
check('no on* event attributes in popup.html', !/\son[a-z]+\s*=\s*["']/i.test(popupHtml));
check('no javascript: URLs in popup.html', !/javascript:/i.test(popupHtml));

for (const rel of SCANNED_SOURCES) {
  const source = read(rel);
  check(`${rel} has no eval(`, !/\beval\s*\(/.test(source));
  check(`${rel} has no new Function(`, !/\bnew\s+Function\s*\(/.test(source));
  check(
    `${rel} has no http(s) references`,
    !/https?:\/\//i.test(source),
    (source.match(/https?:\/\/\S+/i) ?? [])[0] ?? ''
  );
}

check(
  'manifest.json has no http(s) references',
  !/https?:\/\//i.test(read('manifest.json'))
);

/* ------------------------------------------------------------- src tree -- */

section('Source tree');

const srcFiles = readdirSync(join(ROOT, 'src')).sort();
check(
  'src/ contains only the four expected modules',
  srcFiles.length === 4 && srcFiles.join(',') === 'effects.js,input.js,storage.js,time.js',
  srcFiles.join(', ')
);

/* --------------------------------------------------------- store assets -- */

section('Store assets (not shipped in the ZIP)');

const STORE_ASSETS = [
  ['store-assets/store-icon-128.png', 128, 128],
  ['store-assets/small-promo-440x280.png', 440, 280],
  ['store-assets/marquee-promo-1400x560.png', 1400, 560],
  ['store-assets/screenshot-main-1280x800.png', 1280, 800],
  ['store-assets/screenshot-stats-1280x800.png', 1280, 800],
  ['store-assets/source/popup-main.png', 360, 540],
  ['store-assets/source/popup-stats.png', 360, 540]
];

for (const [rel, w, h] of STORE_ASSETS) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) {
    console.log(`  SKIP  ${rel} not built yet`);
    continue;
  }
  try {
    const { width, height } = pngSize(abs);
    check(`${rel} is ${w}x${h}`, width === w && height === h, `${width}x${height}`);
  } catch (err) {
    check(`${rel} is a valid PNG`, false, err.message);
  }
}

/* ------------------------------------------------------------------ zip -- */

section('Release ZIP');

const zipPath = join(ROOT, 'dist', `arcade-counter-timer-v${EXPECTED.version}-chrome-web-store.zip`);

if (!existsSync(zipPath)) {
  console.log('  SKIP  no ZIP built yet — run "npm run package" then re-run verify');
} else {
  const names = listZipEntries(zipPath);
  const allowed = new Set(RUNTIME_FILES);

  check('manifest.json sits at the ZIP root', names.includes('manifest.json'));
  check(
    'no wrapper directory',
    !names.some((n) => n.startsWith('arcade-counter-timer/')),
    names.find((n) => n.startsWith('arcade-counter-timer/')) ?? ''
  );

  const unexpected = names.filter((n) => !n.endsWith('/') && !allowed.has(n));
  check('ZIP contains only runtime files', unexpected.length === 0, unexpected.join(', '));

  const missing = RUNTIME_FILES.filter((f) => !names.includes(f));
  check('ZIP contains every runtime file', missing.length === 0, missing.join(', '));

  for (const excluded of ['tests/', 'scripts/', 'store-assets/', 'store-listing/', 'node_modules/', '.git/']) {
    check(`ZIP excludes ${excluded}`, !names.some((n) => n.startsWith(excluded)));
  }
  for (const excluded of ['package.json', 'package-lock.json', 'README.md', 'README_JA.md', 'PRIVACY.md', 'PRIVACY_JA.md', 'CHANGELOG.md', 'SECURITY.md']) {
    check(`ZIP excludes ${excluded}`, !names.includes(excluded));
  }
}

/**
 * Read entry names straight out of the ZIP central directory. Only the names
 * are needed, so nothing has to be decompressed.
 */
function listZipEntries(path) {
  const buf = readFileSync(path);
  const EOCD = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i -= 1) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(`${path} is not a ZIP archive`);

  const count = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  const names = [];
  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) throw new Error('Corrupt ZIP central directory');
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    names.push(buf.toString('utf8', offset + 46, offset + 46 + nameLen).replaceAll('\\', '/'));
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return names;
}

/* --------------------------------------------------------------- result -- */

console.log('');
if (failures > 0) {
  console.error(`verify-release: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('verify-release: all checks passed');
