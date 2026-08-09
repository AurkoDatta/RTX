use renderer::hittable::Hittable;
use renderer::material::Material;
use renderer::primitives::sphere::Sphere;
use renderer::ray::Ray;
use renderer::vec3::{Color, Point3, Vec3};

fn test_material() -> Material {
    Material::Lambertian {
        albedo: Color::new(0.5, 0.5, 0.5),
    }
}

#[test]
fn ray_hits_sphere_dead_center() {
    let sphere = Sphere::new(Point3::new(0.0, 0.0, -5.0), 1.0, test_material());
    let ray = Ray::new(Point3::new(0.0, 0.0, 0.0), Vec3::new(0.0, 0.0, -1.0));

    let hit = sphere
        .hit(&ray, 0.0, f64::INFINITY)
        .expect("ray through the center should hit the sphere");

    assert!((hit.t - 4.0).abs() < 1e-9);
    assert!((hit.point - Point3::new(0.0, 0.0, -4.0)).length() < 1e-9);
    assert!(hit.front_face);
}

#[test]
fn ray_misses_sphere_entirely() {
    let sphere = Sphere::new(Point3::new(0.0, 0.0, -5.0), 1.0, test_material());
    let ray = Ray::new(Point3::new(0.0, 5.0, 0.0), Vec3::new(0.0, 0.0, -1.0));

    assert!(sphere.hit(&ray, 0.0, f64::INFINITY).is_none());
}

#[test]
fn ray_tangent_to_sphere_counts_as_a_single_hit() {
    let sphere = Sphere::new(Point3::new(0.0, 0.0, -5.0), 1.0, test_material());
    let ray = Ray::new(Point3::new(0.0, 1.0, 0.0), Vec3::new(0.0, 0.0, -1.0));

    let hit = sphere.hit(&ray, 0.0, f64::INFINITY);
    assert!(hit.is_some());
    assert!((hit.unwrap().t - 5.0).abs() < 1e-9);
}

#[test]
fn ray_originating_inside_sphere_hits_far_side_with_inward_normal() {
    let sphere = Sphere::new(Point3::new(0.0, 0.0, 0.0), 2.0, test_material());
    let ray = Ray::new(Point3::new(0.0, 0.0, 0.0), Vec3::new(0.0, 0.0, -1.0));

    let hit = sphere
        .hit(&ray, 0.0, f64::INFINITY)
        .expect("ray should hit the far side from inside the sphere");

    assert!((hit.t - 2.0).abs() < 1e-9);
    assert!(!hit.front_face);
}

#[test]
fn hit_respects_t_min_and_t_max_bounds() {
    let sphere = Sphere::new(Point3::new(0.0, 0.0, -5.0), 1.0, test_material());
    let ray = Ray::new(Point3::new(0.0, 0.0, 0.0), Vec3::new(0.0, 0.0, -1.0));
    // (sphere/ray setup above; front face is at t=4, back face at t=6)
    assert!(sphere.hit(&ray, 0.0, 3.0).is_none());

    let hit = sphere
        .hit(&ray, 5.0, 10.0)
        .expect("excluding the front face should still find the back face");
    assert!((hit.t - 6.0).abs() < 1e-9);
}

#[test]
fn normal_is_unit_length_and_points_outward_on_front_face() {
    let sphere = Sphere::new(Point3::new(0.0, 0.0, -5.0), 1.0, test_material());
    let ray = Ray::new(Point3::new(0.0, 0.0, 0.0), Vec3::new(0.0, 0.0, -1.0));

    let hit = sphere.hit(&ray, 0.0, f64::INFINITY).unwrap();
    assert!((hit.normal.length() - 1.0).abs() < 1e-9);
    assert!((hit.normal - Vec3::new(0.0, 0.0, 1.0)).length() < 1e-9);
}
