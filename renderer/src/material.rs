//! Surface material models. Each variant implements different scattering
//! behavior for `scatter`, the single entry point the path tracer
//! (`tracer.rs`) calls after finding a ray-surface intersection.
//!
//! The scope here is deliberately Whitted-style + Lambertian rather than a
//! full microfacet/Cook-Torrance model: at this project's target resolution
//! and sample budget (a live-updating preview, not an offline final-frame
//! render), glossy-reflection fidelity a microfacet BRDF would add isn't
//! visible, while the extra variance from importance-sampling a roughness
//! distribution would actively slow convergence.

use crate::hittable::HitRecord;
use crate::ray::Ray;
use crate::tracer::{cosine_weighted_hemisphere_sample, random_in_unit_sphere};
use crate::vec3::Color;
use rand::Rng;
use serde::Deserialize;

/// Fresnel reflectance via Schlick's approximation: a cheap polynomial fit to
/// the exact (and much more expensive) Fresnel equations, giving the fraction
/// of light reflected off a dielectric boundary as a function of the
/// incidence angle and the two media's relative refractive index.
pub fn schlick_reflectance(cosine: f64, ref_idx: f64) -> f64 {
    let r0 = (1.0 - ref_idx) / (1.0 + ref_idx);
    let r0 = r0 * r0;
    r0 + (1.0 - r0) * (1.0 - cosine).powi(5)
}

/// Deserialized directly from the scene JSON's `material` field, tagged by a
/// `"type"` key (`"lambertian"`, `"metal"`, `"dielectric"`, `"emissive"`)
/// matching each variant's snake_case name.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Material {
    /// Perfectly diffuse (matte) surface: incoming light scatters in all
    /// directions weighted by cosine, per the Lambertian BRDF (albedo/pi).
    Lambertian { albedo: Color },
    /// Mirror-like reflection, optionally roughened by `fuzz` (0.0 = perfect
    /// mirror; larger values randomly perturb the reflected direction to
    /// approximate a brushed/rough metal without a full microfacet model).
    Metal { albedo: Color, fuzz: f64 },
    /// Glass-like transmissive surface with refractive index `ior`. Uses
    /// Snell's law to refract and Schlick's approximation to probabilistically
    /// choose between reflecting and refracting at each hit, which is what
    /// produces Fresnel effects (e.g. glass looking more mirror-like at
    /// grazing angles) without evaluating both paths every time.
    Dielectric { ior: f64 },
    /// A light source: emits `emission` and does not scatter incoming light.
    Emissive { emission: Color },
}

/// The outcome of a material scattering an incoming ray: the color by which
/// any light carried back along the new ray gets attenuated, plus whether the
/// scattered direction was (effectively) a delta function -- used by the
/// tracer to decide whether next-event estimation is worthwhile from here.
pub struct Scatter {
    pub attenuation: Color,
    pub ray: Ray,
    pub specular: bool,
}

impl Material {
    pub fn emitted(&self) -> Color {
        match self {
            Material::Emissive { emission } => *emission,
            _ => Color::zero(),
        }
    }

    /// Computes how (and whether) this material scatters an incoming ray at a
    /// hit point. Returns `None` for materials that only emit light.
    pub fn scatter(&self, ray_in: &Ray, hit: &HitRecord, rng: &mut impl Rng) -> Option<Scatter> {
        match self {
            Material::Lambertian { albedo } => {
                let direction = cosine_weighted_hemisphere_sample(hit.normal, rng);
                Some(Scatter {
                    attenuation: *albedo,
                    ray: Ray::new(hit.point, direction),
                    specular: false,
                })
            }
            Material::Metal { albedo, fuzz } => {
                let reflected = ray_in.direction.normalized().reflect(&hit.normal);
                // Perturbing the ideal reflection by a random point in a small
                // sphere (scaled by `fuzz`) is a cheap stand-in for a rough
                // microfacet surface: fuzz = 0 keeps the mirror direction
                // exact, larger fuzz spreads reflections out like a brushed
                // metal.
                let fuzzed = reflected + random_in_unit_sphere(rng) * fuzz.min(1.0);
                if fuzzed.dot(&hit.normal) <= 0.0 {
                    // Fuzz pushed the reflected ray below the surface -- treat
                    // it as absorbed rather than shading through the surface.
                    return None;
                }
                Some(Scatter {
                    attenuation: *albedo,
                    ray: Ray::new(hit.point, fuzzed),
                    specular: true,
                })
            }
            Material::Dielectric { ior } => {
                // Entering the medium uses ior_air / ior_material; exiting
                // uses the reciprocal. `front_face` (from `HitRecord`) tells
                // us which side of the surface the ray started on.
                let refraction_ratio = if hit.front_face { 1.0 / ior } else { *ior };
                let unit_direction = ray_in.direction.normalized();

                let cos_theta = (-unit_direction).dot(&hit.normal).min(1.0);
                let sin_theta = (1.0 - cos_theta * cos_theta).max(0.0).sqrt();

                // Snell's law has no real solution past the critical angle --
                // total internal reflection -- so the ray must reflect.
                let cannot_refract = refraction_ratio * sin_theta > 1.0;
                let reflectance = schlick_reflectance(cos_theta, refraction_ratio);

                // Probabilistically choose reflect vs. refract, weighted by
                // the Fresnel reflectance, rather than splitting the ray into
                // two weaker rays -- this keeps the path tracer's branching
                // factor at one ray per bounce while still converging to the
                // correct blend of reflection and transmission on average.
                let direction = if cannot_refract || reflectance > rng.gen::<f64>() {
                    unit_direction.reflect(&hit.normal)
                } else {
                    unit_direction.refract(&hit.normal, refraction_ratio)
                };

                Some(Scatter {
                    attenuation: Color::new(1.0, 1.0, 1.0),
                    ray: Ray::new(hit.point, direction),
                    specular: true,
                })
            }
            Material::Emissive { .. } => None,
        }
    }
}
