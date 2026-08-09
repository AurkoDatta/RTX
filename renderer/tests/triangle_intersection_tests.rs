use renderer::hittable::Hittable;
use renderer::primitives::triangle::Triangle;
use renderer::ray::Ray;
use renderer::vec3::{Point3, Vec3};

fn sample_triangle() -> Triangle {
    // A right triangle in the z=0 plane: (0,0,0), (2,0,0), (0,2,0).
    Triangle::new(
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(2.0, 0.0, 0.0),
        Point3::new(0.0, 2.0, 0.0),
    )
}

#[test]
fn ray_hits_triangle_interior() {
    let tri = sample_triangle();
    let ray = Ray::new(Point3::new(0.5, 0.5, 5.0), Vec3::new(0.0, 0.0, -1.0));

    let hit = tri
        .hit(&ray, 0.0, f64::INFINITY)
        .expect("ray should hit inside the triangle");
    assert!((hit.t - 5.0).abs() < 1e-9);
    assert!((hit.point - Point3::new(0.5, 0.5, 0.0)).length() < 1e-9);
}

#[test]
fn ray_misses_triangle_beyond_hypotenuse() {
    let tri = sample_triangle();
    // (1.5, 1.5) lies outside the hypotenuse (valid region requires x + y <= 2).
    let ray = Ray::new(Point3::new(1.5, 1.5, 5.0), Vec3::new(0.0, 0.0, -1.0));

    assert!(tri.hit(&ray, 0.0, f64::INFINITY).is_none());
}

#[test]
fn ray_misses_triangle_far_outside_its_plane_region() {
    let tri = sample_triangle();
    let ray = Ray::new(Point3::new(-5.0, -5.0, 5.0), Vec3::new(0.0, 0.0, -1.0));

    assert!(tri.hit(&ray, 0.0, f64::INFINITY).is_none());
}

#[test]
fn ray_parallel_to_triangle_plane_never_hits() {
    let tri = sample_triangle();
    let ray = Ray::new(Point3::new(0.5, 0.5, 1.0), Vec3::new(1.0, 0.0, 0.0));

    assert!(tri.hit(&ray, 0.0, f64::INFINITY).is_none());
}

#[test]
fn normal_follows_vertex_winding_order() {
    let tri = sample_triangle();
    let ray = Ray::new(Point3::new(0.5, 0.5, 5.0), Vec3::new(0.0, 0.0, -1.0));
    let hit = tri.hit(&ray, 0.0, f64::INFINITY).unwrap();
    // edge1 x edge2 = (2,0,0) x (0,2,0) = (0,0,4) -> outward normal (0,0,1).
    assert!((hit.normal - Vec3::new(0.0, 0.0, 1.0)).length() < 1e-9);
}

#[test]
fn bounding_box_contains_all_vertices() {
    let tri = sample_triangle();
    let bbox = tri.bounding_box().unwrap();
    assert!(bbox.min.x <= 0.0 && bbox.max.x >= 2.0);
    assert!(bbox.min.y <= 0.0 && bbox.max.y >= 2.0);
}
