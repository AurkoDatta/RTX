//! Bounding Volume Hierarchy: a binary tree over the scene's objects, built
//! once before rendering, that lets a ray skip whole subtrees of geometry it
//! provably can't hit instead of testing every primitive individually.
//!
//! Construction recursively partitions the object list in half along whichever
//! axis its bounding-box centroids are most spread out on, which tends to
//! produce well-separated, roughly-balanced subtrees without the cost of an
//! optimal (e.g. surface-area-heuristic) split. For the scene sizes this
//! renderer targets (dozens to low thousands of primitives), that's more than
//! sufficient: it turns an O(n) per-ray cost into roughly O(log n).

use crate::aabb::Aabb;
use crate::hittable::{HitRecord, Hittable, HittableList};
use crate::ray::Ray;
use crate::vec3::Point3;

pub struct BvhNode {
    left: Box<dyn Hittable>,
    right: Box<dyn Hittable>,
    bbox: Aabb,
}

impl BvhNode {
    /// Builds a BVH over `objects`, consuming the list. Returns a plain
    /// `HittableList` (which reports no bounding box) for the degenerate empty
    /// case rather than requiring every caller to special-case "no objects".
    pub fn build(objects: Vec<Box<dyn Hittable>>) -> Box<dyn Hittable> {
        if objects.is_empty() {
            return Box::new(HittableList::new());
        }
        Self::build_range(objects)
    }

    fn build_range(mut objects: Vec<Box<dyn Hittable>>) -> Box<dyn Hittable> {
        let len = objects.len();

        // Base cases: a single object is its own subtree; with exactly two,
        // build one leaf node directly instead of recursing further.
        if len == 1 {
            return objects.pop().unwrap();
        }
        if len == 2 {
            let right = objects.pop().unwrap();
            let left = objects.pop().unwrap();
            let bbox = Aabb::surrounding(
                &left.bounding_box().expect("BVH requires finite bounding boxes"),
                &right.bounding_box().expect("BVH requires finite bounding boxes"),
            );
            return Box::new(BvhNode { left, right, bbox });
        }

        // Split along the axis where the objects' bounding-box centroids are
        // most spread out -- this tends to separate spatially distinct clusters
        // better than always splitting on a fixed or random axis.
        let axis = Self::widest_extent_axis(&objects);
        objects.sort_by(|a, b| {
            let ca = Self::centroid(a.bounding_box().expect("BVH requires finite bounding boxes"));
            let cb = Self::centroid(b.bounding_box().expect("BVH requires finite bounding boxes"));
            ca[axis]
                .partial_cmp(&cb[axis])
                .expect("bounding box centroid coordinates must not be NaN")
        });

        let right_half = objects.split_off(len / 2);
        let left = Self::build_range(objects);
        let right = Self::build_range(right_half);
        let bbox = Aabb::surrounding(
            &left.bounding_box().expect("BVH requires finite bounding boxes"),
            &right.bounding_box().expect("BVH requires finite bounding boxes"),
        );

        Box::new(BvhNode { left, right, bbox })
    }

    fn centroid(bbox: Aabb) -> Point3 {
        (bbox.min + bbox.max) * 0.5
    }

    /// Picks the axis (0=x, 1=y, 2=z) along which the objects' centroids span
    /// the largest range, so the split divides them as evenly as possible in
    /// the dimension where they're most separated.
    fn widest_extent_axis(objects: &[Box<dyn Hittable>]) -> usize {
        let mut min = Point3::new(f64::INFINITY, f64::INFINITY, f64::INFINITY);
        let mut max = Point3::new(f64::NEG_INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY);
        for obj in objects {
            let c = Self::centroid(
                obj.bounding_box()
                    .expect("BVH requires finite bounding boxes"),
            );
            min = Point3::new(min.x.min(c.x), min.y.min(c.y), min.z.min(c.z));
            max = Point3::new(max.x.max(c.x), max.y.max(c.y), max.z.max(c.z));
        }
        let extent = max - min;
        if extent.x > extent.y && extent.x > extent.z {
            0
        } else if extent.y > extent.z {
            1
        } else {
            2
        }
    }
}

impl Hittable for BvhNode {
    fn hit(&self, ray: &Ray, t_min: f64, t_max: f64) -> Option<HitRecord> {
        // The whole point of the tree: if the ray misses this node's bounding
        // box, it necessarily misses everything underneath it, so prune here.
        if !self.bbox.hit(ray, t_min, t_max) {
            return None;
        }

        let left_hit = self.left.hit(ray, t_min, t_max);
        // Narrow the right subtree's search to anything closer than what the
        // left subtree already found, so the nearer of the two wins without an
        // extra comparison pass.
        let right_t_max = left_hit.as_ref().map_or(t_max, |rec| rec.t);
        let right_hit = self.right.hit(ray, t_min, right_t_max);

        right_hit.or(left_hit)
    }

    fn bounding_box(&self) -> Option<Aabb> {
        Some(self.bbox)
    }
}
