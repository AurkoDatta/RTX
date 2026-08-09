/**
 * Zod schemas for request validation. Centralizing them here (rather than
 * inline in each controller) keeps the accepted shape of every request body
 * -- and the render-job sanity caps in particular -- auditable in one place.
 */
import { z } from 'zod';
import { RENDER_CAPS } from './renderCaps.js';

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
});

// --- Scene JSON: matches the shape the Rust renderer's `SceneFile` expects
// (see renderer/src/scene.rs). Validation here is deliberately shallow --
// enough to catch shape errors and enforce the resource-abuse caps before a
// renderer process is ever spawned -- and leaves deep geometric/material
// correctness to the renderer's own serde deserialization, which reports a
// SCENE_PARSE_ERROR IPC message for anything this layer lets through.

const vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const materialSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('lambertian'), albedo: vec3Schema }),
  z.object({ type: z.literal('metal'), albedo: vec3Schema, fuzz: z.number().min(0) }),
  z.object({ type: z.literal('dielectric'), ior: z.number().positive() }),
  z.object({ type: z.literal('emissive'), emission: vec3Schema }),
]);

const objectSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('sphere'),
    center: vec3Schema,
    radius: z.number().positive(),
    material: materialSchema,
  }),
  z.object({
    type: z.literal('plane'),
    corner: vec3Schema,
    u: vec3Schema,
    v: vec3Schema,
    material: materialSchema,
  }),
  z.object({
    type: z.literal('mesh'),
    vertices: z.array(vec3Schema).min(3),
    indices: z.array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative(), z.number().int().nonnegative()])),
    material: materialSchema,
  }),
]);

const cameraSchema = z.object({
  position: vec3Schema,
  look_at: vec3Schema,
  up: vec3Schema.optional(),
  vfov: z.number().positive().max(179),
});

export const sceneJsonSchema = z.object({
  scene: z.object({
    camera: cameraSchema,
    objects: z.array(objectSchema).min(1).max(RENDER_CAPS.maxObjects),
  }),
  settings: z.object({
    width: z.number().int().min(RENDER_CAPS.minWidth).max(RENDER_CAPS.maxWidth),
    height: z.number().int().min(RENDER_CAPS.minHeight).max(RENDER_CAPS.maxHeight),
    max_samples: z.number().int().min(RENDER_CAPS.minSamples).max(RENDER_CAPS.maxSamples),
    max_bounce_depth: z
      .number()
      .int()
      .min(RENDER_CAPS.minBounceDepth)
      .max(RENDER_CAPS.maxBounceDepth),
  }),
});

export const saveSceneSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sceneJson: sceneJsonSchema,
});
