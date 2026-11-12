const BASE = import.meta.env.VITE_API_URL || '';
export const getSession = () => { try { return JSON.parse(localStorage.getItem('fs_session')); } catch { return null; } };

async function req(method, path, body) {
  const token = getSession()?.token;
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Error de servidor'), { status: res.status, data });
  return data;
}
export const api = { get: (p) => req('GET', p), post: (p, b = {}) => req('POST', p, b) };

export async function download(path, filename) {
  const res = await fetch(`${BASE}/api${path}`, { headers: { Authorization: `Bearer ${getSession()?.token}` } });
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
