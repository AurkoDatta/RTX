/**
 * Authentication state shared across the app: the current user and JWT,
 * persisted to localStorage so a page refresh doesn't sign the user out.
 * Wraps the auth API calls so components never touch localStorage or the
 * token directly -- they call `login`/`register`/`logout` and read `user`.
 */
import { createContext, useCallback, useEffect, useState } from 'react';
import { login as loginRequest, register as registerRequest } from '../services/authApi.js';

const STORAGE_KEY = 'rtx.auth';

export const AuthContext = createContext(null);

function loadStoredAuth() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStoredAuth);

  useEffect(() => {
    if (auth) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  const login = useCallback(async (credentials) => {
    const result = await loginRequest(credentials);
    setAuth(result);
    return result;
  }, []);

  const register = useCallback(async (details) => {
    const result = await registerRequest(details);
    setAuth(result);
    return result;
  }, []);

  const logout = useCallback(() => setAuth(null), []);

  const value = {
    user: auth?.user ?? null,
    token: auth?.token ?? null,
    isAuthenticated: Boolean(auth?.token),
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
