import { describe, expect, it } from 'vitest';
import {
  blankScene,
  defaultMaterial,
  defaultObject,
  defaultVec3,
  RENDER_CAPS,
} from '../src/utils/sceneSchema.js';

describe('defaultVec3', () => {
  it('defaults to the origin when no arguments are given', () => {
    expect(defaultVec3()).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('accepts explicit components', () => {
    expect(defaultVec3(1, 2, 3)).toEqual({ x: 1, y: 2, z: 3 });
  });
});

describe('defaultMaterial', () => {
  it('produces a lambertian material with an albedo by default', () => {
    const material = defaultMaterial();
    expect(material.type).toBe('lambertian');
    expect(material.albedo).toBeDefined();
  });

  it('produces a metal material with albedo and fuzz', () => {
    const material = defaultMaterial('metal');
    expect(material).toMatchObject({ type: 'metal', fuzz: 0 });
    expect(material.albedo).toBeDefined();
  });

  it('produces a dielectric material with an index of refraction', () => {
    const material = defaultMaterial('dielectric');
    expect(material.type).toBe('dielectric');
    expect(material.ior).toBeGreaterThan(1);
  });

  it('produces an emissive material with an emission color', () => {
    const material = defaultMaterial('emissive');
    expect(material.type).toBe('emissive');
    expect(material.emission).toBeDefined();
  });
});

describe('defaultObject', () => {
  it('produces a sphere with a center, radius, and material', () => {
    const obj = defaultObject('sphere');
    expect(obj.type).toBe('sphere');
    expect(obj.center).toBeDefined();
    expect(obj.radius).toBeGreaterThan(0);
    expect(obj.material.type).toBe('lambertian');
  });

  it('produces a plane with corner and edge vectors', () => {
    const obj = defaultObject('plane');
    expect(obj.type).toBe('plane');
    expect(obj.corner).toBeDefined();
    expect(obj.u).toBeDefined();
    expect(obj.v).toBeDefined();
  });

  it('produces a mesh with three vertices forming one triangle', () => {
    const obj = defaultObject('mesh');
    expect(obj.type).toBe('mesh');
    expect(obj.vertices).toHaveLength(3);
    expect(obj.indices).toEqual([[0, 1, 2]]);
  });
});

describe('blankScene', () => {
  it('produces a complete, renderer-shaped scene document', () => {
    const doc = blankScene();
    expect(doc.scene.camera.vfov).toBeGreaterThan(0);
    expect(doc.scene.objects.length).toBeGreaterThan(0);
    expect(doc.settings.width).toBeGreaterThanOrEqual(RENDER_CAPS.minWidth);
    expect(doc.settings.width).toBeLessThanOrEqual(RENDER_CAPS.maxWidth);
    expect(doc.settings.max_samples).toBeLessThanOrEqual(RENDER_CAPS.maxSamples);
    expect(doc.settings.max_bounce_depth).toBeLessThanOrEqual(RENDER_CAPS.maxBounceDepth);
  });
});
