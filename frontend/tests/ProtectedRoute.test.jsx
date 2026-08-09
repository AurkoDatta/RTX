import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '../src/components/layout/ProtectedRoute.jsx';

const useAuthMock = vi.fn();
vi.mock('../src/hooks/useAuth.js', () => ({
  useAuth: () => useAuthMock(),
}));

function renderAt(path, isAuthenticated) {
  useAuthMock.mockReturnValue({ isAuthenticated });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/secret" element={<div>secret content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('renders the protected content when authenticated', () => {
    renderAt('/secret', true);
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    renderAt('/secret', false);
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });
});
