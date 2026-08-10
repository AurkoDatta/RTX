/**
 * Thin fetch wrapper: resolves paths against the API base URL, attaches a
 * JWT as a Bearer token when one is passed, and normalizes error responses
 * into a single thrown `ApiError` -- callers never need to branch on
 * `res.ok` or unwrap the backend's `{ error: { code, message } }` shape.
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content has nothing to parse.
  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const code = data?.error?.code ?? 'UNKNOWN_ERROR';
    const message = data?.error?.message ?? `Request failed with status ${res.status}`;
    throw new ApiError(res.status, code, message);
  }

  return data;
}

/**
 * Fetches an image endpoint that requires auth (e.g. a render's PNG) and
 * returns a local blob URL for it. A plain `<img src>` can't attach an
 * Authorization header, so authenticated images have to be fetched as data
 * and handed to the `<img>` this way instead. Callers must revoke the
 * returned URL (`URL.revokeObjectURL`) when it's no longer displayed.
 */
export async function fetchImageBlobUrl(path, token) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'IMAGE_FETCH_FAILED', 'Could not load the image');
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
