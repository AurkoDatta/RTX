//! JSON-lines IPC protocol: the renderer emits one newline-terminated JSON
//! message per line on stdout for the orchestrating backend to parse (stderr
//! is reserved for logs/panics and is never part of this protocol). This
//! module is purely the Rust-side encoding of that contract -- see the
//! project's IPC protocol design for the full message shapes and the
//! rationale behind base64-encoding pixel data instead of using a separate
//! binary channel.

use base64::engine::general_purpose::STANDARD;
use base64::Engine as _;
use serde::Serialize;
use std::io::{self, Write};

/// One line of the renderer-to-backend protocol. Serialized with a `"type"`
/// tag matching the variant name in snake_case (`"progress"`, `"frame"`,
/// `"complete"`, `"error"`, `"cancelled"`), so the backend can dispatch on a
/// single field without a separate schema per message kind.
#[derive(Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum IpcMessage<'a> {
    /// Emitted after every completed sample pass: lightweight enough to send
    /// far more often than full frames, so the UI's progress bar and ETA stay
    /// responsive even between visual updates.
    Progress {
        job_id: &'a str,
        samples: u32,
        max_samples: u32,
        elapsed_ms: u64,
        eta_ms: u64,
    },
    /// A snapshot of the accumulated (already gamma/tone-mapped) framebuffer,
    /// throttled to roughly once per 250ms or every `max_samples / 40`
    /// samples -- see `render.rs` -- so the browser gets a steady stream of
    /// visual updates without being flooded.
    Frame {
        job_id: &'a str,
        samples: u32,
        max_samples: u32,
        width: u32,
        height: u32,
        encoding: &'static str,
        pixels_b64: String,
    },
    /// The final frame, sent once, after the last sample pass finishes.
    Complete {
        job_id: &'a str,
        samples: u32,
        elapsed_ms: u64,
        width: u32,
        height: u32,
        encoding: &'static str,
        pixels_b64: String,
    },
    /// A fatal problem (e.g. malformed scene JSON) that stopped the render
    /// before it could produce any output.
    Error {
        job_id: &'a str,
        code: &'static str,
        message: String,
    },
    /// Sent in response to a SIGTERM-driven cancellation, reporting how many
    /// samples had completed before the render stopped.
    Cancelled { job_id: &'a str, samples: u32 },
}

impl<'a> IpcMessage<'a> {
    /// Encodes an RGB8 pixel buffer as base64 for embedding in a JSON line
    /// (`Frame`/`Complete`). Base64 keeps the whole protocol as plain text
    /// lines -- trivially parsed with a line reader on the backend, and easy
    /// to unit-test with plain string fixtures -- at the cost of ~33% size
    /// overhead versus a raw binary side-channel, an acceptable trade at this
    /// project's capped 640x480 resolution.
    pub fn encode_pixels(pixels: &[u8]) -> String {
        STANDARD.encode(pixels)
    }

    /// Serializes this message to a single JSON line and writes it to
    /// `writer`, flushing immediately so the backend sees it without
    /// buffering delay -- essential for a *progressive* renderer, where
    /// timely delivery of intermediate frames is the whole point.
    pub fn emit<W: Write>(&self, writer: &mut W) -> io::Result<()> {
        let json = serde_json::to_string(self).expect("IPC messages are always serializable");
        writeln!(writer, "{json}")?;
        writer.flush()
    }
}
