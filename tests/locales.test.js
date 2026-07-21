import test from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = ['en', 'ja'];
const DESCRIPTION_LIMIT = 132;

const readBytes = (rel) => readFileSync(join(ROOT, rel));
const readJson = (rel) => JSON.parse(readBytes(rel).toString('utf8'));

test('the manifest refers to localized strings instead of literals', () => {
  const manifest = readJson('manifest.json');

  assert.equal(manifest.default_locale, 'en');
  assert.equal(manifest.name, '__MSG_extensionName__');
  assert.equal(manifest.description, '__MSG_extensionDescription__');
  assert.equal(manifest.action.default_title, '__MSG_extensionName__');
});

test('the manifest keeps its version, popup and single permission', () => {
  const manifest = readJson('manifest.json');

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, '0.1.1');
  assert.equal(manifest.action.default_popup, 'popup.html');
  assert.deepEqual(manifest.permissions, ['storage']);
});

for (const locale of LOCALES) {
  const rel = `_locales/${locale}/messages.json`;

  test(`${rel} is BOM-free UTF-8`, () => {
    const bytes = readBytes(rel);
    assert.ok(!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf), 'unexpected UTF-8 BOM');
  });

  test(`${rel} defines every string the manifest references`, () => {
    const messages = readJson(rel);

    assert.equal(messages.extensionName.message, 'Arcade Counter Timer');
    assert.equal(typeof messages.extensionDescription.message, 'string');
    assert.ok(messages.extensionDescription.message.length > 0);
  });

  test(`${rel} description fits the Chrome Web Store limit`, () => {
    const { message } = readJson(rel).extensionDescription;
    assert.ok(message.length <= DESCRIPTION_LIMIT, `${message.length} characters`);
  });
}
