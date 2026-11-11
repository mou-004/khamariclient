// Products are unique by Firestore document ID. Two sellers may legitimately
// offer the same product name, so never dedupe products by name.
export const uniqueCatalogProducts = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const id = String(item?.id || '').trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

// Admins may have created duplicate department documents or subcategory labels.
// Merge them for navigation, preserving all distinct subcategories.
export function uniqueCatalogCategories(categories = []) {
  const seen = new Map();
  for (const cat of categories) {
    const name = String(cat?.name || '').trim().replace(/\s+/g, ' ');
    const key = name.toLocaleLowerCase('en');
    if (!name || key === 'all products') continue;
    const current = seen.get(key);
    if (!current) seen.set(key, { ...cat, name, subcategories: [] });
    const stored = seen.get(key);
    for (const value of Array.isArray(cat.subcategories) ? cat.subcategories : []) {
      const sub = String(value || '').trim().replace(/\s+/g, ' ');
      if (sub && !stored.subcategories.some((entry) => entry.toLocaleLowerCase('en') === sub.toLocaleLowerCase('en'))) stored.subcategories.push(sub);
    }
  }
  return [...seen.values()];
}
