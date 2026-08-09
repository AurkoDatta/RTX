# RTX

A physically-based path tracer with a web front end. Scenes are rendered
server-side by a Rust renderer and streamed to the browser as progressively
refining previews while samples accumulate.

## Project layout

- `renderer/` — Rust path tracer, built as a standalone CLI binary
- `backend/` — Node/Express orchestration API and WebSocket frame relay
- `frontend/` — React scene editor and render viewer

## Setup

Setup instructions will be added as each part of the project comes online.

## Status

Early development.
