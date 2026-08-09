import { listPresets } from '../services/presetsService.js';

export function list(req, res) {
  res.json({ presets: listPresets() });
}
