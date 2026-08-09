//! CLI entry point. Two modes:
//!
//! - **Backend-driven** (`--job-id <uuid>`): reads one scene JSON document
//!   from stdin until EOF, streams `progress`/`frame`/`complete` IPC
//!   messages to stdout as it renders, and responds to `SIGTERM` by finishing
//!   the current pass, emitting `cancelled`, and exiting -- this is how the
//!   Node backend drives it.
//! - **Standalone** (`--input <file> --output <file.png>`): reads scene JSON
//!   from a file, renders to completion printing plain progress to stderr,
//!   and saves a PNG -- useful for local testing independent of the backend,
//!   and for generating reference images from the preset fixtures.

use clap::Parser;
use renderer::ipc::IpcMessage;
use renderer::render::{self, RenderParams};
use renderer::scene::{BuiltScene, SceneFile};
use renderer::vec3::Color;
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

#[derive(Parser)]
#[command(name = "renderer", about = "Physically-based path tracer")]
struct Cli {
    /// Job identifier echoed in every IPC message. Required in backend-driven
    /// mode; ignored in standalone mode.
    #[arg(long)]
    job_id: Option<String>,

    /// Standalone mode: read the scene JSON from this file instead of stdin.
    #[arg(long)]
    input: Option<PathBuf>,

    /// Standalone mode: render to completion and save a PNG here instead of
    /// streaming IPC frames to stdout.
    #[arg(long)]
    output: Option<PathBuf>,
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    let standalone = cli.output.is_some();

    let scene_json = match read_scene_json(cli.input.as_deref()) {
        Ok(json) => json,
        Err(e) => {
            eprintln!("failed to read scene input: {e}");
            return ExitCode::FAILURE;
        }
    };

    let scene_file: SceneFile = match serde_json::from_str(&scene_json) {
        Ok(scene) => scene,
        Err(e) => {
            let job_id = cli.job_id.as_deref().unwrap_or("standalone");
            if standalone {
                eprintln!("scene parse error: {e}");
            } else {
                let stdout = io::stdout();
                let mut handle = stdout.lock();
                let _ = IpcMessage::Error {
                    job_id,
                    code: "SCENE_PARSE_ERROR",
                    message: e.to_string(),
                }
                .emit(&mut handle);
            }
            return ExitCode::FAILURE;
        }
    };

    let aspect_ratio = scene_file.settings.width as f64 / scene_file.settings.height as f64;
    let built = scene_file.scene.build(aspect_ratio);
    let params = RenderParams {
        width: scene_file.settings.width,
        height: scene_file.settings.height,
        max_samples: scene_file.settings.max_samples,
        max_bounce_depth: scene_file.settings.max_bounce_depth,
    };

    if let Some(output_path) = &cli.output {
        return render_to_png(&built, &params, output_path);
    }

    let job_id = cli.job_id.unwrap_or_else(|| "unknown".to_string());
    let cancelled = Arc::new(AtomicBool::new(false));
    {
        let cancelled = cancelled.clone();
        // SIGTERM is the backend's cancellation signal (see the IPC protocol
        // design): rather than killing the process outright, this lets the
        // in-flight sample pass finish and a clean `cancelled` message go out
        // before exiting.
        if let Err(e) = ctrlc::set_handler(move || cancelled.store(true, Ordering::Relaxed)) {
            eprintln!("failed to install SIGTERM handler: {e}");
            return ExitCode::FAILURE;
        }
    }

    let stdout = io::stdout();
    let mut handle = stdout.lock();
    match render::render(
        &built.camera,
        built.world.as_ref(),
        &built.lights,
        &params,
        &job_id,
        cancelled,
        &mut handle,
    ) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("render failed: {e}");
            ExitCode::FAILURE
        }
    }
}

fn read_scene_json(input: Option<&Path>) -> io::Result<String> {
    match input {
        Some(path) => std::fs::read_to_string(path),
        None => {
            let mut buf = String::new();
            io::stdin().read_to_string(&mut buf)?;
            Ok(buf)
        }
    }
}

/// Standalone-mode render: runs every sample pass to completion (no IPC
/// throttling, since there's no client to throttle for), printing coarse
/// progress to stderr, then encodes and saves the final buffer as a PNG.
fn render_to_png(built: &BuiltScene, params: &RenderParams, output_path: &Path) -> ExitCode {
    let width = params.width as usize;
    let height = params.height as usize;
    let mut accumulator = vec![Color::zero(); width * height];

    for sample in 1..=params.max_samples {
        render::accumulate_sample_pass(
            &built.camera,
            built.world.as_ref(),
            &built.lights,
            &mut accumulator,
            width,
            height,
            params.max_bounce_depth,
        );
        if sample % 10 == 0 || sample == params.max_samples {
            eprint!("\rsample {sample}/{}", params.max_samples);
            let _ = io::stderr().flush();
        }
    }
    eprintln!();

    let pixels = render::finalize_buffer(&accumulator, params.max_samples);
    let Some(image) = image::RgbImage::from_raw(params.width, params.height, pixels) else {
        eprintln!("internal error: pixel buffer size did not match width*height*3");
        return ExitCode::FAILURE;
    };

    match image.save(output_path) {
        Ok(()) => {
            eprintln!("wrote {}", output_path.display());
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("failed to save {}: {e}", output_path.display());
            ExitCode::FAILURE
        }
    }
}
