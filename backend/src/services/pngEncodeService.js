/**
 * Encodes a raw RGB8 pixel buffer into a PNG file on disk. Kept separate
 * from the render pipeline itself: PNG encoding only ever runs once per job,
 * on the final frame at persistence time -- not for every progressive frame
 * streamed over the WebSocket, which stays raw RGB8 for minimal overhead.
 */
import { mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const RENDERS_STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'renders');

/** Converts a raw RGB8 buffer into PNG-encoded bytes. */
export function encodePng(rgb8, width, height) {
  const png = new PNG({ width, height });
  // pngjs works in RGBA; expand each RGB8 pixel with a fully-opaque alpha
  // channel while copying, since the renderer's output has no alpha concept.
  for (let i = 0, j = 0; i < rgb8.length; i += 3, j += 4) {
    png.data[j] = rgb8[i];
    png.data[j + 1] = rgb8[i + 1];
    png.data[j + 2] = rgb8[i + 2];
    png.data[j + 3] = 255;
  }
  return PNG.sync.write(png);
}

/**
 * Encodes and writes a completed render's pixel buffer to
 * `storage/renders/<jobId>.png`, creating the directory if needed. Returns
 * the path to store in the `renders.image_path` column.
 */
export async function saveRenderPng(jobId, rgb8, width, height) {
  await mkdir(RENDERS_STORAGE_DIR, { recursive: true });
  const filePath = path.join(RENDERS_STORAGE_DIR, `${jobId}.png`);
  const pngBuffer = encodePng(rgb8, width, height);

  await new Promise((resolve, reject) => {
    const stream = createWriteStream(filePath);
    stream.on('error', reject);
    stream.on('finish', resolve);
    stream.end(pngBuffer);
  });

  return filePath;
}
