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
import { inflateRawSync } from 'node:zlib';

import { pngSize } from './png.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const EXPECTED = {
  manifestVersion: 3,
  name: '__MSG_extensionName__',
  description: '__MSG_extensionDescription__',
  defaultLocale: 'en',
  version: '0.1.2',
  descriptionLimit: 132,
  permissions: ['storage']
};

/**
 * Localized listing strings. The manifest only holds __MSG_*__ references now,
 * so the real name and description live here and are checked per locale.
 */
const LOCALES = ['en', 'ja'];
const MESSAGE_KEYS = ['extensionName', 'extensionDescription'];

/** Files that belong in the published package, and nothing else. */
const RUNTIME_FILES = [
  'manifest.json',
  'popup.html',
  'popup.css',
  'popup.js',
  'src/clock.js',
  'src/time.js',
  'src/storage.js',
  'src/effects.js',
  'src/input.js',
  '_locales/en/messages.json',
  '_locales/ja/messages.json',
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
const SCANNED_SOURCES = ['popup.html', 'popup.css', 'popup.js', 'src/clock.js', 'src/time.js', 'src/storage.js', 'src/effects.js', 'src/input.js'];

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
  check(`default_locale is "${EXPECTED.defaultLocale}"`, manifest.default_locale === EXPECTED.defaultLocale, manifest.default_locale);
  check(
    `description is "${EXPECTED.description}"`,
    manifest.description === EXPECTED.description,
    manifest.description
  );
  check(
    `action.default_title is "${EXPECTED.name}"`,
    manifest.action?.default_title === EXPECTED.name,
    manifest.action?.default_title
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

/* -------------------------------------------------------------- locales -- */

section('Locales');

check(`_locales/${EXPECTED.defaultLocale} is one of the shipped locales`, LOCALES.includes(EXPECTED.defaultLocale));

for (const locale of LOCALES) {
  const rel = `_locales/${locale}/messages.json`;
  if (!existsSync(join(ROOT, rel))) {
    check(`${rel} exists`, false);
    continue;
  }

  const raw = readFileSync(join(ROOT, rel));
  check(`${rel} has no UTF-8 BOM`, !(raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf));

  let messages = null;
  try {
    messages = JSON.parse(raw.toString('utf8'));
    check(`${rel} is valid JSON`, true);
  } catch (err) {
    check(`${rel} is valid JSON`, false, err.message);
    continue;
  }

  for (const key of MESSAGE_KEYS) {
    const message = messages[key]?.message;
    check(`${rel} defines ${key}`, typeof message === 'string' && message.length > 0);
  }

  const description = messages.extensionDescription?.message ?? '';
  check(
    `${locale} description is within ${EXPECTED.descriptionLimit} characters`,
    description.length > 0 && description.length <= EXPECTED.descriptionLimit,
    `${description.length} characters`
  );
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
  'src/ contains only the five expected modules',
  srcFiles.length === 5 && srcFiles.join(',') === 'clock.js,effects.js,input.js,storage.js,time.js',
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
  const zip = readZipDirectory(zipPath);
  const names = zip.entries.map((e) => e.name);
  const allowed = new Set(RUNTIME_FILES);

  check(
    'entry names use forward slashes',
    !names.some((n) => n.includes('\\')),
    names.filter((n) => n.includes('\\')).join(', ')
  );
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

  // Read the shipped files back out of the archive rather than trusting the
  // working tree: the ZIP is what Chrome actually receives.
  let zipManifest = null;
  try {
    zipManifest = JSON.parse(readZipEntry(zip, 'manifest.json'));
    check('ZIP manifest.json is valid JSON', true);
  } catch (err) {
    check('ZIP manifest.json is valid JSON', false, err.message);
  }

  if (zipManifest) {
    check(`ZIP manifest version is ${EXPECTED.version}`, zipManifest.version === EXPECTED.version, zipManifest.version);
    check(`ZIP manifest default_locale is "${EXPECTED.defaultLocale}"`, zipManifest.default_locale === EXPECTED.defaultLocale, zipManifest.default_locale);
    check(`ZIP manifest name is "${EXPECTED.name}"`, zipManifest.name === EXPECTED.name, zipManifest.name);
    check(`ZIP manifest description is "${EXPECTED.description}"`, zipManifest.description === EXPECTED.description, zipManifest.description);
    check(`ZIP manifest action.default_title is "${EXPECTED.name}"`, zipManifest.action?.default_title === EXPECTED.name, zipManifest.action?.default_title);

    const zipPermissions = zipManifest.permissions ?? [];
    check(
      'ZIP permissions are exactly ["storage"]',
      zipPermissions.length === EXPECTED.permissions.length && zipPermissions.every((p, i) => p === EXPECTED.permissions[i]),
      JSON.stringify(zipPermissions)
    );
  }

  for (const locale of LOCALES) {
    const rel = `_locales/${locale}/messages.json`;
    check(`ZIP contains ${rel}`, names.includes(rel));
    if (!names.includes(rel)) continue;
    try {
      const messages = JSON.parse(readZipEntry(zip, rel));
      const ok = MESSAGE_KEYS.every((key) => typeof messages[key]?.message === 'string' && messages[key].message.length > 0);
      check(`ZIP ${rel} defines ${MESSAGE_KEYS.join(' and ')}`, ok);
    } catch (err) {
      check(`ZIP ${rel} is valid JSON`, false, err.message);
    }
  }
}

/**
 * Read the ZIP central directory. Entry names are returned exactly as stored —
 * no separator rewriting — because "the names use forward slashes" is itself
 * one of the things being checked.
 */
function readZipDirectory(path) {
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
  const entries = [];
  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) throw new Error('Corrupt ZIP central directory');
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    entries.push({
      name: buf.toString('utf8', offset + 46, offset + 46 + nameLen),
      method: buf.readUInt16LE(offset + 10),
      localOffset: buf.readUInt32LE(offset + 42)
    });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return { buf, entries };
}

/** Decompress one entry's bytes as UTF-8 text. */
function readZipEntry({ buf, entries }, name) {
  const entry = entries.find((e) => e.name === name);
  if (!entry) throw new Error(`${name} is not in the archive`);

  const local = entry.localOffset;
  if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error(`Corrupt local header for ${name}`);
  const nameLen = buf.readUInt16LE(local + 26);
  const extraLen = buf.readUInt16LE(local + 28);
  const compressedSize = buf.readUInt32LE(local + 18);
  const start = local + 30 + nameLen + extraLen;
  const body = buf.subarray(start, start + compressedSize);

  if (entry.method === 0) return body.toString('utf8');
  if (entry.method === 8) return inflateRawSync(body).toString('utf8');
  throw new Error(`Unsupported compression method ${entry.method} for ${name}`);
}

/* --------------------------------------------------------------- result -- */

console.log('');
if (failures > 0) {
  console.error(`verify-release: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('verify-release: all checks passed');
