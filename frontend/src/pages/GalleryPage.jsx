import { useEffect, useState } from 'react';
import { GalleryGrid } from '../components/gallery/GalleryGrid.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { ApiError } from '../services/api.js';
import { deleteRender, listRenders } from '../services/rendersApi.js';

export function GalleryPage() {
  const { token } = useAuth();
  const [renders, setRenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listRenders(token)
      .then((data) => setRenders(data.renders))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load renders.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDelete(id) {
    try {
      await deleteRender(id, token);
      setRenders((prev) => prev.filter((render) => render.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete that render.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 font-display text-2xl font-semibold">Gallery</h1>

      {error && <p className="mb-4 text-sm text-error">{error}</p>}

      {loading ? (
        <p className="text-text-muted">Loading…</p>
      ) : (
        <GalleryGrid renders={renders} onDelete={handleDelete} />
      )}
    </div>
  );
}
