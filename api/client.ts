import { ApiError, NetworkError } from '@/api/errors';
import { previewRequest } from '@/api/previewData';
import { authService } from '@/lib/authService';
import { env } from '@/lib/env';
import { isPreview } from '@/lib/preview';

export { ApiError, NetworkError } from '@/api/errors';

/** The only way the app talks to anything: the Duo-Face API with the Firebase ID token. Never Firestore. */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Development UI preview only (lib/preview.ts): sample data, no network, off in production builds.
  if (isPreview) return previewRequest<T>(path, init);

  const token = await authService.getIdToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, { ...init, headers });
  } catch {
    throw new NetworkError();
  }

  let body: unknown = null;
  if (response.status !== 204) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const parsed = body as { message?: string; error?: string } | null;
    throw new ApiError(response.status, parsed?.message ?? `Request failed with status ${response.status}`, parsed?.error);
  }

  return body as T;
}
