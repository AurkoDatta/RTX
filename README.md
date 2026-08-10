# RTX

A physically-based path tracer with a web front end. Scenes are rendered
server-side by a Rust renderer and streamed to the browser as progressively
refining previews while samples accumulate — watch an image resolve from
noise to a clean picture in real time.

## Project layout

- `renderer/` — Rust path tracer, built as a standalone CLI binary with no
  dependency on the web stack. Reads a scene as JSON and streams progress
  over stdout; independently testable with `cargo test`.
- `backend/` — Node/Express orchestration API. Spawns the renderer as a
  child process per render job, relays its output to connected clients over
  WebSockets, and owns auth, scenes, and the render gallery (PostgreSQL).
- `frontend/` — React (Vite) scene editor, live render viewer, and gallery.

## Prerequisites

- [Rust](https://rustup.rs) (stable toolchain)
- Node.js 20+
- PostgreSQL 16 (a local install works fine; no Docker required)

## Setup

### 1. Renderer

```sh
cd renderer
cargo build --release
```

This produces `renderer/target/release/renderer`, which the backend spawns
per render job. You can also run it standalone against a scene file, useful
for testing without the rest of the stack:

```sh
cargo run --release -- --input tests/fixtures/cornell_box.json --output out.png
```

Run the test suite with:

```sh
cargo test
```

### 2. Database

Create a local database:

```sh
createdb raytracer_dev
```

### 3. Backend

```sh
cd backend
npm install
cp .env.example .env
```

Edit `.env` and set:

- `DATABASE_URL` — points at the database from step 2 by default
- `JWT_SECRET` — generate one with `openssl rand -hex 32`
- `RENDERER_BINARY_PATH` — path to the binary built in step 1 (the default,
  `../renderer/target/release/renderer`, works if you keep the default
  layout)

Run migrations, then start the server:

```sh
npm run migrate:up
npm run dev
```

The API listens on port 4000 by default. Run its tests with `npm test`
(this talks to the real local database, so run migrations first).

### 4. Frontend

```sh
cd frontend
npm install
cp .env.example .env
npm run dev
```

The dev server listens on port 5173 by default and expects the backend at
the URL in `.env` (`http://localhost:4000` by default). Run its tests with
`npm test`.

### 5. Use it

Open the frontend URL, register an account, open the scene editor, load one
of the built-in presets (Cornell Box, Reflective Spheres, Glass Sphere) or
build your own scene, and click Render. The canvas updates live as samples
accumulate; completed and cancelled renders are saved to your gallery.

## How the renderer works

The renderer is a Monte Carlo path tracer: for each pixel, it fires many
random rays into the scene, bounces them off surfaces according to each
material's behavior, and averages the results together. More samples means
less noise, which is what you're watching happen live as a render
progresses.

**Primitives and acceleration.** Scenes are built from spheres, finite
planar quads, and triangles (individually or grouped into a simple mesh).
Ray-object intersection for a scene with many objects would be slow tested
one at a time, so objects are organized into a bounding volume hierarchy
(BVH) — a binary tree of bounding boxes that lets a ray skip whole branches
of geometry it can't possibly hit.

**Materials.** Four material types cover the required range of physical
behavior: Lambertian (matte diffuse), metal (mirror-like reflection with
optional roughness), dielectric (glass, with Snell's law refraction and
Fresnel reflectance via Schlick's approximation), and emissive (light
sources — any object can be a light by using this material).

**Sampling.** Diffuse bounces use cosine-weighted hemisphere sampling, which
concentrates samples where the Lambertian BRDF actually contributes,
reducing noise per sample compared to sampling directions uniformly. Area
lights (emissive planar quads) are also sampled directly at each diffuse
bounce via next-event estimation — without this, a path tracer would need
far more samples to find small, bright lights by chance.

**Output.** Each pixel's accumulated radiance is tone-mapped (Reinhard) to
compress values that can exceed the displayable range near bright lights,
then gamma-corrected before being quantized to 8 bits per channel.

**Streaming.** The renderer communicates with the backend over stdin/stdout
using newline-delimited JSON: it reads the scene once on startup, then
emits a line per completed sample pass (and a throttled snapshot of the
current frame buffer) until the target sample count is reached or it
receives a termination signal.

## Render limits

To keep render times bounded, resolution, sample count, bounce depth, and
object count are all capped and enforced on the backend regardless of what
a client requests.
