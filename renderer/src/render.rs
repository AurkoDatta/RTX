//! Drives the progressive rendering loop: repeatedly takes one more sample
//! per pixel across the whole image, accumulates it into a running-sum
//! framebuffer, and periodically emits `progress`/`frame` IPC messages so the
//! backend can relay live updates to the browser as the image de-noises.

use crate::camera::Camera;
use crate::hittable::Hittable;
use crate::ipc::IpcMessage;
use crate::primitives::plane::Plane;
use crate::tracer::{finalize_pixel, ray_color};
use crate::vec3::Color;
use rand::Rng;
use rayon::prelude::*;
use std::io::{self, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

pub struct RenderParams {
    pub width: u32,
    pub height: u32,
    pub max_samples: u32,
    pub max_bounce_depth: u32,
}

/// Traces one additional sample per pixel across the whole image in
/// parallel, adding each pixel's contribution into `accumulator` (a running
/// sum, not yet averaged). Each pixel's sample is fully independent of every
/// other, so `rayon` splits the rows across all available CPU cores with no
/// synchronization needed beyond collecting the results.
pub fn accumulate_sample_pass(
    camera: &Camera,
    world: &dyn Hittable,
    lights: &[Plane],
    accumulator: &mut [Color],
    width: usize,
    height: usize,
    max_bounce_depth: u32,
) {
    let row_results: Vec<Vec<Color>> = (0..height)
        .into_par_iter()
        .map(|y| {
            // `thread_rng()` is thread-local and rayon reuses worker threads
            // across the job, so this is a cheap lookup, not a fresh RNG
            // construction, per pixel.
            let mut rng = rand::thread_rng();
            (0..width)
                .map(|x| {
                    // Jitter the sample within the pixel footprint (stratified
                    // over successive calls only in aggregate, since each
                    // call draws a fresh random offset) -- this is what turns
                    // hard geometric edges into progressively-antialiased
                    // ones as samples accumulate, for free alongside the
                    // Monte Carlo shading itself.
                    let u = (x as f64 + rng.gen::<f64>()) / width as f64;
                    let v = 1.0 - (y as f64 + rng.gen::<f64>()) / height as f64;
                    let ray = camera.get_ray(u, v);
                    ray_color(&ray, world, lights, max_bounce_depth, &mut rng)
                })
                .collect()
        })
        .collect();

    for (y, row) in row_results.into_iter().enumerate() {
        for (x, color) in row.into_iter().enumerate() {
            accumulator[y * width + x] += color;
        }
    }
}

/// Converts a running-sum accumulator into a final RGB8 pixel buffer: divide
/// by the sample count to get the mean radiance per pixel, then apply tone
/// mapping and gamma correction (once, here -- not per sample) before
/// quantizing to 8 bits per channel.
pub fn finalize_buffer(accumulator: &[Color], samples: u32) -> Vec<u8> {
    let samples = samples.max(1) as f64;
    let mut pixels = Vec::with_capacity(accumulator.len() * 3);
    for color in accumulator {
        let averaged = *color / samples;
        let final_color = finalize_pixel(averaged);
        pixels.push((final_color.x.clamp(0.0, 1.0) * 255.0).round() as u8);
        pixels.push((final_color.y.clamp(0.0, 1.0) * 255.0).round() as u8);
        pixels.push((final_color.z.clamp(0.0, 1.0) * 255.0).round() as u8);
    }
    pixels
}

/// Runs the full progressive render: accumulates samples one pass at a time,
/// emitting `progress` every pass and a throttled `frame` snapshot roughly
/// every `max_samples / 40` samples or 250ms (whichever comes first), then a
/// final `complete` message. Checks `cancelled` between passes and, if set,
/// stops early and emits `cancelled` instead of `complete`.
pub fn render<W: Write>(
    camera: &Camera,
    world: &dyn Hittable,
    lights: &[Plane],
    params: &RenderParams,
    job_id: &str,
    cancelled: Arc<AtomicBool>,
    out: &mut W,
) -> io::Result<()> {
    let width = params.width as usize;
    let height = params.height as usize;
    let mut accumulator = vec![Color::zero(); width * height];

    let start = Instant::now();
    let mut last_frame_at = Instant::now();
    let mut last_frame_samples = 0u32;
    let frame_sample_interval = (params.max_samples / 40).max(1);

    for sample in 1..=params.max_samples {
        if cancelled.load(Ordering::Relaxed) {
            IpcMessage::Cancelled {
                job_id,
                samples: sample - 1,
            }
            .emit(out)?;
            return Ok(());
        }

        accumulate_sample_pass(
            camera,
            world,
            lights,
            &mut accumulator,
            width,
            height,
            params.max_bounce_depth,
        );

        let elapsed_ms = start.elapsed().as_millis() as u64;
        let eta_ms = (elapsed_ms as f64 / sample as f64 * (params.max_samples - sample) as f64)
            .round() as u64;
        IpcMessage::Progress {
            job_id,
            samples: sample,
            max_samples: params.max_samples,
            elapsed_ms,
            eta_ms,
        }
        .emit(out)?;

        let samples_since_last_frame = sample - last_frame_samples;
        let due_for_frame = samples_since_last_frame >= frame_sample_interval
            || last_frame_at.elapsed().as_millis() >= 250
            || sample == params.max_samples;
        if due_for_frame {
            let pixels = finalize_buffer(&accumulator, sample);
            IpcMessage::Frame {
                job_id,
                samples: sample,
                max_samples: params.max_samples,
                width: params.width,
                height: params.height,
                encoding: "rgb8",
                pixels_b64: IpcMessage::encode_pixels(&pixels),
            }
            .emit(out)?;
            last_frame_at = Instant::now();
            last_frame_samples = sample;
        }
    }

    let pixels = finalize_buffer(&accumulator, params.max_samples);
    IpcMessage::Complete {
        job_id,
        samples: params.max_samples,
        elapsed_ms: start.elapsed().as_millis() as u64,
        width: params.width,
        height: params.height,
        encoding: "rgb8",
        pixels_b64: IpcMessage::encode_pixels(&pixels),
    }
    .emit(out)?;

    Ok(())
}
