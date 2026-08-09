import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

/** Reads the shared auth state/actions. Must be used within `<AuthProvider>`. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
