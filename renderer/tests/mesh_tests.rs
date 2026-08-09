use renderer::hittable::Hittable;
use renderer::material::Material;
use renderer::primitives::mesh::Mesh;
use renderer::ray::Ray;
use renderer::vec3::{Color, Point3, Vec3};

fn test_material() -> Material {
    Material::Lambertian {
        albedo: Color::new(0.5, 0.5, 0.5),
    }
}

fn sample_mesh() -> Mesh {
    // Two triangles forming a 2x2 square in the z=0 plane, split along the
    // diagonal from (0,0) to (2,2).
    let vertices = vec![
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(2.0, 0.0, 0.0),
        Point3::new(2.0, 2.0, 0.0),
        Point3::new(0.0, 2.0, 0.0),
    ];
    let indices = vec![[0, 1, 2], [0, 2, 3]];
    Mesh::new(&vertices, &indices, test_material())
}

#[test]
fn mesh_hits_correct_triangle_among_several() {
    let mesh = sample_mesh();
    // (1.5, 0.5) lies in the lower-right triangle (0,0)-(2,0)-(2,2).
    let ray = Ray::new(Point3::new(1.5, 0.5, 5.0), Vec3::new(0.0, 0.0, -1.0));

    let hit = mesh
        .hit(&ray, 0.0, f64::INFINITY)
        .expect("ray should hit one of the two triangles");
    assert!((hit.point - Point3::new(1.5, 0.5, 0.0)).length() < 1e-9);
}

#[test]
fn mesh_hits_second_triangle_on_other_side_of_diagonal() {
    let mesh = sample_mesh();
    // (0.5, 1.5) lies in the upper-left triangle (0,0)-(2,2)-(0,2).
    let ray = Ray::new(Point3::new(0.5, 1.5, 5.0), Vec3::new(0.0, 0.0, -1.0));

    let hit = mesh
        .hit(&ray, 0.0, f64::INFINITY)
        .expect("ray should hit the second triangle");
    assert!((hit.point - Point3::new(0.5, 1.5, 0.0)).length() < 1e-9);
}

#[test]
fn mesh_misses_when_ray_passes_outside_all_triangles() {
    let mesh = sample_mesh();
    let ray = Ray::new(Point3::new(10.0, 10.0, 5.0), Vec3::new(0.0, 0.0, -1.0));

    assert!(mesh.hit(&ray, 0.0, f64::INFINITY).is_none());
}

#[test]
fn mesh_bounding_box_covers_all_vertices() {
    let mesh = sample_mesh();
    let bbox = mesh
        .bounding_box()
        .expect("mesh with triangles must have a bounding box");
    assert!(bbox.min.x <= 0.0 && bbox.max.x >= 2.0);
    assert!(bbox.min.y <= 0.0 && bbox.max.y >= 2.0);
}
