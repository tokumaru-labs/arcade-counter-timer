/**
 * Render the real popup with headless Chrome and save raw captures to
 * store-assets/source/. Node standard library only.
 *
 * The captures are produced by the shipped popup.html / popup.css / popup.js —
 * nothing is drawn or mocked up. The only addition is a small shim that
 * provides `chrome.storage.local`, which does not exist on a file:// page, and
 * seeds it with a sample session so the statistics screen has something to
 * aggregate. Every number on screen is computed by the extension's own code
 * from that seeded history.
 *
 *   node scripts/capture-screenshots.mjs
 */

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, rmSync, cpSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pngSize } from './png.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RENDER_DIR = join(ROOT, '.render');
const OUT_DIR = join(ROOT, 'store-assets', 'source');

const POPUP_WIDTH = 360;
const POPUP_HEIGHT = 540;

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
];

function findBrowser() {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      'No Chrome or Edge executable found. Set CHROME_PATH to a browser binary and retry.'
    );
  }
  return found;
}

/** A believable but ordinary work history, so the stats screen has real input. */
function seedScript() {
  return `// Capture-only shim. Never shipped: it lives in .render/, which is gitignored
// and excluded from the release ZIP.
(() => {
  const pad = (n) => String(n).padStart(2, '0');
  const key = (d) => \`\${d.getFullYear()}-\${pad(d.getMonth() + 1)}-\${pad(d.getDate())}\`;
  const dayBefore = (n) => {
    const now = new Date();
    return key(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));
  };

  const MIN = 60000;
  const history = {};
  const add = (offset, timeMs, count) => {
    history[dayBefore(offset)] = { timeMs, count };
  };

  // Today, then a scattering of earlier days: recent ones land in this week,
  // the rest roll up into the month and year totals.
  add(0, 102 * MIN + 18000, 38);
  add(1, 187 * MIN, 61);
  add(2, 143 * MIN, 47);
  add(3, 96 * MIN, 33);
  add(5, 168 * MIN, 55);
  for (let i = 8; i < 300; i += 3) {
    add(i, (60 + ((i * 37) % 120)) * MIN, 20 + ((i * 13) % 45));
  }

  const data = {
    stateVersion: 1,
    timer: { running: true, sessionElapsedMs: 0, runStartedAt: Date.now() - (12 * 60000 + 34000) },
    sessionCount: 18,
    history,
    settings: { sound: true, flyText: true, chainEffect: true, subtleCrt: true }
  };

  globalThis.chrome = {
    storage: {
      local: {
        async get(keys) {
          const out = {};
          for (const k of [].concat(keys)) if (k in data) out[k] = data[k];
          return out;
        },
        async set(obj) {
          Object.assign(data, obj);
        },
        async clear() {
          for (const k of Object.keys(data)) delete data[k];
        }
      }
    }
  };

  if (location.hash === '#stats') {
    // Drive the real gear button rather than un-hiding the panel by hand.
    setTimeout(() => document.getElementById('btn-settings').click(), 400);
  }

  // Headless --screenshot fires on the load event, but the popup renders from
  // an async storage read. A deliberately slow image holds the load event open
  // long enough for the real UI to settle. It is 1x1 and invisible.
  addEventListener('DOMContentLoaded', () => {
    const img = document.createElement('img');
    img.src = '/__delay';
    img.alt = '';
    img.style.cssText = 'position:fixed;top:-10px;left:-10px;width:1px;height:1px;opacity:0';
    document.body.appendChild(img);
  });
})();
`;
}

function buildRenderDir() {
  rmSync(RENDER_DIR, { recursive: true, force: true });
  mkdirSync(RENDER_DIR, { recursive: true });

  for (const file of ['popup.css', 'popup.js']) {
    copyFileSync(join(ROOT, file), join(RENDER_DIR, file));
  }
  cpSync(join(ROOT, 'src'), join(RENDER_DIR, 'src'), { recursive: true });
  writeFileSync(join(RENDER_DIR, 'shim.js'), seedScript(), 'utf8');

  // Classic scripts run before deferred modules, so the shim is always in
  // place before popup.js starts. The rest of the document is untouched.
  const html = readFileSync(join(ROOT, 'popup.html'), 'utf8');
  const marker = '<script type="module" src="popup.js"></script>';
  if (!html.includes(marker)) throw new Error('popup.html no longer matches the expected script tag');
  writeFileSync(
    join(RENDER_DIR, 'popup.html'),
    html.replace(marker, `<script src="shim.js"></script>\n    ${marker}`),
    'utf8'
  );
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

/**
 * Serve the render directory over loopback. ES modules are blocked on file://
 * origins, so popup.js would never execute from disk.
 */
function startServer() {
  // 1x1 transparent PNG, served late to postpone the load event.
  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  const server = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/^\/+/, '');
    if (rel === '__delay') {
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'image/png', Connection: 'close' });
        res.end(pixel);
      }, 900);
      return;
    }
    const path = normalize(join(RENDER_DIR, rel || 'popup.html'));
    if (!path.startsWith(RENDER_DIR) || !existsSync(path)) {
      res.writeHead(404).end('not found');
      return;
    }
    const ext = path.slice(path.lastIndexOf('.'));
    res.writeHead(200, {
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      // Keep-alive sockets stop Chrome's "network idle" heuristic from ever
      // settling, which leaves --screenshot waiting forever.
      Connection: 'close'
    });
    res.end(readFileSync(path));
  });
  return new Promise((ok) => {
    server.listen(0, '127.0.0.1', () => ok({ server, port: server.address().port }));
  });
}

/**
 * Must stay async: the local server runs in this same process, so a blocking
 * spawnSync would stop it from ever answering the browser's requests.
 */
async function capture(browser, port, hash, outFile) {
  rmSync(outFile, { force: true });
  const url = `http://127.0.0.1:${port}/popup.html${hash}`;
  const stderr = await new Promise((ok, fail) => {
    const child = spawn(browser, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${POPUP_WIDTH},${POPUP_HEIGHT}`,
      `--screenshot=${outFile}`,
      url
    ]);
    let err = '';
    child.stderr.on('data', (chunk) => {
      err += chunk;
    });
    const killer = setTimeout(() => child.kill(), 60000);
    child.on('error', fail);
    child.on('close', () => {
      clearTimeout(killer);
      ok(err);
    });
  });
  if (!existsSync(outFile)) {
    throw new Error(`Capture failed for ${hash || 'main'}: ${stderr}`);
  }
  const size = pngSize(outFile);
  if (size.width !== POPUP_WIDTH || size.height !== POPUP_HEIGHT) {
    throw new Error(
      `Unexpected capture size for ${outFile}: ${size.width}x${size.height}, expected ${POPUP_WIDTH}x${POPUP_HEIGHT}`
    );
  }
  console.log(`  ${outFile} — ${size.width}x${size.height}`);
}

const browser = findBrowser();
console.log(`Browser: ${browser}`);
buildRenderDir();
mkdirSync(OUT_DIR, { recursive: true });

const { server, port } = await startServer();
console.log('Capturing the real popup:');
try {
  await capture(browser, port, '', join(OUT_DIR, 'popup-main.png'));
  await capture(browser, port, '#stats', join(OUT_DIR, 'popup-stats.png'));
} finally {
  server.closeAllConnections();
  server.close();
}

rmSync(RENDER_DIR, { recursive: true, force: true });
console.log('Done. Compose the store images with scripts/build-store-screenshots.ps1');
