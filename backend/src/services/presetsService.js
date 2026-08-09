/**
 * Built-in preset scenes, bundled as static JSON and served over
 * GET /api/presets. Read once at module load time since the preset list is
 * fixed application data, not something that changes at runtime.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const presetsDir = path.join(__dirname, '..', 'presets');

const PRESET_FILES = ['cornell-box.json', 'reflective-spheres.json', 'glass-sphere.json'];

const presets = PRESET_FILES.map((file) =>
  JSON.parse(readFileSync(path.join(presetsDir, file), 'utf-8'))
);

export function listPresets() {
  return presets;
}

export function getPresetById(id) {
  return presets.find((preset) => preset.id === id);
}
