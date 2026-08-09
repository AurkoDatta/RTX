//! Common interface implemented by every intersectable primitive (sphere, plane,
//! triangle) plus the aggregate types (list, BVH) that contain them. Keeping
//! this trait small lets `tracer.rs` treat "a scene" and "a single sphere" the
//! same way when casting rays.

use crate::ray::Ray;
use crate::vec3::{Point3, Vec3};

/// Everything shading needs to know about a single ray-object intersection.
#[derive(Clone, Copy)]
pub struct HitRecord {
    pub point: Point3,
    pub normal: Vec3,
    pub t: f64,
    pub front_face: bool,
}

impl HitRecord {
    /// Orients a geometric outward normal so it always points against the
    /// incoming ray, and reports whether the hit was on the outward-facing side.
    /// Centralizing this here means every primitive gets consistent front/back
    /// handling (needed for dielectrics, which shade differently entering vs.
    /// exiting a surface) without re-deriving the convention per shape.
    pub fn set_face_normal(ray: &Ray, outward_normal: Vec3) -> (bool, Vec3) {
        let front_face = ray.direction.dot(&outward_normal) < 0.0;
        let normal = if front_face {
            outward_normal
        } else {
            -outward_normal
        };
        (front_face, normal)
    }
}

/// Anything a ray can be tested against: primitives, meshes, and spatial
/// containers alike. `Send + Sync` is required so scenes can be traced in
/// parallel across pixels with `rayon`.
pub trait Hittable: Send + Sync {
    /// Returns the closest intersection with parameter `t` in `[t_min, t_max]`,
    /// or `None` if the ray misses (or only hits outside that range).
    fn hit(&self, ray: &Ray, t_min: f64, t_max: f64) -> Option<HitRecord>;
}

/// An unordered collection of hittables, tested exhaustively in O(n) per ray --
/// the baseline used until the BVH (`bvh.rs`) provides spatial acceleration.
#[derive(Default)]
pub struct HittableList {
    pub objects: Vec<Box<dyn Hittable>>,
}

impl HittableList {
    pub fn new() -> Self {
        HittableList {
            objects: Vec::new(),
        }
    }

    pub fn add(&mut self, object: Box<dyn Hittable>) {
        self.objects.push(object);
    }
}

impl Hittable for HittableList {
    fn hit(&self, ray: &Ray, t_min: f64, t_max: f64) -> Option<HitRecord> {
        let mut closest_so_far = t_max;
        let mut result = None;

        for object in &self.objects {
            if let Some(rec) = object.hit(ray, t_min, closest_so_far) {
                closest_so_far = rec.t;
                result = Some(rec);
            }
        }

        result
    }
}
