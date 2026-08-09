//! The core Monte Carlo path tracing algorithm: recursively samples the
//! rendering equation via cosine-weighted BRDF sampling combined with
//! next-event estimation (explicit area-light sampling), then converts the
//! accumulated linear radiance into a displayable color via Reinhard tone
//! mapping and gamma correction.

use crate::hittable::{HitRecord, Hittable};
use crate::material::Material;
use crate::primitives::plane::Plane;
use crate::ray::Ray;
use crate::vec3::{Color, Vec3};
use rand::Rng;

/// A uniformly random point inside the unit sphere, found by rejection
/// sampling a random point in the enclosing cube and discarding points that
/// fall outside the sphere. Simple, exact, and fast enough at this project's
/// scale (the expected number of rejections is small: pi/6 acceptance rate).
pub(crate) fn random_in_unit_sphere(rng: &mut impl Rng) -> Vec3 {
    loop {
        let p = Vec3::new(
            rng.gen_range(-1.0..1.0),
            rng.gen_range(-1.0..1.0),
            rng.gen_range(-1.0..1.0),
        );
        if p.length_squared() < 1.0 {
            return p;
        }
    }
}

/// A cosine-weighted random direction in the hemisphere around `normal`.
///
/// Adding a uniformly-random point on the unit sphere to the normal and
/// normalizing the result is a standard identity (see Shirley, "Ray Tracing in
/// One Weekend") that produces a *cosine-weighted* distribution over the
/// hemisphere rather than a uniform one. That matters because the Lambertian
/// BRDF's contribution to the rendering equation is itself proportional to
/// cos(theta): sampling directions proportionally to that same cosine term
/// makes it cancel exactly against the sampling PDF, so each sample's
/// contribution reduces to just the surface albedo with no extra weighting --
/// this is what "importance sampling" buys here, versus uniform hemisphere
/// sampling which would waste many samples on grazing directions that
/// contribute little.
pub(crate) fn cosine_weighted_hemisphere_sample(normal: Vec3, rng: &mut impl Rng) -> Vec3 {
    let mut direction = normal + random_in_unit_sphere(rng).normalized();
    if direction.near_zero() {
        // The random sample landed almost exactly opposite the normal; fall
        // back to the normal itself rather than propagating a near-zero
        // (numerically unstable) scatter direction.
        direction = normal;
    }
    direction
}

/// Applies gamma-2.0 correction (a per-channel square root) to convert a
/// linear-light color into the roughly perceptual space displays expect.
/// Gamma 2.0 is a cheap, visually adequate stand-in for sRGB's ~2.2 curve, and
/// unlike full sRGB it's exactly invertible with a squaring operation, which
/// keeps the math simple for a preview renderer.
pub fn linear_to_gamma(channel: f64) -> f64 {
    if channel > 0.0 {
        channel.sqrt()
    } else {
        0.0
    }
}

/// Reinhard tone mapping: compresses unbounded linear radiance (which can
/// exceed 1.0 near bright lights or after many additive bounces) into [0, 1)
/// via `c / (1 + c)`, preserving relative brightness differences instead of
/// hard-clipping highlights the way naive saturation would.
pub fn reinhard_tone_map(color: Color) -> Color {
    Color::new(
        color.x / (1.0 + color.x),
        color.y / (1.0 + color.y),
        color.z / (1.0 + color.z),
    )
}

/// Converts an accumulated linear radiance sample into a final displayable
/// color: Reinhard tone mapping first (to tame unbounded brightness), then
/// gamma correction (to match display expectations). This is applied once to
/// the averaged accumulation buffer, not per sample.
pub fn finalize_pixel(linear_color: Color) -> Color {
    let mapped = reinhard_tone_map(linear_color);
    Color::new(
        linear_to_gamma(mapped.x),
        linear_to_gamma(mapped.y),
        linear_to_gamma(mapped.z),
    )
}

