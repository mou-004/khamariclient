import { useMemo, useState } from 'react';
import { CalendarDays, Eye, EyeOff, Gavel, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { taka } from '../utils/portal.js';
import { api, useApi } from '../api.js';
import { PortalShell, StatCard, Table, PageCard, StatusBadge, Loading, ErrorBox, Modal, Tabs } from '../components/PortalUI.jsx';

export default function SellerProductsPage({ shell, navigate, notify, user }) {
  const { data, loading, error, reload } = useApi('/seller/products');
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [auction, setAuction] = useState(null);
  const [discountProduct, setDiscountProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockValue, setStockValue] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountEndsAt, setDiscountEndsAt] = useState('');
  const [busy, setBusy] = useState(false);
  const waiting = user?.role === 'seller_pending';
  const items = data?.items || [];
  const count = (s) => items.filter((p) => p.status === s).length;
  const list = useMemo(() => items.filter((p) => (tab === 'all' || (tab === 'preorders' ? p.listingType === 'preorder' : p.status === tab)) && p.name.toLowerCase().includes(search.toLowerCase())), [items, tab, search]);

  const run = async (fn, ok) => { try { setBusy(true); const r = await fn(); notify(ok || r?.message || 'Done.'); reload(); } catch (e) { notify(e.message); } finally { setBusy(false); } };
  const toggle = (p) => run(() => api(`/products/${p.id}/status`, { method: 'PATCH', body: { status: p.status === 'active' ? 'paused' : 'active' } }));
  const remove = (p) => { if (window.confirm(`Delete “${p.name}”? This cannot be undone.`)) run(() => api(`/products/${p.id}`, { method: 'DELETE' })); };
  const openStock = (product) => {
    setStockProduct(product);
    setStockValue(String(product.stock ?? 0));
  };
  const saveStock = async (e) => {
    e.preventDefault();
    const stock = Number(stockValue);
    if (!Number.isInteger(stock) || stock < 0) return notify('Enter a valid whole-number stock quantity.');
    await run(() => api(`/products/${stockProduct.id}/stock`, { method: 'PATCH', body: { stock } }).then((r) => { setStockProduct(null); return r; }));
  };

  const openDiscount = (product) => {
    setDiscountProduct(product);
    setDiscountPercent(String(product.discountPercent || ''));
    setDiscountEndsAt(product.discountEndsAt ? String(product.discountEndsAt).slice(0, 10) : '');
  };
  const saveDiscount = async (e) => {
    e.preventDefault();
    await run(() => api(`/products/${discountProduct.id}/discount`, { method: 'PATCH', body: { discountPercent: Number(discountPercent || 0), discountEndsAt } }).then((r) => { setDiscountProduct(null); return r; }));
  };

  const startAuction = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    run(() => api(`/seller/products/${auction.id}/auction`, { method: 'POST', body: f }).then((r) => { setAuction(null); return r; }));
  };

  return <PortalShell {...shell}>
    <div className="portal-toolbar"><label className="portal-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search my products" /></label><button className="portal-secondary" disabled={waiting} onClick={() => navigate('product-new?type=preorder')}><CalendarDays size={16} /> Add pre-order product</button></div>
    {loading && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
    {data && <>
      <div className="portal-stat-grid">
        <StatCard icon={Package} label="All products" value={items.length} trend="In your store" />
        <StatCard icon={Eye} label="Live" value={count('active')} trend="Visible to customers" tone="green" />
        <StatCard icon={Package} label="Pending review" value={count('pending')} trend="Awaiting approval" tone="amber" />
        <StatCard icon={Package} label="Units in stock" value={items.reduce((n, p) => n + (Number(p.stock) || 0), 0)} trend="Across all products" />
      </div>
      <PageCard title="My products" subtitle="Edit details, pictures, stock and visibility">
        <Tabs value={tab} onChange={setTab} tabs={[['all', 'All', items.length], ['preorders', 'Pre-orders', items.filter((p) => p.listingType === 'preorder').length], ['active', 'Live', count('active')], ['pending', 'Pending', count('pending')], ['paused', 'Hidden', count('paused')], ['rejected', 'Needs changes', count('rejected')]]} />
        <Table headers={['Product', 'Category', 'Price', 'Stock', 'Status', 'Actions']} empty="No products here yet. Use “Add product” to add your first product."
          rows={list.map((p) => ({ key: p.id, cells: [
            <span className="portal-product-cell"><img src={p.image} alt="" /><span><b>{p.name}</b><small className="portal-sub">{[p.listingType === 'preorder' ? `Pre-order · Expected: ${p.preOrderDetails?.harvestDate || 'Not set'} · Closes: ${p.preOrderDetails?.preorderDeadline || 'Not set'}` : p.listingType === 'animal' ? [p.animalDetails?.breed, p.animalDetails?.age].filter(Boolean).join(' · ') : '', `${(p.images || []).length} picture${(p.images || []).length === 1 ? '' : 's'}`, p.status === 'rejected' && p.reviewNote ? p.reviewNote : ''].filter(Boolean).join(' · ')}</small></span></span>,
            p.category, <>{taka(p.discountPercent > 0 && (!p.discountEndsAt || Date.parse(p.discountEndsAt) >= Date.now()) ? Number(p.price) * (1 - Number(p.discountPercent) / 100) : p.price)}{p.discountPercent > 0 && (!p.discountEndsAt || Date.parse(p.discountEndsAt) >= Date.now()) ? <small className="portal-sub"><del>{taka(p.price)}</del> · {p.discountPercent}% OFF</small> : p.oldPrice ? <small className="portal-sub"><del>{taka(p.oldPrice)}</del></small> : null}</>,
            <span className={Number(p.stock) <= 5 ? 'portal-low' : ''}>{p.stock}</span>, <StatusBadge status={p.status} />,
            <div className="portal-row-actions">
              <button className="portal-row-action" title="Edit" onClick={() => navigate(`product-new?id=${p.id}`)} disabled={waiting}><Pencil size={15} /></button>
              <button className="portal-secondary" style={{padding:'6px 9px',fontSize:12}} title="Update stock" disabled={waiting || busy} onClick={() => openStock(p)}>Stock</button>
              {p.status === 'active' && <button className="portal-secondary" style={{padding:'6px 9px',fontSize:12}} title="Set product discount" disabled={waiting || busy} onClick={() => openDiscount(p)}>Discount</button>}
              {['active', 'paused'].includes(p.status) && <button className="portal-row-action" title={p.status === 'active' ? 'Hide from shop' : 'Show in shop'} disabled={waiting || busy} onClick={() => toggle(p)}>{p.status === 'active' ? <EyeOff size={15} /> : <Eye size={15} />}</button>}
              {p.status === 'active' && <button className="portal-row-action" title="Start an auction" disabled={waiting} onClick={() => setAuction(p)}><Gavel size={15} /></button>}
              {p.status === 'active' && <button className="portal-row-action" title="View in shop" onClick={() => navigate(`product-detail?id=${p.id}`)}><Search size={15} /></button>}
              <button className="portal-row-action" title="Delete" disabled={waiting || busy} onClick={() => remove(p)}><Trash2 size={15} /></button>
            </div>] }))} />
      </PageCard>
    </>}
    {stockProduct && <Modal title={`Update stock · ${stockProduct.name}`} onClose={() => setStockProduct(null)}>
      <form className="portal-form" onSubmit={saveStock}>
        <p className="portal-sub">Update the available quantity. Customer checkout reserves stock on the server and prevents overselling.</p>
        <div className="portal-form-grid">
          <label>Available units<input type="number" min="0" max="1000000" step="1" value={stockValue} onChange={e=>setStockValue(e.target.value)} required /></label>
        </div>
        <p className="portal-note">Current stock: <b>{stockProduct.stock ?? 0}</b> units</p>
        <div className="portal-form-actions">
          <button type="button" className="portal-secondary" onClick={()=>setStockProduct(null)}>Cancel</button>
          <button className="portal-primary" disabled={busy || stockValue === '' || !Number.isInteger(Number(stockValue)) || Number(stockValue)<0}>Save stock</button>
        </div>
      </form>
    </Modal>}
    {discountProduct && <Modal title={`Discount · ${discountProduct.name}`} onClose={() => setDiscountProduct(null)}>
      <form className="portal-form" onSubmit={saveDiscount}>
        <p className="portal-sub">Set a percentage discount for this product. The original price is preserved and the reduced price is calculated by the server at checkout.</p>
        <div className="portal-form-grid">
          <label>Discount percentage (0–90%)<input type="number" min="0" max="90" step="1" value={discountPercent} onChange={e=>setDiscountPercent(e.target.value)} placeholder="e.g. 15" required /></label>
          <label>Offer end date (optional)<input type="date" min={new Date().toISOString().slice(0,10)} value={discountEndsAt} onChange={e=>setDiscountEndsAt(e.target.value)} /></label>
        </div>
        {Number(discountPercent) > 0 && Number(discountPercent) <= 90 && <p className="portal-note">Customer price: <b>{taka(Number(discountProduct.price) * (1 - Number(discountPercent) / 100))}</b> (was {taka(discountProduct.price)})</p>}
        <div className="portal-form-actions">
          <button type="button" className="portal-secondary" onClick={()=>{setDiscountPercent('0');setDiscountEndsAt('');}}>Remove discount</button>
          <button type="button" className="portal-secondary" onClick={()=>setDiscountProduct(null)}>Cancel</button>
          <button className="portal-primary" disabled={busy || discountPercent === '' || Number(discountPercent) < 0 || Number(discountPercent) > 90}>Save discount</button>
        </div>
      </form>
    </Modal>}
    {auction && <Modal title={`Start an auction — ${auction.name}`} onClose={() => setAuction(null)}>
      <form className="portal-form" onSubmit={startAuction}>
        <div className="portal-form-grid">
          <label>Starting bid (BDT)<input name="startingBid" type="number" min="1" defaultValue={auction.price} required /></label>
          <label>Bid increment (BDT)<input name="incrementAmount" type="number" min="1" defaultValue="50" required /></label>
          <label>Duration (days)<select name="durationDays" defaultValue="3">{[1, 2, 3, 5, 7, 14, 30].map((d) => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}</select></label>
          <label>Reserve price (optional, hidden)<input name="reservePrice" type="number" min="1" placeholder="Lowest price you will accept" /></label>
          <label>Buy-now price (optional)<input name="buyNowPrice" type="number" min="1" placeholder="Fixed price" /></label>
        </div>
        <p className="portal-sub">Bidders place a maximum and the system bids for them in steps of your increment. A reserve stays secret: if bidding ends below it, the item is not sold. Buy It Now disappears once bidding starts (or once the reserve is met).</p>
        <div className="portal-form-actions"><button type="button" className="portal-secondary" onClick={() => setAuction(null)}>Cancel</button><button className="portal-primary" disabled={busy}><Gavel size={16} /> Start auction</button></div>
      </form>
    </Modal>}
  </PortalShell>;
}