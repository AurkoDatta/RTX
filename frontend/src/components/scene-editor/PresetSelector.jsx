import { useEffect, useState } from 'react';
import { listPresets } from '../../services/presetsApi.js';

/** Loads the built-in preset list once and lets the user pick one to load into the editor. */
export function PresetSelector({ onSelect }) {
  const [presets, setPresets] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listPresets()
      .then((data) => setPresets(data.presets))
      .catch(() => setError('Could not load presets.'));
  }, []);

  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-text-muted">Start from a preset</span>
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(preset)}
          title={preset.description}
          className="rounded border border-hairline px-3 py-1.5 text-sm text-text-muted transition hover:border-glass hover:text-glass"
        >
          {preset.name}
        </button>
      ))}
    </div>
  );
}
