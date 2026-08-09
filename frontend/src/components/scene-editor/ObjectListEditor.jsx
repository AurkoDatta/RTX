import { defaultObject } from '../../utils/sceneSchema.js';
import { Button } from '../common/Button.jsx';
import { LightEditor } from './LightEditor.jsx';
import { ObjectForm } from './ObjectForm.jsx';

export function ObjectListEditor({ objects, onChange, maxObjects }) {
  const atLimit = objects.length >= maxObjects;

  function addObject(object) {
    if (atLimit) return;
    onChange([...objects, object]);
  }

  function updateObject(index, next) {
    onChange(objects.map((obj, i) => (i === index ? next : obj)));
  }

  function removeObject(index) {
    onChange(objects.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-sm font-semibold">
          Objects{' '}
          <span className="font-mono text-xs text-text-faint">
            ({objects.length}/{maxObjects})
          </span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => addObject(defaultObject('sphere'))} disabled={atLimit}>
            + Sphere
          </Button>
          <Button type="button" onClick={() => addObject(defaultObject('plane'))} disabled={atLimit}>
            + Plane
          </Button>
          <Button type="button" onClick={() => addObject(defaultObject('mesh'))} disabled={atLimit}>
            + Triangle
          </Button>
          <LightEditor onAdd={addObject} />
        </div>
      </div>

      <div className="space-y-4">
        {objects.map((object, index) => (
          <ObjectForm
            key={index}
            object={object}
            index={index}
            onChange={(next) => updateObject(index, next)}
            onRemove={() => removeObject(index)}
          />
        ))}
      </div>

      {objects.length === 0 && (
        <p className="rounded border border-dashed border-hairline p-6 text-center text-sm text-text-muted">
          No objects yet. Add a shape or a light to begin.
        </p>
      )}
    </div>
  );
}
