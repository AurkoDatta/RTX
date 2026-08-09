import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { useAuth } from '../src/hooks/useAuth.js';

vi.mock('../src/services/authApi.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
}));

import { login as loginMock, register as registerMock } from '../src/services/authApi.js';

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="email">{auth.user?.email ?? ''}</span>
      <button onClick={() => auth.login({ email: 'a@example.com', password: 'x' })}>
        login
      </button>
      <button onClick={() => auth.register({ name: 'A', email: 'a@example.com', password: 'x' })}>
        register
      </button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts unauthenticated with no stored session', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('becomes authenticated after login and persists to localStorage', async () => {
    loginMock.mockResolvedValue({ user: { id: 1, email: 'a@example.com' }, token: 'tok123' });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });
    expect(screen.getByTestId('email').textContent).toBe('a@example.com');
    expect(JSON.parse(window.localStorage.getItem('rtx.auth')).token).toBe('tok123');
  });

  it('restores a session already in localStorage on mount', () => {
    window.localStorage.setItem(
      'rtx.auth',
      JSON.stringify({ user: { id: 2, email: 'stored@example.com' }, token: 'stored-token' })
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('email').textContent).toBe('stored@example.com');
  });

  it('clears the session and localStorage on logout', async () => {
    loginMock.mockResolvedValue({ user: { id: 1, email: 'a@example.com' }, token: 'tok123' });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('login').click();
    });
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'));

    await act(async () => {
      screen.getByText('logout').click();
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(window.localStorage.getItem('rtx.auth')).toBeNull();
  });

  it('propagates errors from the register call without changing auth state', async () => {
    registerMock.mockRejectedValue(new Error('email taken'));
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await expect(
      act(() => result.current.register({ name: 'A', email: 'a@example.com', password: 'x' }))
    ).rejects.toThrow('email taken');

    expect(result.current.isAuthenticated).toBe(false);
  });
});
