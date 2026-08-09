/**
 * Minimal authenticated landing screen. Points to the scene editor; the
 * gallery gets a link here too once that route exists (phase o).
 */
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-text-faint">Signed in</p>
      <h1 className="font-display text-2xl font-semibold">Welcome back, {user?.name}.</h1>
      <p className="max-w-sm text-text-muted">Build a scene, then watch it render live.</p>
      <Link
        to="/editor"
        className="mt-2 rounded bg-ember px-4 py-2 font-medium text-void transition hover:bg-ember-dim"
      >
        Open the scene editor
      </Link>
    </div>
  );
}
