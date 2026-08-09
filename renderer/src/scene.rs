//! Scene description: camera, objects, and their materials, deserialized
//! directly from the JSON blob the backend sends over stdin (see `ipc.rs` for
//! the surrounding protocol). Keeping this as plain data structs -- separate
//! from the `Hittable` geometry types -- means malformed scene JSON fails
//! fast as a deserialization error before any BVH gets built.
//!
//! There is no separate "lights" section: any object whose material is
//! `Emissive` acts as a light. The scene editor is expected to offer "point
//! light" and "area light" as UI shortcuts that generate, respectively, a
//! small emissive sphere or an emissive plane -- both are ordinary objects as
//! far as this schema and the renderer are concerned. Only emissive *planes*
//! participate in next-event estimation (see `tracer::sample_direct_lighting`);
//! an emissive sphere or mesh still emits light via direct and indirect ray
//! hits, just without the variance-reduction NEE provides.

use crate::bvh::BvhNode;
use crate::camera::Camera;
use crate::hittable::Hittable;
use crate::material::Material;
use crate::primitives::mesh::Mesh;
use crate::primitives::plane::Plane;
use crate::primitives::sphere::Sphere;
use crate::vec3::{Point3, Vec3};
use serde::Deserialize;

/// The full input document the renderer reads from stdin (or `--input`): the
/// scene geometry plus the render job's resolution/quality settings.
#[derive(Debug, Deserialize)]
pub struct SceneFile {
    pub scene: Scene,
    pub settings: RenderSettings,
}

/// Render job parameters. Bounds/sanity-checking these against the project's
/// resolution/sample/bounce caps is the backend's responsibility (it spawns
/// this process only after validating a request); the renderer itself trusts
/// its input.
#[derive(Debug, Deserialize)]
pub struct RenderSettings {
    pub width: u32,
    pub height: u32,
    pub max_samples: u32,
    pub max_bounce_depth: u32,
}

#[derive(Debug, Deserialize)]
pub struct Scene {
    pub camera: CameraSpec,
    pub objects: Vec<ObjectSpec>,
}

#[derive(Debug, Deserialize)]
pub struct CameraSpec {
    pub position: Point3,
    pub look_at: Point3,
    #[serde(default = "default_up")]
    pub up: Vec3,
    pub vfov: f64,
}

fn default_up() -> Vec3 {
    Vec3::new(0.0, 1.0, 0.0)
}

/// One scene object. Tagged by a `"type"` key (`"sphere"`, `"plane"`,
/// `"mesh"`) matching each variant's snake_case name, mirroring the primitive
/// kinds implemented in `primitives/`.
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ObjectSpec {
    Sphere {
        center: Point3,
        radius: f64,
        material: Material,
    },
    Plane {
        corner: Point3,
        u: Vec3,
        v: Vec3,
        material: Material,
    },
    Mesh {
        vertices: Vec<Point3>,
        indices: Vec<[usize; 3]>,
        material: Material,
    },
}

/// A scene, converted into the concrete geometry and acceleration structure
/// the tracer operates on.
pub struct BuiltScene {
    pub camera: Camera,
    pub world: Box<dyn Hittable>,
    /// Emissive planes, collected separately so `tracer::ray_color` can run
    /// next-event estimation against them without walking the whole BVH.
    pub lights: Vec<Plane>,
}

impl Scene {
    /// Builds the camera, primitive list, and light list described by this
    /// scene, then wraps the primitives in a BVH for accelerated traversal.
    /// `aspect_ratio` comes from the render settings (width / height) rather
    /// than being part of the scene JSON itself, since it's derived, not
    /// independently authored.
    pub fn build(&self, aspect_ratio: f64) -> BuiltScene {
        let camera = Camera::new(
            self.camera.position,
            self.camera.look_at,
            self.camera.up,
            self.camera.vfov,
            aspect_ratio,
        );

        let mut objects: Vec<Box<dyn Hittable>> = Vec::with_capacity(self.objects.len());
        let mut lights: Vec<Plane> = Vec::new();

        for spec in &self.objects {
            match spec {
                ObjectSpec::Sphere {
                    center,
                    radius,
                    material,
                } => {
                    objects.push(Box::new(Sphere::new(*center, *radius, *material)));
                }
                ObjectSpec::Plane {
                    corner,
                    u,
                    v,
                    material,
                } => {
                    let plane = Plane::new(*corner, *u, *v, *material);
                    if matches!(material, Material::Emissive { .. }) {
                        lights.push(plane);
                    }
                    objects.push(Box::new(plane));
                }
                ObjectSpec::Mesh {
                    vertices,
                    indices,
                    material,
                } => {
                    objects.push(Box::new(Mesh::new(vertices, indices, *material)));
                }
            }
        }

        let world = BvhNode::build(objects);
        BuiltScene {
            camera,
            world,
            lights,
        }
    }
}
