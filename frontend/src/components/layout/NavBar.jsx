/**
 * Top navigation bar. Shows the wordmark always; the signed-in identity,
 * page links, and sign-out control only once authenticated.
 */
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

export function NavBar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    logout();
    navigate('/login');
  }

  return (
    <header className="border-b border-hairline bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-lg font-semibold tracking-wide">
          RTX<span className="text-ember">.</span>
        </Link>

        {isAuthenticated && (
          <div className="flex items-center gap-4">
            <Link to="/editor" className="text-sm text-text-muted transition hover:text-text-primary">
              Scene Editor
            </Link>
            <Link to="/gallery" className="text-sm text-text-muted transition hover:text-text-primary">
              Gallery
            </Link>
            <span className="font-mono text-xs text-text-faint">{user?.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded border border-hairline px-3 py-1.5 text-sm text-text-muted transition hover:border-ember hover:text-ember"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
