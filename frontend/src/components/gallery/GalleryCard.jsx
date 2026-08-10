/**
 * One render's thumbnail card. Fetches its image as an authenticated blob
 * (the image endpoint requires a JWT that a plain `<img src>` can't send)
 * and shows viewfinder corner brackets on hover -- the same signature framing
 * used on the live render canvas -- as a deliberate visual echo between the
 * two.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { fetchImageBlobUrl } from '../../services/api.js';
import { Button } from '../common/Button.jsx';

const STATUS_LABELS = {
  completed: 'Complete',
  cancelled: 'Cancelled',
};

export function GalleryCard({ render, onDelete }) {
  const { token } = useAuth();
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (!render.imageUrl) return undefined;
    let objectUrl;
    let cancelled = false;

    fetchImageBlobUrl(render.imageUrl, token)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setImageUrl(url);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [render.imageUrl, token]);

  return (
    <div className="overflow-hidden rounded border border-hairline bg-surface">
      <div className="group relative aspect-4/3 bg-black">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Rendered scene preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-xs text-text-faint">
            {render.imageUrl ? 'Loading…' : 'No image saved'}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-ember" />
          <span className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-ember" />
          <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-ember" />
          <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-ember" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-text-muted">
            {STATUS_LABELS[render.status] ?? render.status} · {render.samplesCompleted} spp
          </p>
          <p className="font-mono text-[11px] text-text-faint">
            {new Date(render.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {render.sceneId && (
            <Link
              to={`/editor?sceneId=${render.sceneId}`}
              className="text-xs text-glass hover:underline"
            >
              Edit scene
            </Link>
          )}
          <Button variant="danger" type="button" onClick={() => onDelete(render.id)}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