/// Traces one camera ray through up to `depth` bounces and returns the
/// estimated linear radiance arriving back along it. Call once per sample per
/// pixel; the renderer averages many independent calls together to converge
/// the noisy per-sample estimate toward the true image.
pub fn ray_color(
    ray: &Ray,
    world: &dyn Hittable,
    lights: &[Plane],
    depth: u32,
    rng: &mut impl Rng,
) -> Color {
    // The initial camera ray has no prior next-event-estimation sample to
    // double-count against, so it always counts a light it hits directly.
    trace(ray, world, lights, depth, rng, true)
}

fn trace(
    ray: &Ray,
    world: &dyn Hittable,
    lights: &[Plane],
    depth: u32,
    rng: &mut impl Rng,
    came_from_specular: bool,
) -> Color {
    if depth == 0 {
        return Color::zero();
    }

    let Some(hit) = world.hit(ray, 0.001, f64::INFINITY) else {
        // No environment/sky light in this scope: rays that escape the scene
        // entirely contribute nothing.
        return Color::zero();
    };

    // Only count a light's own emission here if it wasn't already accounted
    // for via next-event estimation at the *previous* vertex. Skipping it
    // avoids double-counting: a diffuse bounce that happens to land on a light
    // would otherwise be counted once via the explicit shadow-ray sample in
    // `sample_direct_lighting` and again here via the direct hit.
    let emitted = if came_from_specular {
        hit.material.emitted()
    } else {
        Color::zero()
    };

    let Some(scatter) = hit.material.scatter(ray, &hit, rng) else {
        return emitted;
    };

    let direct = if scatter.specular {
        // Specular (mirror/glass) scatter directions are effectively a delta
        // function: a randomly sampled point on a light will almost never
        // coincide with the one direction that actually reflects/refracts
        // toward it, so next-event estimation would add high variance for
        // negligible signal here. The recursive call below finds lights from
        // specular surfaces the ordinary way instead.
        Color::zero()
    } else {
        sample_direct_lighting(&hit, world, lights, rng)
    };

    let indirect =
        scatter.attenuation * trace(&scatter.ray, world, lights, depth - 1, rng, scatter.specular);

    emitted + direct + indirect
}

/// Next-event estimation: for a diffuse hit, samples a random point on each
/// area light and, if it's visible, adds that light's direct contribution
/// weighted by the rendering equation's cosine and inverse-square-falloff
/// terms. This is what lets small, bright lights converge cleanly within this
/// project's capped sample budget -- relying on BRDF sampling alone to
/// stumble onto a light by chance would be extremely noisy in comparison.
fn sample_direct_lighting(
    hit: &HitRecord,
    world: &dyn Hittable,
    lights: &[Plane],
    rng: &mut impl Rng,
) -> Color {
    // `trace` only calls this for non-specular scatters, which in this
    // material model means Lambertian -- but stay defensive rather than
    // assuming that invariant holds forever.
    let Material::Lambertian { albedo } = hit.material else {
        return Color::zero();
    };
    let brdf = albedo / std::f64::consts::PI;

    let mut total = Color::zero();
    for light in lights {
        let light_point = light.sample_point(rng);
        let light_normal = light.normal();

        let to_light = light_point - hit.point;
        let distance_squared = to_light.length_squared();
        let distance = distance_squared.sqrt();
        let light_dir = to_light / distance;

        let cos_surface = hit.normal.dot(&light_dir);
        let cos_light = light_normal.dot(&(-light_dir));
        if cos_surface <= 0.0 || cos_light <= 0.0 {
            // The light is behind the shading surface, or this point on the
            // light faces away from the shading point -- no contribution.
            continue;
        }

        let shadow_ray = Ray::new(hit.point, light_dir);
        if world.hit(&shadow_ray, 0.001, distance - 0.001).is_some() {
            continue; // occluded by other geometry
        }

        // Converts the light's emitted radiance into an irradiance
        // contribution at the shading point: cos(surface) is the standard
        // rendering-equation cosine term, and `area * cos(light) / distance^2`
        // is the Jacobian that turns a uniform sample over the light's *area*
        // into the equivalent sample over the *solid angle* the rendering
        // equation actually integrates over.
        let solid_angle_factor = light.area() * cos_light / distance_squared;
        total += brdf * light.material.emitted() * cos_surface * solid_angle_factor;
    }

    total
}
