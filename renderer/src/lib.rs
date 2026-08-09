//! Core path tracing library. Exposed as a library (in addition to the `main.rs`
//! CLI binary) so `cargo test` can exercise the math and intersection logic
//! directly, independent of the CLI/IPC layer.

pub mod aabb;
pub mod bvh;
pub mod camera;
pub mod hittable;
pub mod material;
pub mod primitives;
pub mod ray;
pub mod tracer;
pub mod vec3;
