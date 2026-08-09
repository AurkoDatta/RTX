-- Up Migration
-- scene_id uses ON DELETE SET NULL (not CASCADE) so a render stays in a
-- user's gallery/history even after they delete the scene that produced it.
CREATE TABLE renders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scene_id INTEGER REFERENCES scenes(id) ON DELETE SET NULL,
    image_path TEXT,
    samples_completed INTEGER NOT NULL DEFAULT 0,
    render_time_ms INTEGER,
    status TEXT NOT NULL DEFAULT 'queued',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX renders_user_id_idx ON renders(user_id);

-- Down Migration
DROP TABLE renders;
