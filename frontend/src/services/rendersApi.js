import { apiFetch } from './api.js';

export function startRender({ sceneJson, sceneId }, token) {
  return apiFetch('/api/renders', { method: 'POST', body: { sceneJson, sceneId }, token });
}

export function cancelRender(jobId, token) {
  return apiFetch(`/api/renders/${jobId}/cancel`, { method: 'POST', token });
}

export function listRenders(token) {
  return apiFetch('/api/renders', { token });
}

export function deleteRender(id, token) {
  return apiFetch(`/api/renders/${id}`, { method: 'DELETE', token });
}
