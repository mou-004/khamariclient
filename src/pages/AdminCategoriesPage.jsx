import { useState } from 'react';
import { Boxes, Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { categories as defaults } from '../data';
import { api, useApi } from '../api.js';
import { PortalShell, PageCard, Loading, ErrorBox, Modal, Badge } from '../components/PortalUI.jsx';

export default function AdminCategoriesPage({ shell, notify, onCategoriesChanged }) {
  const { data, loading, error, reload } = useApi('/admin/categories');
  const [edit, setEdit] = useState(null); // {} = new, {id,...} = existing
  const [busy, setBusy] = useState(false);
  const run = async (fn) => { try { setBusy(true); const r = await fn(); notify(r.message); reload(); onCategoriesChanged?.(); return true; } catch (e) { notify(e.message); return false; } finally { setBusy(false); } };
  const save = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (await run(() => api(edit.id ? `/admin/categories/${edit.id}` : '/admin/categories', { method: edit.id ? 'PUT' : 'POST', body: f }))) setEdit(null);
  };
  const items = data?.items || [];
  return <PortalShell {...shell}>
    <div className="portal-toolbar"><span /><div className="portal-row-actions"><button className="portal-secondary" disabled={busy} onClick={() => run(() => api('/admin/categories/import', { method: 'POST', body: { categories: defaults } }))}><Download size={15} /> Import default departments</button><button className="portal-primary" onClick={() => setEdit({})}><Plus size={16} /> Add category</button></div></div>
    {loading && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
    {data && <PageCard title="Departments" subtitle="These appear in the shop menu, filters and the seller product form. Until you add one, the default departments are used.">
      <div className="portal-category-manage-grid">{items.map((c) => <div key={c.id}><span><Boxes size={17} /></span><b>{c.name}</b><small>{c.subcategories?.length || 0} subcategories{c.status === 'hidden' ? ' · hidden' : ''}</small><div className="portal-row-actions"><button className="portal-row-action" title="Edit" onClick={() => setEdit(c)}><Pencil size={15} /></button><button className="portal-row-action" title="Delete" onClick={() => window.confirm(`Delete “${c.name}”?`) && run(() => api(`/admin/categories/${c.id}`, { method: 'DELETE' }))}><Trash2 size={15} /></button></div></div>)}{!items.length && <p className="portal-empty-note">No custom departments yet — the shop is showing the defaults. Click “Import default departments” to start managing them here.</p>}</div>
    </PageCard>}
    {edit && <Modal title={edit.id ? `Edit ${edit.name}` : 'Add a category'} onClose={() => setEdit(null)}>
      <form className="portal-form" onSubmit={save}>
        <label>Name<input name="name" defaultValue={edit.name || ''} required /></label>
        <label>Subcategories <small>(comma separated)</small><input name="subcategories" defaultValue={(edit.subcategories || []).join(', ')} placeholder="Leafy greens, Root vegetables" /></label>
        <label>Picture link (optional)<input name="image" defaultValue={edit.image || ''} placeholder="https://…" /></label>
        <div className="portal-form-grid"><label>Display order<input name="order" type="number" defaultValue={edit.order ?? 0} /></label><label>Visibility<select name="status" defaultValue={edit.status || 'active'}><option value="active">Shown in shop</option><option value="hidden">Hidden</option></select></label></div>
        <div className="portal-form-actions"><button type="button" className="portal-secondary" onClick={() => setEdit(null)}>Cancel</button><button className="portal-primary" disabled={busy}>Save category</button></div>
      </form>
    </Modal>}
  </PortalShell>;
}