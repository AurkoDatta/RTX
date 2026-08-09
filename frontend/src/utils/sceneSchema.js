/**
 * Client-side mirror of the backend's render caps (`validation/renderCaps.js`)
 * and scene JSON shape (matching the Rust renderer's `SceneFile`, see
 * renderer/src/scene.rs). Keeping these in sync lets the editor validate and
 * default values immediately, without waiting on a round-trip to the server
 * -- the backend still re-validates on save/render, since this is a UX
 * convenience, not the authoritative check.
 */
export const RENDER_CAPS = {
  minWidth: 64,
  maxWidth: 640,
  minHeight: 64,
  maxHeight: 480,
  minSamples: 1,
  maxSamples: 200,
  minBounceDepth: 1,
  maxBounceDepth: 8,
  maxObjects: 50,
};

export function defaultVec3(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

export function defaultMaterial(type = 'lambertian') {
  switch (type) {
    case 'lambertian':
      return { type, albedo: defaultVec3(0.7, 0.7, 0.7) };
    case 'metal':
      return { type, albedo: defaultVec3(0.8, 0.8, 0.8), fuzz: 0 };
    case 'dielectric':
      return { type, ior: 1.5 };
    case 'emissive':
      return { type, emission: defaultVec3(5, 5, 5) };
    default:
      return defaultMaterial('lambertian');
  }
}

export function defaultObject(type = 'sphere') {
  switch (type) {
    case 'sphere':
      return {
        type,
        center: defaultVec3(0, 0.5, -1),
        radius: 0.5,
        material: defaultMaterial('lambertian'),
      };
    case 'plane':
      return {
        type,
        corner: defaultVec3(-1, 0, -1),
        u: defaultVec3(2, 0, 0),
        v: defaultVec3(0, 0, 2),
        material: defaultMaterial('lambertian'),
      };
    case 'mesh':
      return {
        type,
        vertices: [defaultVec3(0, 0, -1), defaultVec3(1, 0, -1), defaultVec3(0, 1, -1)],
        indices: [[0, 1, 2]],
        material: defaultMaterial('lambertian'),
      };
    default:
      return defaultObject('sphere');
  }
}

/** A minimal but complete scene document, used both as the editor's initial state and reset target. */
export function blankScene() {
  return {
    scene: {
      camera: {
        position: defaultVec3(0, 1, 4),
        look_at: defaultVec3(0, 0.5, -1),
        up: defaultVec3(0, 1, 0),
        vfov: 45,
      },
      objects: [defaultObject('sphere')],
    },
    settings: { width: 320, height: 240, max_samples: 32, max_bounce_depth: 4 },
  };
}
