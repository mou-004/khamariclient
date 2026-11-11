import { useEffect, useState } from 'react';
import { CalendarDays, PawPrint, Plus, Save, ShieldCheck } from 'lucide-react';
import { api } from '../api.js';
import { PortalShell, PageCard, Loading } from '../components/PortalUI.jsx';
import ImageUploader from '../components/ImageUploader.jsx';

const blank = { listingType: 'product', name: '', category: '', subcategory: '', price: '', oldPrice: '', unit: '1 kg', stock: '10', description: '', images: [], breed: '', age: '', sex: '', health: '', vaccination: '', harvestDate: '', preorderDeadline: '', preorderNote: '' };
const editId = () => new URLSearchParams(window.location.hash.split('?')[1] || '').get('id') || '';

// Add a new product, or edit an existing one when the link contains ?id=...
export default function ProductNewPage({ shell, navigate, notify, categories, user }) {
  const id = editId();
  // API category records can contain duplicate names; keep one option per department.
  // Merge subcategories from duplicate records so no valid subcategory is lost.
  const list = [...categories.reduce((map, category) => {
    if (!category?.name || category.name.trim().toLowerCase() === 'all products') return map;
    const name = category.name.trim();
    const key = name.toLowerCase();
    const existing = map.get(key);
    const mergedSubcategories = [
      ...(existing?.subcategories || []),
      ...(Array.isArray(category.subcategories) ? category.subcategories : [])
    ].filter((sub) => typeof sub === 'string' && sub.trim());
    // Keep every supplied subcategory option; only department names are deduplicated.
    const subcategories = mergedSubcategories.map((sub) => sub.trim());
    map.set(key, { ...(existing || category), ...category, name: existing?.name || name, subcategories });
    return map;
  }, new Map()).values()];
  const [form, setForm] = useState({ ...blank, listingType: new URLSearchParams(window.location.hash.split('?')[1] || '').get('type') === 'preorder' ? 'preorder' : 'product', category: list[0]?.name || '', subcategory: list[0]?.subcategories?.[0] || '' });
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const waiting = user?.role === 'seller_pending';
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const subs = list.find((c) => c.name === form.category)?.subcategories || [];

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api(`/products/${id}`).then(({ item: p }) => setForm({ ...blank, ...p, price: p.price ?? '', oldPrice: p.oldPrice ?? '', stock: p.stock ?? 0, images: p.images?.length ? p.images : [p.image].filter(Boolean), ...(p.animalDetails || {}), harvestDate: p.preOrderDetails?.harvestDate || '', preorderDeadline: p.preOrderDetails?.preorderDeadline || '', preorderNote: p.preOrderDetails?.note || '' }))
      .catch((e) => notify(e.message)).finally(() => setLoading(false));
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.images.length) { notify('Add at least one product picture.'); return; }
    const body = {
      ...form,
      animalDetails: form.listingType === 'animal' ? { breed: form.breed, age: form.age, sex: form.sex, health: form.health, vaccination: form.vaccination } : undefined,
      preOrderDetails: form.listingType === 'preorder' ? { harvestDate: form.harvestDate, preorderDeadline: form.preorderDeadline, note: form.preorderNote } : undefined
    };
    try {
      setSaving(true);
      const r = await api(id ? `/products/${id}` : '/products', { method: id ? 'PUT' : 'POST', body });
      notify(r.message); navigate('seller-products');
    } catch (err) { notify(err.message); } finally { setSaving(false); }
  };

  return <PortalShell {...shell}>
    {loading ? <Loading /> : <PageCard title={id ? 'Edit product' : 'Product information'} subtitle={form.listingType === "preorder" ? "Add the product, available reservation quantity and harvest schedule. It appears publicly after administrator approval." : "Use clear pictures, honest details and accurate prices. New products go live after an administrator approves them."}>
      <form className="portal-form product-create-form" onSubmit={submit}>
        <label className="portal-field-wide">Product pictures <small>(up to 8)</small></label>
        <ImageUploader images={form.images} onChange={(images) => setForm((f) => ({ ...f, images }))} onError={notify} />
        <div className="portal-form-grid">
          <label>What are you adding?<select value={form.listingType} onChange={set('listingType')}><option value="product">Farm goods and supplies</option><option value="animal">Livestock and pets</option><option value="preorder">Pre-order (upcoming harvest)</option></select></label>
          <label>Product or animal name<input value={form.name} onChange={set('name')} placeholder="e.g. Fresh tomatoes or Sahiwal cow" required /></label>
          <label>Department<select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, subcategory: list.find((c) => c.name === e.target.value)?.subcategories?.[0] || '' }))}>{list.map((c) => <option key={c.name}>{c.name}</option>)}{form.category && !list.some((c) => c.name === form.category) && <option>{form.category}</option>}</select></label>
          <label>Subcategory<select value={form.subcategory} onChange={set('subcategory')}>{subs.map((s) => <option key={s}>{s}</option>)}{form.subcategory && !subs.includes(form.subcategory) && <option>{form.subcategory}</option>}{!subs.length && !form.subcategory && <option value="">—</option>}</select></label>
          <label>Selling price (BDT)<input type="number" min="1" value={form.price} onChange={set('price')} placeholder="e.g. 850" required /></label>
          <label>Original price (optional)<input type="number" min="1" value={form.oldPrice} onChange={set('oldPrice')} placeholder="Shows a discount badge" /></label>
          <label>Unit / selling basis<input value={form.unit} onChange={set('unit')} placeholder="1 kg, 1 bag, per animal" /></label>
          <label>{form.listingType === "preorder" ? "Available pre-order quantity" : "Stock / quantity"}<input type="number" min="0" value={form.stock} onChange={set('stock')} /></label>
        </div>
         {form.listingType === 'preorder' && <div className="portal-form-subsection"><h3><CalendarDays size={17} /> Pre-order schedule</h3><div className="portal-form-grid">
          <label>Expected harvest / availability date<input type="date" value={form.harvestDate} onChange={set('harvestDate')} required /></label>
          <label>Last date to accept pre-orders<input type="date" value={form.preorderDeadline} onChange={set('preorderDeadline')} required /></label>
          <label className="portal-field-wide">Pre-order information<textarea value={form.preorderNote} onChange={set('preorderNote')} placeholder="Explain when the product will be ready, quantity limits and delivery arrangements." /></label>
        </div><p className="portal-note">Customers can reserve this product before it is harvested or available. Be realistic about dates and quantities.</p></div>}
        {form.listingType === 'animal' && <div className="portal-form-subsection"><h3><PawPrint size={17} /> Animal information</h3><div className="portal-form-grid">
          <label>Breed<input value={form.breed} onChange={set('breed')} placeholder="e.g. Black Bengal" /></label><label>Age<input value={form.age} onChange={set('age')} placeholder="e.g. 8 months" /></label>
          <label>Sex<input value={form.sex} onChange={set('sex')} placeholder="Male / female / pair" /></label><label>Health information<input value={form.health} onChange={set('health')} placeholder="Describe records accurately" /></label>
          <label>Vaccination / care records<input value={form.vaccination} onChange={set('vaccination')} placeholder="Only what you can show" /></label></div>
          <p className="portal-note"><ShieldCheck size={15} /> Do not claim veterinary checks or vaccination unless records are available.</p></div>}
        <label>Product description<textarea value={form.description} onChange={set('description')} placeholder="Describe origin, size, quality, harvest date or animal care information." /></label>
        <div className="portal-form-actions"><button type="button" className="portal-secondary" onClick={() => navigate('seller-products')}>Cancel</button><button className="portal-primary" type="submit" disabled={saving || waiting}>{id ? <Save size={16} /> : <Plus size={16} />} {saving ? 'Saving…' : id ? 'Save changes' : form.listingType === 'preorder' ? 'Submit pre-order for review' : 'Submit for review'}</button></div>
        {waiting && <p className="portal-note"><ShieldCheck size={15} /> You can add products as soon as your seller account is approved.</p>}
      </form>
    </PageCard>}
  </PortalShell>;
}