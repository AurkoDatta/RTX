use rand::SeedableRng;
use rand_chacha::ChaCha8Rng;
use renderer::hittable::HitRecord;
use renderer::material::{schlick_reflectance, Material};
use renderer::ray::Ray;
use renderer::vec3::{Color, Point3, Vec3};

fn flat_hit_at_origin() -> HitRecord {
    HitRecord {
        point: Point3::new(0.0, 0.0, 0.0),
        normal: Vec3::new(0.0, 1.0, 0.0),
        t: 1.0,
        front_face: true,
        material: Material::Lambertian {
            albedo: Color::new(1.0, 1.0, 1.0),
        },
    }
}

#[test]
fn schlick_reflectance_is_zero_at_normal_incidence_for_matched_media() {
    // With no index-of-refraction difference, there's no interface to
    // reflect off, so reflectance at normal incidence should vanish.
    assert!(schlick_reflectance(1.0, 1.0).abs() < 1e-12);
}

#[test]
fn schlick_reflectance_approaches_full_reflection_at_grazing_angles() {
    // Fresnel reflectance rises toward 1.0 as the incidence angle approaches
    // grazing (cosine -> 0), regardless of the index-of-refraction ratio.
    let grazing = schlick_reflectance(0.01, 1.5);
    let normal_incidence = schlick_reflectance(1.0, 1.5);
    assert!(grazing > normal_incidence);
    assert!(grazing > 0.9);
}

#[test]
fn lambertian_scatter_stays_in_the_hemisphere_above_the_normal() {
    let material = Material::Lambertian {
        albedo: Color::new(0.8, 0.8, 0.8),
    };
    let hit = flat_hit_at_origin();
    let ray_in = Ray::new(Point3::new(0.0, 5.0, 0.0), Vec3::new(0.0, -1.0, 0.0));
    let mut rng = ChaCha8Rng::seed_from_u64(42);

    for _ in 0..200 {
        let scatter = material
            .scatter(&ray_in, &hit, &mut rng)
            .expect("Lambertian should always scatter");
        assert!(!scatter.specular);
        assert!(scatter.ray.direction.dot(&hit.normal) > 0.0);
        assert_eq!(scatter.attenuation, Color::new(0.8, 0.8, 0.8));
    }
}

#[test]
fn metal_with_zero_fuzz_reflects_exactly() {
    let material = Material::Metal {
        albedo: Color::new(1.0, 1.0, 1.0),
        fuzz: 0.0,
    };
    let hit = flat_hit_at_origin();
    // 45-degree incoming ray in the x-y plane should reflect to 45 degrees on
    // the other side of the normal (0,1,0): (1,-1,0) -> (1,1,0), normalized.
    let ray_in = Ray::new(
        Point3::new(-1.0, 1.0, 0.0),
        Vec3::new(1.0, -1.0, 0.0).normalized(),
    );
    let mut rng = ChaCha8Rng::seed_from_u64(1);

    let scatter = material.scatter(&ray_in, &hit, &mut rng).unwrap();
    assert!(scatter.specular);
    let expected = Vec3::new(1.0, 1.0, 0.0).normalized();
    assert!((scatter.ray.direction - expected).length() < 1e-9);
}

#[test]
fn dielectric_ray_head_on_never_totally_internally_reflects() {
    // A ray hitting exactly along the normal can never exceed the critical
    // angle (sin(theta) = 0), so it should refract (or Schlick-reflect with
    // low probability) but never hit the `cannot_refract` branch.
    let material = Material::Dielectric { ior: 1.5 };
    let hit = flat_hit_at_origin();
    let ray_in = Ray::new(Point3::new(0.0, 5.0, 0.0), Vec3::new(0.0, -1.0, 0.0));
    let mut rng = ChaCha8Rng::seed_from_u64(7);

    let scatter = material.scatter(&ray_in, &hit, &mut rng).unwrap();
    assert!(scatter.specular);
    assert_eq!(scatter.attenuation, Color::new(1.0, 1.0, 1.0));
    // Head-on, the outgoing ray should still point into the lower hemisphere
    // (either straight through on refraction, or straight back on reflection).
    assert!(scatter.ray.direction.y.abs() > 0.99);
}

#[test]
fn emissive_material_does_not_scatter_and_reports_its_emission() {
    let emission = Color::new(4.0, 4.0, 4.0);
    let material = Material::Emissive { emission };
    let hit = flat_hit_at_origin();
    let ray_in = Ray::new(Point3::new(0.0, 5.0, 0.0), Vec3::new(0.0, -1.0, 0.0));
    let mut rng = ChaCha8Rng::seed_from_u64(3);

    assert!(material.scatter(&ray_in, &hit, &mut rng).is_none());
    assert_eq!(material.emitted(), emission);
}

#[test]
fn non_emissive_materials_report_zero_emission() {
    let lambertian = Material::Lambertian {
        albedo: Color::new(0.5, 0.5, 0.5),
    };
    assert_eq!(lambertian.emitted(), Color::zero());
}
