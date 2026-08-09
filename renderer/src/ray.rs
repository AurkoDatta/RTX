//! A ray is a straight-line path in space -- an origin plus a direction -- used
//! to sample the scene from the camera and to trace secondary bounces during
//! shading.

use crate::vec3::{Point3, Vec3};

#[derive(Debug, Clone, Copy)]
pub struct Ray {
    pub origin: Point3,
    pub direction: Vec3,
}

impl Ray {
    pub fn new(origin: Point3, direction: Vec3) -> Self {
        Ray { origin, direction }
    }

    /// The point reached by travelling `t` units along the ray's direction from
    /// its origin: `origin + t * direction`.
    pub fn at(&self, t: f64) -> Point3 {
        self.origin + self.direction * t
    }
}
