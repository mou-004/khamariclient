import { useEffect, useState } from 'react';
import { api } from './api.js';
import { auth } from './firebase';

// One shared notification store for the whole site. It checks the backend every 8 seconds,
// again when you return to the tab, and tells every bell on screen what changed.
let state = { uid: null, signedIn: false, items: [], unread: 0, loaded: false, fresh: null };
let seen = new Set();
let timer = null;
let inflight = null;
const subscribers = new Set();
const emit = () => subscribers.forEach((fn) => fn({ ...state }));

export async function refreshNotifications() {
  if (inflight) return inflight;
  inflight = (async () => {
    await auth?.authStateReady?.();
    const uid = auth?.currentUser?.uid || null;
    if (!uid) { state = { uid: null, signedIn: false, items: [], unread: 0, loaded: true, fresh: null }; seen = new Set(); emit(); return; }
    if (uid !== state.uid) { seen = new Set(); state = { uid, signedIn: true, items: [], unread: 0, loaded: false, fresh: null }; }
    try {
      const data = await api('/notifications?limit=10');
      let fresh = state.fresh;
      if (state.loaded) { const added = data.items.filter((n) => !n.read && !seen.has(n.id)); if (added.length) fresh = added[0]; }   // pop-up only for things that arrived while you were here
      data.items.forEach((n) => seen.add(n.id));
      state = { uid, signedIn: true, items: data.items, unread: data.unread, loaded: true, fresh };
    } catch { state = { ...state, signedIn: true, loaded: true }; }
    emit();
  })().finally(() => { inflight = null; });
  return inflight;
}
const onWake = () => { if (!document.hidden) refreshNotifications(); };
function start() {
  if (timer) return;
  timer = window.setInterval(onWake, 8000);
  window.addEventListener('focus', onWake); document.addEventListener('visibilitychange', onWake);
}
function stop() { window.clearInterval(timer); timer = null; window.removeEventListener('focus', onWake); document.removeEventListener('visibilitychange', onWake); }

export async function markRead(ids) {
  const set = ids ? new Set(ids) : null;
  const flip = state.items.filter((n) => !n.read && (!set || set.has(n.id))).length;
  state = { ...state, items: state.items.map((n) => (!set || set.has(n.id) ? { ...n, read: true } : n)), unread: Math.max(0, state.unread - flip) }; emit();
  try { await api('/notifications/read', { method: 'POST', body: ids ? { ids } : {} }); } catch { /* the next refresh corrects it */ }
}
export const markAllRead = () => markRead(null);
export function dismissFresh() { state = { ...state, fresh: null }; emit(); }

export function useNotifications() {
  const [snap, setSnap] = useState({ ...state });
  useEffect(() => { subscribers.add(setSnap); start(); refreshNotifications(); return () => { subscribers.delete(setSnap); if (!subscribers.size) stop(); }; }, []);
  return { ...snap, refresh: refreshNotifications, markRead, markAllRead, dismissFresh };
}

export const timeAgo = (value) => {
  const mins = Math.round((Date.now() - Date.parse(value)) / 60000);
  if (!Number.isFinite(mins)) return '';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  if (mins < 2880) return 'yesterday';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};