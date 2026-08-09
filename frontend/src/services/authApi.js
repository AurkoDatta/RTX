import { apiFetch } from './api.js';

export function register({ name, email, password }) {
  return apiFetch('/api/auth/register', { method: 'POST', body: { name, email, password } });
}

export function login({ email, password }) {
  return apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
}
