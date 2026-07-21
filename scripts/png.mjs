// Minimal PNG inspection using only Node's standard library.

import { readFileSync } from 'node:fs';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Verify the PNG signature and read the dimensions out of the IHDR chunk.
 * Throws if the file is not a PNG.
 */
export function pngSize(path) {
  const buf = readFileSync(path);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error(`${path} is not a PNG (bad signature)`);
  }
  if (buf.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`${path} has no IHDR chunk where one is required`);
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), bytes: buf.length };
}
