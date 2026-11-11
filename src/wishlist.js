import { useEffect, useState } from 'react';
import { api } from './api.js';
import { auth } from './firebase';

// Saved items live in Firestore (per account). This small store keeps every heart button on screen in sync.
let state = { uid: null, ids: [], loaded: false };
let inflight = null;
const subscribers = new Set();
const emit = () => subscribers.forEach((fn) => fn({ ...state }));

async function load() {
  if (inflight) return inflight;
  inflight = (async () => {
    await auth?.authStateReady?.();
    const uid = auth?.currentUser?.uid || null;
    if (uid !== state.uid) state = { uid, ids: [], loaded: false };
    if (!uid) state = { uid: null, ids: [], loaded: true };
    else if (!state.loaded) { try { state = { uid, ids: (await api('/wishlist')).ids, loaded: true }; } catch { state = { uid, ids: [], loaded: true }; } }
    emit();
  })().finally(() => { inflight = null; });
  return inflight;
}
export function resetWishlist() { state = { uid: null, ids: [], loaded: false }; emit(); }

// Saves or removes a product. Throws an error with status 401 when the visitor is not signed in.
export async function toggleSaved(productId) {
  await load();
  if (!state.uid) throw Object.assign(new Error('Sign in to save products.'), { status: 401 });
  const had = state.ids.includes(productId);
  const flip = (list, add) => (add ? [...new Set([...list, productId])] : list.filter((id) => id !== productId));
  state = { ...state, ids: flip(state.ids, !had) }; emit();
  try { state = { ...state, ids: (await api(`/wishlist/${encodeURIComponent(productId)}`, { method: had ? 'DELETE' : 'POST' })).ids }; emit(); }
  catch (error) { state = { ...state, ids: flip(state.ids, had) }; emit(); throw error; }
  return !had;
}

export function useWishlist() {
  const [snap, setSnap] = useState({ ...state });
  useEffect(() => { subscribers.add(setSnap); load(); return () => { subscribers.delete(setSnap); }; }, []);
  return { ids: snap.ids, has: (id) => snap.ids.includes(id), loaded: snap.loaded };
}