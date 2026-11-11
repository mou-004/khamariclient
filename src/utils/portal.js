export const taka = (n) => `৳${Number(n || 0).toLocaleString('en-BD')}`;
export const readStore = (key, fallback) => {
  try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; }
};
export const saveStore = (key, value) => window.localStorage.setItem(key, JSON.stringify(value));
