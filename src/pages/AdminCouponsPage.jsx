import { Plus, Trash2 } from 'lucide-react';
import { api, useApi, dateText } from '../api.js';
import { PortalShell, Table, PageCard, StatusBadge, Loading, ErrorBox } from '../components/PortalUI.jsx';

export default function AdminCouponsPage({ shell, notify }) {
  const { data, loading, error, reload } = useApi('/admin/coupons');
  const create = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    try { const r = await api('/admin/coupons', { method: 'POST', body: Object.fromEntries(new FormData(form)) }); notify(r.message); form.reset(); reload(); } catch (err) { notify(err.message); }
  };
  const patch = async (c, status) => { try { await api(`/admin/coupons/${c.id}`, { method: 'PATCH', body: { status } }); reload(); } catch (e) { notify(e.message); } };
  const del = async (c) => { if (!window.confirm(`Delete coupon ${c.id}?`)) return; try { const r = await api(`/admin/coupons/${c.id}`, { method: 'DELETE' }); notify(r.message); reload(); } catch (e) { notify(e.message); } };
  return <PortalShell {...shell}>
    <div className="portal-two-col">
      <PageCard title="Create a coupon" subtitle="Create marketplace promo codes. Active codes are saved in this admin list and shown to eligible customers at checkout and sellers on their dashboard.">
        <form className="portal-form" onSubmit={create}>
          <label>Coupon code<input name="code" placeholder="FRESH10" required style={{ textTransform: 'uppercase' }} /></label>
          <div className="portal-form-grid"><label>Discount (%)<input name="discount" type="number" min="1" max="90" defaultValue="10" required /></label><label>Who can use it<select name="role" defaultValue="all"><option value="all">Customers and sellers</option><option value="customer">Customers only</option><option value="seller">Sellers only</option></select></label>
            <label>Minimum order (BDT)<input name="minOrder" type="number" min="0" defaultValue="0" /></label><label>Total uses (0 = unlimited)<input name="maxUses" type="number" min="0" defaultValue="0" /></label></div>
          <label>Expires on (optional)<input name="expiresAt" type="date" /></label>
          <button className="portal-primary" type="submit"><Plus size={16} /> Create coupon</button>
        </form>
      </PageCard>
      <PageCard title="Coupons" subtitle="Disable a coupon to stop it instantly">
        {loading && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
        {data && <Table headers={['Promo code', 'Discount', 'Audience', 'Redemptions', 'Expires', 'Status', '']} empty="No coupons yet." rows={data.items.map((c) => ({ key: c.id, cells: [<b>{c.id}</b>, `${c.discount}%`, c.role, `${c.usedCount || 0}${c.maxUses ? ` / ${c.maxUses}` : ''}`, c.expiresAt ? dateText(c.expiresAt) : 'Never', <button className="portal-link-btn" onClick={() => patch(c, c.status === 'active' ? 'disabled' : 'active')} title="Click to toggle"><StatusBadge status={c.status} /></button>, <button className="portal-row-action" onClick={() => del(c)} title="Delete"><Trash2 size={15} /></button>] }))} />}
      </PageCard>
    </div>
  </PortalShell>;
}