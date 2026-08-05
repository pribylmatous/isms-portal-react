// Klient ISMS API. Adresa se dá přepsat přes VITE_API_URL (.env).

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function request(path, options = {}) {
  // FormData (upload souboru) si hlavičku Content-Type s boundary nastaví
  // sama — vlastní JSON hlavička by ji přepsala a request by se rozbil.
  const isFormData = options.body instanceof FormData;
  let res;
  try {
    res = await fetch(BASE + path, {
      credentials: 'include',
      ...options,
      headers: isFormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('API server není dostupný (' + BASE + ')');
  }
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      message = (await res.json()).error ?? message;
    } catch {
      // tělo není JSON — ponecháme HTTP status
    }
    throw new Error(message);
  }
  return res.status === 204 ? null : res.json();
}

const encode = (body) => (body instanceof FormData ? body : JSON.stringify(body));

export const get = (path) => request(path);
export const post = (path, body) => request(path, { method: 'POST', body: encode(body) });
export const put = (path, body) => request(path, { method: 'PUT', body: encode(body) });
export const del = (path) => request(path, { method: 'DELETE' });

export const apiUrl = (path) => BASE + path;
