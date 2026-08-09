import { Input } from '../common/Input.jsx';

/** Three numeric fields (X/Y/Z) grouped under one label, for positions and direction vectors. */
export function Vec3Field({ label, value, onChange, step = 0.1 }) {
  function setAxis(axis, axisValue) {
    onChange({ ...value, [axis]: axisValue });
  }

  return (
    <div>
      {label && (
        <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">
          {label}
        </span>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Input
          type="number"
          step={step}
          value={value.x}
          onChange={(v) => setAxis('x', v)}
          aria-label={`${label} X`}
        />
        <Input
          type="number"
          step={step}
          value={value.y}
          onChange={(v) => setAxis('y', v)}
          aria-label={`${label} Y`}
        />
        <Input
          type="number"
          step={step}
          value={value.z}
          onChange={(v) => setAxis('z', v)}
          aria-label={`${label} Z`}
        />
      </div>
    </div>
  );
}
