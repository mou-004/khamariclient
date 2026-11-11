import { useEffect, useState } from 'react';
import { auth } from './firebase';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Calls the Khamari backend with the signed-in user's Firebase ID token.
export async function api(path, { method = 'GET', body, signedIn = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (signedIn) {
    await auth?.authStateReady?.();
    const current = auth?.currentUser;
    if (current) headers.Authorization = `Bearer ${await current.getIdToken()}`;
    else if (signedIn !== 'auto') throw new Error('Please sign in again.'); // 'auto' = public page that adds your sign-in when you have one
  }
  let response;
  try { response = await fetch(`${API_BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined }); }
  catch { throw new Error('Cannot reach the Khamari server. Make sure the backend is running (npm start in the project folder).'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || `Request failed (${response.status})`), { status: response.status });
  return data;
}

// Loads data for a page: const { data, loading, error, reload } = useApi('/seller/overview')
// { auto: true }  public page that adds your sign-in when you have one.   { poll: 5000 }  quietly refresh every 5 seconds.
export function useApi(path, { auto = false, poll = 0 } = {}) {
  const [state, setState] = useState({ data: null, loading: Boolean(path), error: '' });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: s.data == null || s.path !== path, error: '', path }));
    const load = (quiet) => api(path, { signedIn: auto ? 'auto' : true })
      .then((data) => !cancelled && setState({ data, loading: false, error: '', path }))
      .catch((e) => !cancelled && !quiet && setState({ data: null, loading: false, error: e.message, path }));
    load(false);
    const timer = poll ? window.setInterval(() => { if (!document.hidden) load(true); }, poll) : null;
    return () => { cancelled = true; if (timer) window.clearInterval(timer); };
  }, [path, tick, auto, poll]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

// Photos uploaded through the API are served from the backend origin.
export const assetUrl = (url) => (typeof url === 'string' && url.startsWith('/') ? `${API_BASE.replace(/\/api$/, '')}${url}` : url);
export async function uploadEvidenceImage(file) {
  const dataUrl = await compressImage(file);
  const { url } = await api('/refunds/evidence', { method: 'POST', body: { dataUrl } });
  return url;
}

// Shrinks a photo in the browser so it uploads quickly and fits the database limit.
export function compressImage(file, maxSide = 1100) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { reject(new Error('Choose a JPG, PNG or WebP picture.')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This picture could not be read.')); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      let side = maxSide, quality = 0.85, dataUrl = '';
      for (let i = 0; i < 8; i += 1) {
        const scale = Math.min(1, side / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length < 800000) break;
        quality = Math.max(0.5, quality - 0.1); side = Math.round(side * 0.85);
      }
      dataUrl.length < 880000 ? resolve(dataUrl) : reject(new Error('This picture is too large. Try a smaller one.'));
    };
    img.src = url;
  });
}
export async function uploadProductImage(file) {
  const dataUrl = await compressImage(file);
  const { url } = await api('/uploads/image', { method: 'POST', body: { dataUrl } });
  return url.startsWith('/') ? `${API_BASE.replace(/\/api$/, '')}${url}` : url;
}

export const dateText = (value) => (value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const dateTimeText = (value) => (value ? new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');