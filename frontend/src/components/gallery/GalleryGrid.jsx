import { GalleryCard } from './GalleryCard.jsx';

export function GalleryGrid({ renders, onDelete }) {
  if (renders.length === 0) {
    return (
      <p className="rounded border border-dashed border-hairline p-10 text-center text-sm text-text-muted">
        No renders yet. Start one from the scene editor.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {renders.map((render) => (
        <GalleryCard key={render.id} render={render} onDelete={onDelete} />
      ))}
    </div>
  );
}
