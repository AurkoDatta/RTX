import {
  createScene,
  deleteScene,
  getScene,
  listScenes,
  updateScene,
} from '../services/sceneService.js';
import { parseIdParam } from '../utils/parseIdParam.js';

export async function create(req, res) {
  const scene = await createScene(req.user.id, req.body);
  res.status(201).json({ scene });
}

export async function list(req, res) {
  const scenes = await listScenes(req.user.id);
  res.json({ scenes });
}

export async function getOne(req, res) {
  const id = parseIdParam(req.params.id);
  const scene = await getScene(req.user.id, id);
  res.json({ scene });
}

export async function update(req, res) {
  const id = parseIdParam(req.params.id);
  const scene = await updateScene(req.user.id, id, req.body);
  res.json({ scene });
}

export async function remove(req, res) {
  const id = parseIdParam(req.params.id);
  await deleteScene(req.user.id, id);
  res.status(204).send();
}
