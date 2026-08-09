/**
 * Minimal authenticated landing screen. Placeholder until the scene editor
 * (phase m) and gallery (phase o) routes exist to link to directly.
 */
import { useAuth } from '../hooks/useAuth.js';

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center gap-2 px-4 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-text-faint">Signed in</p>
      <h1 className="font-display text-2xl font-semibold">Welcome back, {user?.name}.</h1>
      <p className="max-w-sm text-text-muted">
        The scene editor and render gallery are still warming up.
      </p>
    </div>
  );
}
