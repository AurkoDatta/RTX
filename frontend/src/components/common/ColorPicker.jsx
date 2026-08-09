/**
 * Labeled color swatch for albedo-like material values, which are
 * conventionally bounded to [0, 1] per channel. Converts between the
 * renderer's `{x, y, z}` float representation and the hex string a native
 * `<input type="color">` expects.
 *
 * Not used for emission: light intensity is unbounded HDR (a bright light
 * can meaningfully exceed 1.0 per channel), which a color swatch can't
 * represent -- see `Vec3Field`, used for emission instead.
 */
function toHex(vec3) {
  const channel = (v) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(vec3.x)}${channel(vec3.y)}${channel(vec3.z)}`;
}

function fromHex(hex) {
  const n = parseInt(hex.slice(1), 16);
  return {
    x: ((n >> 16) & 255) / 255,
    y: ((n >> 8) & 255) / 255,
    z: (n & 255) / 255,
  };
}

export function ColorPicker({ label, value, onChange }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={toHex(value)}
          onChange={(event) => onChange(fromHex(event.target.value))}
          className="h-9 w-9 cursor-pointer rounded border border-hairline bg-surface-raised"
        />
        <span className="font-mono text-xs text-text-faint">{toHex(value)}</span>
      </div>
    </label>
  );
}
