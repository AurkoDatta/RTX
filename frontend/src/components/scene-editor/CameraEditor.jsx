import { Input } from '../common/Input.jsx';
import { Vec3Field } from './Vec3Field.jsx';

/** Position, look-at target, and field of view. The up vector is left at the renderer's default (+Y). */
export function CameraEditor({ camera, onChange }) {
  function update(field, value) {
    onChange({ ...camera, [field]: value });
  }

  return (
    <fieldset className="space-y-3 rounded border border-hairline p-4">
      <legend className="px-1 font-display text-sm font-semibold">Camera</legend>
      <Vec3Field label="Position" value={camera.position} onChange={(v) => update('position', v)} />
      <Vec3Field label="Look at" value={camera.look_at} onChange={(v) => update('look_at', v)} />
      <Input
        label="Field of view (degrees)"
        type="number"
        min={1}
        max={179}
        value={camera.vfov}
        onChange={(v) => update('vfov', v)}
      />
    </fieldset>
  );
}
