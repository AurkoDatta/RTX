import { defaultMaterial } from '../../utils/sceneSchema.js';
import { ColorPicker } from '../common/ColorPicker.jsx';
import { Input } from '../common/Input.jsx';
import { Select } from '../common/Select.jsx';
import { Vec3Field } from './Vec3Field.jsx';

const MATERIAL_OPTIONS = [
  { value: 'lambertian', label: 'Diffuse' },
  { value: 'metal', label: 'Metal' },
  { value: 'dielectric', label: 'Glass' },
  { value: 'emissive', label: 'Light' },
];

/** Material-type selector plus the fields specific to whichever type is chosen. */
export function MaterialEditor({ material, onChange }) {
  function changeType(type) {
    onChange(defaultMaterial(type));
  }

  return (
    <div className="space-y-3">
      <Select
        label="Material"
        value={material.type}
        onChange={changeType}
        options={MATERIAL_OPTIONS}
      />

      {material.type === 'lambertian' && (
        <ColorPicker
          label="Albedo"
          value={material.albedo}
          onChange={(v) => onChange({ ...material, albedo: v })}
        />
      )}

      {material.type === 'metal' && (
        <>
          <ColorPicker
            label="Albedo"
            value={material.albedo}
            onChange={(v) => onChange({ ...material, albedo: v })}
          />
          <Input
            label="Fuzz"
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={material.fuzz}
            onChange={(v) => onChange({ ...material, fuzz: v })}
          />
        </>
      )}

      {material.type === 'dielectric' && (
        <Input
          label="Refractive index"
          type="number"
          min={1}
          step={0.05}
          value={material.ior}
          onChange={(v) => onChange({ ...material, ior: v })}
        />
      )}

      {material.type === 'emissive' && (
        <Vec3Field
          label="Color / intensity"
          value={material.emission}
          onChange={(v) => onChange({ ...material, emission: v })}
          step={0.5}
        />
      )}
    </div>
  );
}
