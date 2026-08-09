import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-mono text-sm text-text-faint">404</p>
      <h1 className="font-display text-2xl font-semibold">Nothing rendered here</h1>
      <p className="text-text-muted">This path doesn't lead to a page.</p>
      <Link to="/" className="mt-2 text-glass hover:underline">
        Back to safety
      </Link>
    </div>
  );
}
