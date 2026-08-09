use renderer::hittable::Hittable;
use renderer::material::Material;
use renderer::primitives::plane::Plane;
use renderer::ray::Ray;
use renderer::vec3::{Color, Point3, Vec3};

fn test_material() -> Material {
    Material::Lambertian {
        albedo: Color::new(0.5, 0.5, 0.5),
    }
}

fn sample_quad() -> Plane {
    // A 2x2 quad in the z=0 plane, spanning x in [-1,1], y in [-1,1].
    Plane::new(
        Point3::new(-1.0, -1.0, 0.0),
        Vec3::new(2.0, 0.0, 0.0),
        Vec3::new(0.0, 2.0, 0.0),
        test_material(),
    )
}

#[test]
fn ray_hits_quad_through_its_center() {
    let plane = sample_quad();
    let ray = Ray::new(Point3::new(0.0, 0.0, 5.0), Vec3::new(0.0, 0.0, -1.0));

    let hit = plane
        .hit(&ray, 0.0, f64::INFINITY)
        .expect("ray should hit the quad");
    assert!((hit.t - 5.0).abs() < 1e-9);
    assert!((hit.point - Point3::new(0.0, 0.0, 0.0)).length() < 1e-9);
}

#[test]
fn ray_misses_quad_outside_its_bounds() {
    let plane = sample_quad();
    // Crosses the infinite plane at (5, 5, 0), well outside the 2x2 quad.
    let ray = Ray::new(Point3::new(5.0, 5.0, 5.0), Vec3::new(0.0, 0.0, -1.0));

    assert!(plane.hit(&ray, 0.0, f64::INFINITY).is_none());
}

#[test]
fn ray_parallel_to_quad_never_hits() {
    let plane = sample_quad();
    let ray = Ray::new(Point3::new(0.0, 0.0, 1.0), Vec3::new(1.0, 0.0, 0.0));

    assert!(plane.hit(&ray, 0.0, f64::INFINITY).is_none());
}

#[test]
fn quad_bounding_box_contains_all_four_corners() {
    let plane = sample_quad();
    let bbox = plane
        .bounding_box()
        .expect("a finite quad must have a bounding box");
    assert!(bbox.min.x <= -1.0 && bbox.max.x >= 1.0);
    assert!(bbox.min.y <= -1.0 && bbox.max.y >= 1.0);
}

#[test]
fn normal_points_toward_incoming_ray() {
    let plane = sample_quad();
    let ray = Ray::new(Point3::new(0.0, 0.0, 5.0), Vec3::new(0.0, 0.0, -1.0));
    let hit = plane.hit(&ray, 0.0, f64::INFINITY).unwrap();
    // u x v = (2,0,0) x (0,2,0) = (0,0,4) -> geometric normal (0,0,1), which is
    // already front-facing for a ray travelling in -z.
    assert!((hit.normal - Vec3::new(0.0, 0.0, 1.0)).length() < 1e-9);
    assert!(hit.front_face);
}
