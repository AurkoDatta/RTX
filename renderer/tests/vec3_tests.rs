use renderer::vec3::Vec3;

#[test]
fn add_sub_negate() {
    let a = Vec3::new(1.0, 2.0, 3.0);
    let b = Vec3::new(4.0, 5.0, 6.0);
    assert_eq!(a + b, Vec3::new(5.0, 7.0, 9.0));
    assert_eq!(b - a, Vec3::new(3.0, 3.0, 3.0));
    assert_eq!(-a, Vec3::new(-1.0, -2.0, -3.0));
}

#[test]
fn scalar_mul_and_div() {
    let a = Vec3::new(1.0, 2.0, 3.0);
    assert_eq!(a * 2.0, Vec3::new(2.0, 4.0, 6.0));
    assert_eq!(a / 2.0, Vec3::new(0.5, 1.0, 1.5));
}

#[test]
fn componentwise_mul_for_color_attenuation() {
    let albedo = Vec3::new(0.5, 1.0, 0.25);
    let light = Vec3::new(2.0, 2.0, 2.0);
    assert_eq!(albedo * light, Vec3::new(1.0, 2.0, 0.5));
}

#[test]
fn dot_product_of_orthogonal_and_parallel_vectors() {
    let a = Vec3::new(1.0, 0.0, 0.0);
    let b = Vec3::new(0.0, 1.0, 0.0);
    assert_eq!(a.dot(&b), 0.0);
    assert_eq!(a.dot(&a), 1.0);
}

#[test]
fn cross_product_of_orthogonal_unit_vectors() {
    let x = Vec3::new(1.0, 0.0, 0.0);
    let y = Vec3::new(0.0, 1.0, 0.0);
    assert_eq!(x.cross(&y), Vec3::new(0.0, 0.0, 1.0));
}

#[test]
fn length_and_normalize() {
    let a = Vec3::new(3.0, 4.0, 0.0);
    assert_eq!(a.length(), 5.0);
    let n = a.normalized();
    assert!((n.length() - 1.0).abs() < 1e-12);
}

#[test]
fn near_zero_detects_degenerate_vectors() {
    assert!(Vec3::new(1e-10, -1e-10, 0.0).near_zero());
    assert!(!Vec3::new(0.1, 0.0, 0.0).near_zero());
}

#[test]
fn reflect_off_flat_surface() {
    let incoming = Vec3::new(1.0, -1.0, 0.0);
    let normal = Vec3::new(0.0, 1.0, 0.0);
    let reflected = incoming.reflect(&normal);
    assert!((reflected - Vec3::new(1.0, 1.0, 0.0)).length() < 1e-12);
}

#[test]
fn refract_straight_through_matched_media_is_unchanged() {
    // A ray hitting head-on with equal refractive indices on both sides should
    // pass through without bending.
    let incoming = Vec3::new(0.0, -1.0, 0.0);
    let normal = Vec3::new(0.0, 1.0, 0.0);
    let refracted = incoming.refract(&normal, 1.0);
    assert!((refracted - incoming).length() < 1e-9);
}

#[test]
fn refract_bends_toward_normal_entering_denser_medium() {
    // A ray entering a denser medium (eta_incident/eta_transmitted < 1) at an
    // angle should bend closer to the normal, i.e. its refracted x-component
    // should shrink relative to the incoming x-component.
    let incoming = Vec3::new(0.6, -0.8, 0.0); // already unit length
    let normal = Vec3::new(0.0, 1.0, 0.0);
    let refracted = incoming.refract(&normal, 1.0 / 1.5);
    assert!(refracted.x.abs() < incoming.x.abs());
    assert!((refracted.length() - 1.0).abs() < 1e-9);
}
