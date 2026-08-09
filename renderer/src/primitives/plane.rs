//! Finite planar quadrilateral -- a point plus two edge vectors spanning a
//! parallelogram. This is what Cornell-box-style walls, floors, ceilings, and
//! area lights are built from. A true infinite plane has no bounding box and
//! can't usefully participate in a BVH, so scene "planes" are represented in
//! this bounded form instead.

use crate::aabb::Aabb;
use crate::hittable::{HitRecord, Hittable};
use crate::ray::Ray;
use crate::vec3::{Point3, Vec3};

pub struct Plane {
    corner: Point3,
    u: Vec3,
    v: Vec3,
    normal: Vec3,
    /// Plane equation constant: a point `p` lies on the plane iff `normal.dot(p) == d`.
    d: f64,
    /// Precomputed `(u x v) / |u x v|^2`, used to project a hit point into the
    /// quad's (alpha, beta) parametric basis without re-deriving it per ray.
    w: Vec3,
}

impl Plane {
    pub fn new(corner: Point3, u: Vec3, v: Vec3) -> Self {
        let n = u.cross(&v);
        let normal = n.normalized();
        let d = normal.dot(&corner);
        let w = n / n.dot(&n);
        Plane {
            corner,
            u,
            v,
            normal,
            d,
            w,
        }
    }
}

impl Hittable for Plane {
    fn hit(&self, ray: &Ray, t_min: f64, t_max: f64) -> Option<HitRecord> {
        let denom = self.normal.dot(&ray.direction);
        // Ray runs parallel to the plane (or is degenerate) -- it can never cross it.
        if denom.abs() < 1e-8 {
            return None;
        }

        let t = (self.d - self.normal.dot(&ray.origin)) / denom;
        if t < t_min || t > t_max {
            return None;
        }

        let point = ray.at(t);
        let hit_vec = point - self.corner;
        // Project the hit point onto the quad's (u, v) basis; it lies inside the
        // parallelogram iff both parametric coordinates fall in [0, 1].
        let alpha = self.w.dot(&hit_vec.cross(&self.v));
        let beta = self.w.dot(&self.u.cross(&hit_vec));
        if !(0.0..=1.0).contains(&alpha) || !(0.0..=1.0).contains(&beta) {
            return None;
        }

        let (front_face, normal) = HitRecord::set_face_normal(ray, self.normal);
        Some(HitRecord {
            point,
            normal,
            t,
            front_face,
        })
    }

    fn bounding_box(&self) -> Option<Aabb> {
        let corners = [
            self.corner,
            self.corner + self.u,
            self.corner + self.v,
            self.corner + self.u + self.v,
        ];
        let mut min = corners[0];
        let mut max = corners[0];
        for c in &corners[1..] {
            min = Point3::new(min.x.min(c.x), min.y.min(c.y), min.z.min(c.z));
            max = Point3::new(max.x.max(c.x), max.y.max(c.y), max.z.max(c.z));
        }
        // Pad slightly along any axis the quad is flat against -- a zero-width
        // AABB can produce false negatives in the BVH's slab test.
        let pad = 1e-4;
        let padding = Vec3::new(pad, pad, pad);
        Some(Aabb::new(min - padding, max + padding))
    }
}
