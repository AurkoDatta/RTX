//! Basic triangle mesh: an inline vertex array plus an index array (triples of
//! vertex indices), matching the scene-JSON representation this project uses --
//! there is no external mesh file format (OBJ, glTF, ...) support in scope.

use crate::aabb::Aabb;
use crate::hittable::{HitRecord, Hittable, HittableList};
use crate::primitives::triangle::Triangle;
use crate::ray::Ray;
use crate::vec3::Point3;

pub struct Mesh {
    triangles: HittableList,
}

impl Mesh {
    /// Builds a mesh from a flat vertex list and a list of vertex-index triples,
    /// one triple per triangle face.
    pub fn new(vertices: &[Point3], indices: &[[usize; 3]]) -> Self {
        let mut triangles = HittableList::new();
        for tri in indices {
            let v0 = vertices[tri[0]];
            let v1 = vertices[tri[1]];
            let v2 = vertices[tri[2]];
            triangles.add(Box::new(Triangle::new(v0, v1, v2)));
        }
        Mesh { triangles }
    }
}

impl Hittable for Mesh {
    fn hit(&self, ray: &Ray, t_min: f64, t_max: f64) -> Option<HitRecord> {
        // A mesh is just an unordered collection of triangles as far as
        // intersection is concerned; the BVH (phase d) is what makes this scale
        // to meshes with many faces rather than a linear scan.
        self.triangles.hit(ray, t_min, t_max)
    }

    fn bounding_box(&self) -> Option<Aabb> {
        self.triangles.bounding_box()
    }
}
