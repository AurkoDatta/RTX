//! Sphere primitive: the simplest closed surface, solved analytically via the
//! quadratic form of the ray-sphere intersection equation.

use crate::hittable::{HitRecord, Hittable};
use crate::ray::Ray;
use crate::vec3::Point3;

pub struct Sphere {
    pub center: Point3,
    pub radius: f64,
}

impl Sphere {
    pub fn new(center: Point3, radius: f64) -> Self {
        Sphere { center, radius }
    }
}

impl Hittable for Sphere {
    fn hit(&self, ray: &Ray, t_min: f64, t_max: f64) -> Option<HitRecord> {
        // Substituting the ray equation P(t) = origin + t*direction into the
        // implicit sphere equation |P - center|^2 = r^2 gives a quadratic in t:
        // a*t^2 + b*t + c = 0. Using b = 2*half_b lets the /2 and *2 factors
        // cancel algebraically, which is why `half_b` appears directly below
        // instead of the textbook a/b/c form.
        let oc = ray.origin - self.center;
        let a = ray.direction.length_squared();
        let half_b = oc.dot(&ray.direction);
        let c = oc.length_squared() - self.radius * self.radius;
        let discriminant = half_b * half_b - a * c;
        if discriminant < 0.0 {
            return None;
        }
        let sqrt_d = discriminant.sqrt();

        // Prefer the nearer intersection, falling back to the farther one if the
        // nearer root falls outside the valid range (e.g. it's behind the ray
        // origin, or the origin is inside the sphere).
        let mut root = (-half_b - sqrt_d) / a;
        if root < t_min || root > t_max {
            root = (-half_b + sqrt_d) / a;
            if root < t_min || root > t_max {
                return None;
            }
        }

        let point = ray.at(root);
        let outward_normal = (point - self.center) / self.radius;
        let (front_face, normal) = HitRecord::set_face_normal(ray, outward_normal);
        Some(HitRecord {
            point,
            normal,
            t: root,
            front_face,
        })
    }
}
