const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'sitesentinel_dev_api_key_123';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorBody.message || errorBody.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}
