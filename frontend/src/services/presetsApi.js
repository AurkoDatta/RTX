import { apiFetch } from './api.js';

export function listPresets() {
  return apiFetch('/api/presets');
}
