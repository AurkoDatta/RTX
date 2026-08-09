import { defaultObject } from '../../utils/sceneSchema.js';
import { Button } from '../common/Button.jsx';
import { Input } from '../common/Input.jsx';
import { Select } from '../common/Select.jsx';
import { MaterialEditor } from './MaterialEditor.jsx';
import { Vec3Field } from './Vec3Field.jsx';

const SHAPE_OPTIONS = [
  { value: 'sphere', label: 'Sphere' },
  { value: 'plane', label: 'Plane' },
  { value: 'mesh', label: 'Triangle' },
];

/** One object's full editor: shape selector, its geometry fields, and its material. */
export function ObjectForm({ object, index, onChange, onRemove }) {
  function changeShape(type) {
    // Preserve the current material across a shape change; only the
    // geometry resets to defaults for the newly chosen shape.
    onChange({ ...defaultObject(type), material: object.material });
  }

  function updateField(field, value) {
    onChange({ ...object, [field]: value });
  }

  function updateVertex(vertexIndex, value) {
    const vertices = object.vertices.map((v, i) => (i === vertexIndex ? value : v));
    updateField('vertices', vertices);
  }

  return (
    <fieldset className="space-y-3 rounded border border-hairline p-4">
      <div className="flex items-center justify-between">
        <legend className="px-1 font-display text-sm font-semibold">Object {index + 1}</legend>
        <Button variant="danger" type="button" onClick={onRemove}>
          Remove
        </Button>
      </div>

      <Select label="Shape" value={object.type} onChange={changeShape} options={SHAPE_OPTIONS} />

      {object.type === 'sphere' && (
        <>
          <Vec3Field label="Center" value={object.center} onChange={(v) => updateField('center', v)} />
          <Input
            label="Radius"
            type="number"
            min={0.01}
            step={0.1}
            value={object.radius}
            onChange={(v) => updateField('radius', v)}
          />
        </>
      )}

      {object.type === 'plane' && (
        <>
          <Vec3Field label="Corner" value={object.corner} onChange={(v) => updateField('corner', v)} />
          <Vec3Field label="Edge (u)" value={object.u} onChange={(v) => updateField('u', v)} />
          <Vec3Field label="Edge (v)" value={object.v} onChange={(v) => updateField('v', v)} />
        </>
      )}

      {object.type === 'mesh' && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">A single triangle, defined by its three vertices.</p>
          <Vec3Field label="Vertex 1" value={object.vertices[0]} onChange={(v) => updateVertex(0, v)} />
          <Vec3Field label="Vertex 2" value={object.vertices[1]} onChange={(v) => updateVertex(1, v)} />
          <Vec3Field label="Vertex 3" value={object.vertices[2]} onChange={(v) => updateVertex(2, v)} />
        </div>
      )}

      <MaterialEditor material={object.material} onChange={(m) => updateField('material', m)} />
    </fieldset>
  );
}
