export const AUTH_STORAGE_KEY = "pat-token";

export function getAuthToken() {
  return localStorage.getItem(AUTH_STORAGE_KEY);
}

export function setAuthToken(token) {
  if (token) localStorage.setItem(AUTH_STORAGE_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function authenticatedFetch(input, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAuthToken();

  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(input, { ...options, headers });
  if (response.status === 401) {
    clearAuthToken();
    window.dispatchEvent(new Event("pat-unauthorized"));
  }
  return response;
}
