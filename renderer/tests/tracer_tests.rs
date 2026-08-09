use rand::SeedableRng;
use rand_chacha::ChaCha8Rng;
use renderer::hittable::HittableList;
use renderer::material::Material;
use renderer::primitives::plane::Plane;
use renderer::primitives::sphere::Sphere;
use renderer::ray::Ray;
use renderer::tracer::{finalize_pixel, linear_to_gamma, ray_color, reinhard_tone_map};
use renderer::vec3::{Color, Point3, Vec3};

#[test]
fn linear_to_gamma_maps_endpoints_and_a_known_midpoint() {
    assert_eq!(linear_to_gamma(0.0), 0.0);
    assert!((linear_to_gamma(1.0) - 1.0).abs() < 1e-12);
    // Gamma-2.0 correction is a square root: sqrt(0.25) = 0.5.
    assert!((linear_to_gamma(0.25) - 0.5).abs() < 1e-12);
    // Negative input (shouldn't occur, but must not panic/NaN) clamps to zero.
    assert_eq!(linear_to_gamma(-1.0), 0.0);
}

#[test]
fn reinhard_tone_map_compresses_toward_but_never_reaches_one() {
    let mapped = reinhard_tone_map(Color::new(1.0, 3.0, 0.0));
    assert!((mapped.x - 0.5).abs() < 1e-12); // 1/(1+1)
    assert!((mapped.y - 0.75).abs() < 1e-12); // 3/(1+3)
    assert_eq!(mapped.z, 0.0);

    let very_bright = reinhard_tone_map(Color::new(1e6, 1e6, 1e6));
    assert!(very_bright.x < 1.0 && very_bright.x > 0.999);
}

#[test]
fn finalize_pixel_composes_tone_mapping_then_gamma() {
    // A linear radiance of 1.0 tone-maps to 0.5, which gamma-corrects to
    // sqrt(0.5).
    let result = finalize_pixel(Color::new(1.0, 1.0, 1.0));
    let expected = 0.5f64.sqrt();
    assert!((result.x - expected).abs() < 1e-9);
}

#[test]
fn ray_that_hits_nothing_contributes_no_radiance() {
    let world = HittableList::new();
    let lights: Vec<Plane> = Vec::new();
    let ray = Ray::new(Point3::new(0.0, 0.0, 0.0), Vec3::new(0.0, 0.0, -1.0));
    let mut rng = ChaCha8Rng::seed_from_u64(0);

    let color = ray_color(&ray, &world, &lights, 8, &mut rng);
    assert_eq!(color, Color::zero());
}

#[test]
fn zero_depth_terminates_immediately_with_no_radiance() {
    let mut world = HittableList::new();
    world.add(Box::new(Sphere::new(
        Point3::new(0.0, 0.0, -5.0),
        1.0,
        Material::Emissive {
            emission: Color::new(10.0, 10.0, 10.0),
        },
    )));
    let lights: Vec<Plane> = Vec::new();
    let ray = Ray::new(Point3::new(0.0, 0.0, 0.0), Vec3::new(0.0, 0.0, -1.0));
    let mut rng = ChaCha8Rng::seed_from_u64(0);

    // Even though the ray points directly at an emissive sphere, depth=0
    // must short-circuit before any intersection test.
    let color = ray_color(&ray, &world, &lights, 0, &mut rng);
    assert_eq!(color, Color::zero());
}

#[test]
fn ray_directly_hitting_an_emissive_sphere_returns_its_emission() {
    let emission = Color::new(4.0, 2.0, 1.0);
    let mut world = HittableList::new();
    world.add(Box::new(Sphere::new(
        Point3::new(0.0, 0.0, -5.0),
        1.0,
        Material::Emissive { emission },
    )));
    let lights: Vec<Plane> = Vec::new();
    let ray = Ray::new(Point3::new(0.0, 0.0, 0.0), Vec3::new(0.0, 0.0, -1.0));
    let mut rng = ChaCha8Rng::seed_from_u64(0);

    // A direct hit on a purely emissive material is fully deterministic: no
    // scattering occurs, so RNG choices can't affect the result.
    let color = ray_color(&ray, &world, &lights, 8, &mut rng);
    assert_eq!(color, emission);
}

#[test]
fn diffuse_surface_lit_by_area_light_receives_positive_direct_illumination() {
    // A Lambertian floor directly beneath a ceiling area light: next-event
    // estimation should contribute strictly positive direct lighting on
    // average, since the light is unoccluded and faces the floor.
    let mut world = HittableList::new();
    world.add(Box::new(Sphere::new(
        Point3::new(0.0, -1000.0, -5.0),
        1000.0,
        Material::Lambertian {
            albedo: Color::new(0.7, 0.7, 0.7),
        },
    )));
    let light = Plane::new(
        Point3::new(-1.0, 5.0, -6.0),
        Vec3::new(2.0, 0.0, 0.0),
        Vec3::new(0.0, 0.0, 2.0),
        Material::Emissive {
            emission: Color::new(15.0, 15.0, 15.0),
        },
    );
    world.add(Box::new(light));
    let lights = vec![light];

    let ray = Ray::new(Point3::new(0.0, 5.0, 0.0), Vec3::new(0.0, -1.0, -0.1).normalized());
    let mut rng = ChaCha8Rng::seed_from_u64(123);

    let mut total = Color::zero();
    let samples = 64;
    for _ in 0..samples {
        total += ray_color(&ray, &world, &lights, 4, &mut rng);
    }
    let average = total / samples as f64;

    assert!(average.x > 0.0);
    assert!(average.y > 0.0);
    assert!(average.z > 0.0);
}
