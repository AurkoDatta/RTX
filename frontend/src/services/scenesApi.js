import { apiFetch } from './api.js';

export function listScenes(token) {
  return apiFetch('/api/scenes', { token });
}

export function getScene(id, token) {
  return apiFetch(`/api/scenes/${id}`, { token });
}

export function createScene({ name, sceneJson }, token) {
  return apiFetch('/api/scenes', { method: 'POST', body: { name, sceneJson }, token });
}

export function updateScene(id, { name, sceneJson }, token) {
  return apiFetch(`/api/scenes/${id}`, { method: 'PUT', body: { name, sceneJson }, token });
}

export function deleteScene(id, token) {
  return apiFetch(`/api/scenes/${id}`, { method: 'DELETE', token });
}
