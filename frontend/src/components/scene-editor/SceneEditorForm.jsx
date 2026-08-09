import { RENDER_CAPS } from '../../utils/sceneSchema.js';
import { Input } from '../common/Input.jsx';
import { CameraEditor } from './CameraEditor.jsx';
import { ObjectListEditor } from './ObjectListEditor.jsx';
import { PresetSelector } from './PresetSelector.jsx';

/** Presentational composition of the whole scene document: name, camera, objects, and render settings. */
export function SceneEditorForm({ name, onNameChange, sceneDoc, onSceneChange, onLoadPreset }) {
  function updateScene(field, value) {
    onSceneChange({ ...sceneDoc, scene: { ...sceneDoc.scene, [field]: value } });
  }

  function updateSettings(field, value) {
    onSceneChange({ ...sceneDoc, settings: { ...sceneDoc.settings, [field]: value } });
  }

  return (
    <div className="space-y-6">
      <Input label="Scene name" value={name} onChange={onNameChange} />

      <PresetSelector onSelect={onLoadPreset} />

      <CameraEditor camera={sceneDoc.scene.camera} onChange={(c) => updateScene('camera', c)} />

      <ObjectListEditor
        objects={sceneDoc.scene.objects}
        onChange={(objs) => updateScene('objects', objs)}
        maxObjects={RENDER_CAPS.maxObjects}
      />

      <fieldset className="grid grid-cols-2 gap-3 rounded border border-hairline p-4 sm:grid-cols-4">
        <legend className="px-1 font-display text-sm font-semibold">Render settings</legend>
        <Input
          label="Width"
          type="number"
          min={RENDER_CAPS.minWidth}
          max={RENDER_CAPS.maxWidth}
          value={sceneDoc.settings.width}
          onChange={(v) => updateSettings('width', v)}
        />
        <Input
          label="Height"
          type="number"
          min={RENDER_CAPS.minHeight}
          max={RENDER_CAPS.maxHeight}
          value={sceneDoc.settings.height}
          onChange={(v) => updateSettings('height', v)}
        />
        <Input
          label="Max samples"
          type="number"
          min={RENDER_CAPS.minSamples}
          max={RENDER_CAPS.maxSamples}
          value={sceneDoc.settings.max_samples}
          onChange={(v) => updateSettings('max_samples', v)}
        />
        <Input
          label="Max bounces"
          type="number"
          min={RENDER_CAPS.minBounceDepth}
          max={RENDER_CAPS.maxBounceDepth}
          value={sceneDoc.settings.max_bounce_depth}
          onChange={(v) => updateSettings('max_bounce_depth', v)}
        />
      </fieldset>
    </div>
  );
}
