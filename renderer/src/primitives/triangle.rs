//! Triangle primitive, solved via the Moller-Trumbore algorithm -- the standard
//! ray-triangle test that solves directly for the barycentric coordinates and
//! ray parameter without first computing the triangle's plane equation.
//! Meshes (`mesh.rs`) are built entirely out of these.

use crate::aabb::Aabb;
use crate::hittable::{HitRecord, Hittable};
use crate::ray::Ray;
use crate::vec3::{Point3, Vec3};

pub struct Triangle {
    pub v0: Point3,
    pub v1: Point3,
    pub v2: Point3,
}

impl Triangle {
    pub fn new(v0: Point3, v1: Point3, v2: Point3) -> Self {
        Triangle { v0, v1, v2 }
    }
}

impl Hittable for Triangle {
    fn hit(&self, ray: &Ray, t_min: f64, t_max: f64) -> Option<HitRecord> {
        const EPSILON: f64 = 1e-8;

        let edge1 = self.v1 - self.v0;
        let edge2 = self.v2 - self.v0;
        let h = ray.direction.cross(&edge2);
        let a = edge1.dot(&h);
        // Ray direction lies in the triangle's plane -- no well-defined hit.
        if a.abs() < EPSILON {
            return None;
        }

        let f = 1.0 / a;
        let s = ray.origin - self.v0;
        let u = f * s.dot(&h);
        if !(0.0..=1.0).contains(&u) {
            return None;
        }

        let q = s.cross(&edge1);
        let v = f * ray.direction.dot(&q);
        if v < 0.0 || u + v > 1.0 {
            return None;
        }

        let t = f * edge2.dot(&q);
        if t < t_min || t > t_max {
            return None;
        }

        let point = ray.at(t);
        // Flat-shaded geometric normal, oriented by the v0/v1/v2 winding order.
        let outward_normal = edge1.cross(&edge2).normalized();
        let (front_face, normal) = HitRecord::set_face_normal(ray, outward_normal);
        Some(HitRecord {
            point,
            normal,
            t,
            front_face,
        })
    }

    fn bounding_box(&self) -> Option<Aabb> {
        let min = Point3::new(
            self.v0.x.min(self.v1.x).min(self.v2.x),
            self.v0.y.min(self.v1.y).min(self.v2.y),
            self.v0.z.min(self.v1.z).min(self.v2.z),
        );
        let max = Point3::new(
            self.v0.x.max(self.v1.x).max(self.v2.x),
            self.v0.y.max(self.v1.y).max(self.v2.y),
            self.v0.z.max(self.v1.z).max(self.v2.z),
        );
        // Pad flat/degenerate axes for the same reason as `Plane`.
        let pad = 1e-4;
        let padding = Vec3::new(pad, pad, pad);
        Some(Aabb::new(min - padding, max + padding))
    }
}
