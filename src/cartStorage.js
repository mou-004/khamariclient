// Account-scoped browser basket storage. A role is part of the key so a single
// Firebase account used under different roles never reuses another role's basket.
export const cartStorageKey = (user) => {
  if (!user) return 'khamari-cart:guest';
  const role = String(user.role || 'customer').toLowerCase();
  const identity = String(user.uid || user.id || user.email || 'account').toLowerCase();
  return `khamari-cart:${role}:${identity}`;
};

export const readCart = (key, storage = globalThis.localStorage) => {
  try {
    if (!storage) return [];
    const saved = JSON.parse(storage.getItem(key) || '[]');
    const lines = Array.isArray(saved) ? saved : Array.isArray(saved?.items) ? saved.items : [];
    return lines
      .filter(item => item && item.id != null && Number(item.quantity) > 0 && Number.isFinite(Number(item.price)))
      .map(item => ({ ...item, quantity: Number(item.quantity), price: Number(item.price) }));
  } catch {
    return [];
  }
};

export const writeCart = (key, cart, storage = globalThis.localStorage) => {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(cart));
};
