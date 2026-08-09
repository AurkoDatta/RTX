//! Axis-aligned bounding box: the coarse "does this ray even come near the
//! object" test used throughout the BVH to prune large swaths of geometry
//! without running exact intersection math against every primitive.

use crate::ray::Ray;
use crate::vec3::Point3;

#[derive(Debug, Clone, Copy)]
pub struct Aabb {
    pub min: Point3,
    pub max: Point3,
}

impl Aabb {
    pub fn new(min: Point3, max: Point3) -> Self {
        Aabb { min, max }
    }

    /// Slab method: intersect the ray against each axis-aligned pair of planes
    /// independently, then intersect the resulting per-axis `t` intervals. If
    /// the combined interval is non-empty within `[t_min, t_max]`, the ray
    /// touches the box. This only prunes BVH subtrees -- it never contributes to
    /// shading, so it doesn't need to report where the ray entered.
    pub fn hit(&self, ray: &Ray, t_min: f64, t_max: f64) -> bool {
        let mut t_min = t_min;
        let mut t_max = t_max;
        for axis in 0..3 {
            let inv_d = 1.0 / ray.direction[axis];
            let mut t0 = (self.min[axis] - ray.origin[axis]) * inv_d;
            let mut t1 = (self.max[axis] - ray.origin[axis]) * inv_d;
            // A negative inverse direction means the ray travels from the "max"
            // slab toward the "min" slab along this axis, so the near/far roots
            // are swapped relative to the ray's direction.
            if inv_d < 0.0 {
                std::mem::swap(&mut t0, &mut t1);
            }
            t_min = t_min.max(t0);
            t_max = t_max.min(t1);
            if t_max <= t_min {
                return false;
            }
        }
        true
    }

    /// The smallest box containing both `a` and `b` -- used to build parent
    /// bounding boxes bottom-up while constructing the BVH.
    pub fn surrounding(a: &Aabb, b: &Aabb) -> Aabb {
        let min = Point3::new(
            a.min.x.min(b.min.x),
            a.min.y.min(b.min.y),
            a.min.z.min(b.min.z),
        );
        let max = Point3::new(
            a.max.x.max(b.max.x),
            a.max.y.max(b.max.y),
            a.max.z.max(b.max.z),
        );
        Aabb::new(min, max)
    }
}
