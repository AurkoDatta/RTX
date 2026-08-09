//! Pinhole camera: maps normalized image-plane coordinates to world-space rays,
//! derived from a position/look-at/up basis and a vertical field of view.

use crate::ray::Ray;
use crate::vec3::{Point3, Vec3};

pub struct Camera {
    origin: Point3,
    lower_left_corner: Point3,
    horizontal: Vec3,
    vertical: Vec3,
}

impl Camera {
    /// Builds a camera basis from position (`look_from`), look-at target, an
    /// approximate "up" hint, the full vertical field of view in degrees, and the
    /// image aspect ratio (width / height).
    pub fn new(
        look_from: Point3,
        look_at: Point3,
        vup: Vec3,
        vfov_degrees: f64,
        aspect_ratio: f64,
    ) -> Self {
        let theta = vfov_degrees.to_radians();
        let h = (theta / 2.0).tan();
        let viewport_height = 2.0 * h;
        let viewport_width = aspect_ratio * viewport_height;

        // Build a right-handed camera basis: w points from the look-at target back
        // toward the eye, u is "camera right", v is "camera up". This mirrors the
        // convention used throughout most ray tracing references (e.g. Shirley's
        // "Ray Tracing in One Weekend") and keeps the derivation below simple.
        let w = (look_from - look_at).normalized();
        let u = vup.cross(&w).normalized();
        let v = w.cross(&u);

        let origin = look_from;
        let horizontal = u * viewport_width;
        let vertical = v * viewport_height;
        // The viewport sits one unit in front of the eye along -w; its lower-left
        // corner is offset back by half the horizontal/vertical extents plus w.
        let lower_left_corner = origin - horizontal / 2.0 - vertical / 2.0 - w;

        Camera {
            origin,
            lower_left_corner,
            horizontal,
            vertical,
        }
    }

    /// Returns the ray through normalized image-plane coordinates `(s, t)` in
    /// `[0, 1]`, with `(0, 0)` at the bottom-left of the viewport.
    pub fn get_ray(&self, s: f64, t: f64) -> Ray {
        Ray::new(
            self.origin,
            self.lower_left_corner + self.horizontal * s + self.vertical * t - self.origin,
        )
    }
}
