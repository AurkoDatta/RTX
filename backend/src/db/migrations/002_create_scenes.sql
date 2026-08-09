-- Up Migration
CREATE TABLE scenes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    scene_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX scenes_user_id_idx ON scenes(user_id);

-- Down Migration
DROP TABLE scenes;
