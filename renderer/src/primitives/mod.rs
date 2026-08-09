//! Concrete intersectable shapes. Each submodule implements the `Hittable`
//! trait from `hittable.rs` for one primitive kind.

pub mod mesh;
pub mod plane;
pub mod sphere;
pub mod triangle;
