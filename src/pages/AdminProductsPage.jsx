import { useMemo, useState } from 'react';
import { Check, Download, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { taka } from '../utils/portal.js';
import { api, useApi } from '../api.js';
import { PortalShell, Table, PageCard, StatusBadge, Loading, ErrorBox, Modal, Tabs } from '../components/PortalUI.jsx';

export default function AdminProductsPage({ shell, navigate, notify }) {
  const { data, loading, error, reload } = useApi('/admin/products');
  const sellerFeed = useApi('/admin/users');
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [reject, setReject] = useState(null);
  const [assign, setAssign] = useState(null);
  const [assignSellerId, setAssignSellerId] = useState('');
  const [busy, setBusy] = useState(false);
  const items = data?.items || [];
  const count = (s) => items.filter((p) => p.status === s).length;
  const list = useMemo(() => items.filter((p) => (tab === 'all' || (tab === 'low' ? Number(p.stock) <= 5 && p.status !== 'rejected' : p.status === tab)) && [p.name, p.sellerName, p.category].join(' ').toLowerCase().includes(search.toLowerCase())), [items, tab, search]);
  const run = async (fn) => { try { setBusy(true); const r = await fn(); notify(r.message); reload(); return true; } catch (e) { notify(e.message); return false; } finally { setBusy(false); } };
  const review = (p, status, note = '') => run(() => api(`/admin/products/${p.id}/review`, { method: 'PATCH', body: { status, note } }));
  const remove = (p) => window.confirm(`Delete “${p.name}” permanently?`) && run(() => api(`/products/${p.id}`, { method: 'DELETE' }));
  const submitReject = async (e) => { e.preventDefault(); if (await review(reject, 'rejected', new FormData(e.currentTarget).get('note'))) setReject(null); };
  const submitAssign = async (e) => {
    e.preventDefault();
    if (!assignSellerId) return notify('Choose a seller account.');
    const ok = await run(() => api(`/admin/products/${assign.id}/assign-seller`, { method: 'PATCH', body: { sellerId: assignSellerId } }));
    if (ok) setAssign(null);
  };
  const sellers = (sellerFeed.data?.items || []).filter((u) => ['seller', 'seller_pending'].includes(u.role) && u.status !== 'suspended');

  return <PortalShell {...shell}>
    <div className="portal-toolbar"><label className="portal-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, sellers or departments" /></label><div className="portal-row-actions"><button className="portal-primary" onClick={() => navigate('product-new')}><Plus size={16} /> Add product</button></div></div>
    {loading && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
    {data && <PageCard title="Marketplace products" subtitle="Approve new products, hide or remove products">
      <Tabs value={tab} onChange={setTab} tabs={[['pending', 'Needs review', count('pending')], ['active', 'Live', count('active')], ['paused', 'Hidden', count('paused')], ['rejected', 'Rejected', count('rejected')], ['low', 'Low stock', items.filter((p) => Number(p.stock) <= 5 && p.status !== 'rejected').length], ['all', 'All', items.length]]} />
      <Table headers={['Product', 'Seller', 'Price', 'Stock', 'Status', 'Actions']} empty={tab === 'pending' ? 'Nothing is waiting for review.' : 'No products in this view.'}
        rows={list.map((p) => ({ key: p.id, cells: [
          <span className="portal-product-cell"><img src={p.image} alt="" /><span><b>{p.name}</b><small className="portal-sub">{p.listingType === "preorder" ? `Pre-order · Harvest ${p.preOrderDetails?.harvestDate || "date not set"} · Closes ${p.preOrderDetails?.preorderDeadline || "date not set"}` : p.category} · {(p.images || []).length} picture{(p.images || []).length === 1 ? "" : "s"}</small></span></span>,
          p.sellerName || '—', taka(p.price), <span className={Number(p.stock) <= 5 ? 'portal-low' : ''}>{p.stock}</span>, <StatusBadge status={p.status} />,
          <div className="portal-row-actions">
            <button className="portal-secondary" style={{ padding: '6px 9px', fontSize: 12 }} title="Link or change the product owner" disabled={busy || sellerFeed.loading || !sellers.length} onClick={() => { setAssign(p); setAssignSellerId(sellers.find((seller) => seller.id === p.sellerId || seller.id === p.sellerUid)?.id || sellers[0]?.id || ''); }}>{p.sellerId ? 'Change seller' : 'Link seller'}</button>
            {p.status !== 'active' && <button className="portal-row-action portal-approve" title="Approve & publish" disabled={busy} onClick={() => review(p, 'active')}><Check size={15} /></button>}
            {p.status !== 'rejected' && <button className="portal-row-action" title="Reject with a note" disabled={busy} onClick={() => setReject(p)}><X size={15} /></button>}
            <button className="portal-row-action" title="Edit" onClick={() => navigate(`product-new?id=${p.id}`)}><Pencil size={15} /></button>
            <button className="portal-row-action" title="Delete" disabled={busy} onClick={() => remove(p)}><Trash2 size={15} /></button>
          </div>] }))} />
    </PageCard>}
    {reject && <Modal title={`Reject “${reject.name}”`} onClose={() => setReject(null)}>
      <form className="portal-form" onSubmit={submitReject}><label>Tell the seller what to fix<textarea name="note" placeholder="e.g. Please add a clearer picture and the harvest date." required /></label><div className="portal-form-actions"><button type="button" className="portal-secondary" onClick={() => setReject(null)}>Cancel</button><button className="portal-primary" disabled={busy}>Send & reject</button></div></form>
    </Modal>}
    {assign && <Modal title={`Link “${assign.name}” to a seller`} onClose={() => !busy && setAssign(null)}>
      <form className="portal-form" onSubmit={submitAssign}>
        <p className="portal-sub">Use this only for older products that are not connected to a seller account. The selected seller will own this product and receive future orders.</p>
        <label>Seller account<select value={assignSellerId} onChange={(e) => setAssignSellerId(e.target.value)} required><option value="">Choose seller</option>{sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.storeName || seller.name} · {seller.email} {seller.role === 'seller_pending' ? '(awaiting approval)' : ''}</option>)}</select></label>
        <div className="portal-form-actions"><button type="button" className="portal-secondary" disabled={busy} onClick={() => setAssign(null)}>Cancel</button><button className="portal-primary" disabled={busy || !assignSellerId}>{busy ? 'Linking…' : 'Link product to seller'}</button></div>
      </form>
    </Modal>}
  </PortalShell>;
}