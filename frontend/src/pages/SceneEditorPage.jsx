/**
 * Scene editor page: owns the actual data (current scene document, the
 * user's saved scenes, save/load orchestration) and hands presentation off
 * to `SceneEditorForm`.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SceneEditorForm } from '../components/scene-editor/SceneEditorForm.jsx';
import { Button } from '../components/common/Button.jsx';
import { Select } from '../components/common/Select.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { ApiError } from '../services/api.js';
import { createScene, getScene, listScenes, updateScene } from '../services/scenesApi.js';
import { startRender } from '../services/rendersApi.js';
import { blankScene } from '../utils/sceneSchema.js';

export function SceneEditorPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('Untitled scene');
  const [sceneDoc, setSceneDoc] = useState(blankScene);
  const [savedScenes, setSavedScenes] = useState([]);
  const [selectedSceneId, setSelectedSceneId] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listScenes(token)
      .then((data) => setSavedScenes(data.scenes))
      .catch(() => {
        // Non-fatal: the editor still works for building/saving a first scene.
      });
  }, [token]);

  function handleLoadPreset(preset) {
    setName(preset.name);
    setSceneDoc(preset.sceneJson);
    setSelectedSceneId('');
    setStatus('');
    setError('');
  }

  async function handleLoadSavedScene(id) {
    setSelectedSceneId(id);
    setStatus('');
    setError('');
    if (!id) {
      setName('Untitled scene');
      setSceneDoc(blankScene());
      return;
    }
    try {
      const { scene } = await getScene(id, token);
      setName(scene.name);
      setSceneDoc(scene.sceneJson);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load that scene.');
    }
  }

  async function handleSave() {
    setError('');
    setStatus('saving');
    try {
      if (selectedSceneId) {
        await updateScene(selectedSceneId, { name, sceneJson: sceneDoc }, token);
      } else {
        const { scene } = await createScene({ name, sceneJson: sceneDoc }, token);
        setSelectedSceneId(String(scene.id));
      }
      const { scenes } = await listScenes(token);
      setSavedScenes(scenes);
      setStatus('saved');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this scene.');
      setStatus('');
    }
  }

  async function handleRender() {
    setError('');
    setStatus('starting-render');
    try {
      const sceneId = selectedSceneId ? Number(selectedSceneId) : undefined;
      const { jobId } = await startRender({ sceneJson: sceneDoc, sceneId }, token);
      navigate(`/render/${jobId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the render.');
      setStatus('');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Scene editor</h1>
        <div className="flex items-center gap-3">
          {savedScenes.length > 0 && (
            <Select
              value={selectedSceneId}
              onChange={handleLoadSavedScene}
              options={[
                { value: '', label: 'New scene' },
                ...savedScenes.map((s) => ({ value: String(s.id), label: s.name })),
              ]}
            />
          )}
          <Button variant="secondary" onClick={handleSave} disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Save scene'}
          </Button>
          <Button
            variant="primary"
            onClick={handleRender}
            disabled={status === 'starting-render'}
          >
            {status === 'starting-render' ? 'Starting…' : 'Render'}
          </Button>
        </div>
      </div>

      {status === 'saved' && <p className="mb-4 text-sm text-success">Scene saved.</p>}
      {error && <p className="mb-4 text-sm text-error">{error}</p>}

      <SceneEditorForm
        name={name}
        onNameChange={setName}
        sceneDoc={sceneDoc}
        onSceneChange={setSceneDoc}
        onLoadPreset={handleLoadPreset}
      />
    </div>
  );
}
