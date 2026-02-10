const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'hotel_crm_token';

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export async function apiFetch<T>(path: string, options: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const { auth = true, headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (auth) {
    const token = tokenStorage.get();
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  if (body && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}` , {
    ...rest,
    headers: requestHeaders,
    body,
  });

  const contentType = response.headers.get('content-type') || '';
  let data: unknown = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    let message = response.statusText;
    if (data && typeof data === 'object') {
      const maybe = data as { message?: string; error?: string };
      message = maybe.message || maybe.error || message;
    }
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}
