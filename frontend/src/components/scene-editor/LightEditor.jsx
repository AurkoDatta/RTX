import { defaultVec3 } from '../../utils/sceneSchema.js';
import { Button } from '../common/Button.jsx';

/**
 * Quick-add controls for the two light shapes the renderer treats
 * specially: a small emissive sphere ("point" light) and an emissive plane
 * ("area" light -- the only kind next-event estimation samples directly for
 * clean soft shadows, see `renderer/src/tracer.rs`). Saves users from
 * hand-assembling a light out of a generic object plus an emissive material.
 */
export function LightEditor({ onAdd }) {
  function addPointLight() {
    onAdd({
      type: 'sphere',
      center: defaultVec3(0, 3, -1),
      radius: 0.1,
      material: { type: 'emissive', emission: defaultVec3(8, 8, 8) },
    });
  }

  function addAreaLight() {
    onAdd({
      type: 'plane',
      corner: defaultVec3(-0.5, 3.99, -1.5),
      u: defaultVec3(1, 0, 0),
      v: defaultVec3(0, 0, 1),
      material: { type: 'emissive', emission: defaultVec3(10, 10, 10) },
    });
  }

  return (
    <div className="flex gap-2">
      <Button type="button" onClick={addPointLight}>
        + Point light
      </Button>
      <Button type="button" onClick={addAreaLight}>
        + Area light
      </Button>
    </div>
  );
}
