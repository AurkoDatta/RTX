/**
 * Registration form. Validates the password confirmation client-side before
 * calling the API; server-side validation (email format, password length,
 * duplicate email) still applies and its message is surfaced on failure.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { ApiError } from '../services/api.js';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register({ name, email, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded border border-hairline bg-surface p-8">
        <h1 className="font-display text-2xl font-semibold">Create an account</h1>
        <p className="mt-1 text-sm text-text-muted">Save scenes and revisit past renders.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="block text-xs uppercase tracking-wide text-text-muted">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-hairline bg-surface-raised px-3 py-2 text-text-primary outline-none focus:border-ember"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs uppercase tracking-wide text-text-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-hairline bg-surface-raised px-3 py-2 text-text-primary outline-none focus:border-ember"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-xs uppercase tracking-wide text-text-muted"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-hairline bg-surface-raised px-3 py-2 text-text-primary outline-none focus:border-ember"
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs uppercase tracking-wide text-text-muted"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded border border-hairline bg-surface-raised px-3 py-2 text-text-primary outline-none focus:border-ember"
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-ember px-4 py-2 font-medium text-void transition hover:bg-ember-dim disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-glass hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
