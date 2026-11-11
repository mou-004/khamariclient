import { useMemo, useState } from 'react';
import { CalendarDays, Percent, Tag, Trash2 } from 'lucide-react';
import { api, useApi, dateText } from '../api.js';
import { taka } from '../utils/portal.js';
import { PortalShell, PageCard, StatCard, Table, Loading, ErrorBox, Modal, EmptyState } from '../components/PortalUI.jsx';

export default function SellerDiscountsPage({ shell, notify, user }) {
  const { data, loading, error, reload } = useApi('/seller/products', { poll: 15000 });
  const [selected, setSelected] = useState(null);
  const [percent, setPercent] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const waiting = user?.role === 'seller_pending';
  const products = data?.items || [];
  const liveProducts = useMemo(() => products.filter((p) => p.status === 'active'), [products]);
  const discounted = liveProducts.filter((p) => Number(p.discountPercent || 0) > 0 && (!p.discountEndsAt || Date.parse(p.discountEndsAt) >= Date.now()));
  const visible = liveProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const open = (product) => {
    setSelected(product);
    setPercent(String(product.discountPercent || ''));
    setEndDate(product.discountEndsAt ? String(product.discountEndsAt).slice(0, 10) : '');
  };

  const save = async (event) => {
    event.preventDefault();
    if (!selected) return;
    const value = Number(percent);
    if (!Number.isInteger(value) || value < 0 || value > 90) {
      notify('Enter a whole-number discount between 0% and 90%.');
      return;
    }
    try {
      setBusy(true);
      const result = await api(`/products/${selected.id}/discount`, {
        method: 'PATCH',
        body: { discountPercent: value, discountEndsAt: endDate }
      });
      notify(result.message || 'Product discount saved.');
      setSelected(null);
      reload();
    } catch (err) {
      notify(err.message || 'Could not save this discount.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Remove the discount from “${product.name}”?`)) return;
    try {
      setBusy(true);
      const result = await api(`/products/${product.id}/discount`, {
        method: 'PATCH',
        body: { discountPercent: 0, discountEndsAt: '' }
      });
      notify(result.message || 'Discount removed.');
      reload();
    } catch (err) {
      notify(err.message || 'Could not remove this discount.');
    } finally {
      setBusy(false);
    }
  };

  return <PortalShell {...shell}>
    {loading && <Loading />}
    {error && <ErrorBox message={error} onRetry={reload} />}
    {data && <>
      <div className="portal-stat-grid">
        <StatCard icon={Tag} label="Live products" value={liveProducts.length} trend="Approved products in your store" />
        <StatCard icon={Percent} label="Active discounts" value={discounted.length} trend="Offers currently visible to customers" tone="green" />
        <StatCard icon={CalendarDays} label="Products without discount" value={Math.max(0, liveProducts.length - discounted.length)} trend="Available to promote" />
      </div>
      <PageCard title="Manage product discounts" subtitle="Set a percentage discount for any approved product. The original price remains unchanged and customers see the sale price in the shop.">
        {waiting && <p className="portal-note">Your seller account is awaiting approval. You can view your products, but discount changes unlock after approval.</p>}
        <div className="portal-toolbar">
          <label className="portal-search"><Tag size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your live products" /></label>
        </div>
        {liveProducts.length === 0 ? <EmptyState icon={Percent} title="No approved products yet" text="Discounts can be added after an administrator approves and publishes your products." /> :
          <Table headers={['Product', 'Original price', 'Customer price', 'Discount', 'Offer ends', 'Actions']} empty="No products match your search." rows={visible.map((p) => {
            const active = Number(p.discountPercent || 0) > 0 && (!p.discountEndsAt || Date.parse(p.discountEndsAt) >= Date.now());
            const salePrice = active ? Number(p.price) * (1 - Number(p.discountPercent) / 100) : Number(p.price);
            return { key: p.id, cells: [
              <span className="portal-product-cell"><img src={p.image} alt="" /><span><b>{p.name}</b><small className="portal-sub">{p.category} · Stock {p.stock}</small></span></span>,
              taka(p.price),
              <b>{taka(salePrice)}</b>,
              active ? <b>{p.discountPercent}% OFF</b> : '—',
              active ? (p.discountEndsAt ? dateText(p.discountEndsAt) : 'Until removed') : '—',
              <div className="portal-row-actions"><button className="portal-secondary" style={{ padding: '6px 9px', fontSize: 12 }} onClick={() => open(p)} disabled={waiting || busy}>{active ? 'Edit offer' : 'Set discount'}</button>{active && <button className="portal-row-action" title="Remove discount" disabled={waiting || busy} onClick={() => remove(p)}><Trash2 size={15} /></button>}</div>
            ] };
          })} />}
      </PageCard>
    </>}
    {selected && <Modal title={`Discount · ${selected.name}`} onClose={() => !busy && setSelected(null)}>
      <form className="portal-form" onSubmit={save}>
        <p className="portal-sub">Set 1%–90% off. Enter 0% to remove the current offer. The discount is saved to this product and recalculated by the server at checkout.</p>
        <label>Discount percentage<input type="number" min="0" max="90" step="1" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="e.g. 15" required /></label>
        <label>Offer end date (optional)<input type="date" min={new Date().toISOString().slice(0, 10)} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
        {Number(percent) > 0 && Number(percent) <= 90 && <p className="portal-note">Customer price: <b>{taka(Number(selected.price) * (1 - Number(percent) / 100))}</b> · Original price: {taka(selected.price)}</p>}
        <div className="portal-form-actions">
          <button type="button" className="portal-secondary" onClick={() => { setPercent('0'); setEndDate(''); }}>Remove discount</button>
          <button type="button" className="portal-secondary" disabled={busy} onClick={() => setSelected(null)}>Cancel</button>
          <button type="submit" className="portal-primary" disabled={busy || percent === '' || !Number.isInteger(Number(percent)) || Number(percent) < 0 || Number(percent) > 90}>{busy ? 'Saving…' : 'Save discount'}</button>
        </div>
      </form>
    </Modal>}
  </PortalShell>;
}
