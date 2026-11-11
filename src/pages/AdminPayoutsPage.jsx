import { useEffect, useState } from 'react';
import { Check, Download, Save, X } from 'lucide-react';
import { downloadCsv } from '../csv.js';
import { taka } from '../utils/portal.js';
import { api, useApi, dateText } from '../api.js';
import { PortalShell, Table, PageCard, StatusBadge, Loading, ErrorBox } from '../components/PortalUI.jsx';

export default function AdminPayoutsPage({ shell, notify }) {
  const payouts = useApi('/admin/payouts');
  const settings = useApi('/admin/settings');
  const [form, setForm] = useState(null);
  useEffect(() => { if (settings.data) setForm(settings.data.settings); }, [settings.data]);
  const decide = async (p, status) => {
    const note = status === 'rejected' ? window.prompt('Reason for declining (shown to the seller):') : '';
    if (status === 'rejected' && note === null) return;
    if (status === 'paid' && !window.confirm(`Confirm that you have sent ${taka(p.amount)} to ${p.account}?`)) return;
    try { const r = await api(`/admin/payouts/${p.id}`, { method: 'PATCH', body: { status, note } }); notify(r.message); payouts.reload(); } catch (e) { notify(e.message); }
  };
  const saveSettings = async (e) => { e.preventDefault(); try { const r = await api('/admin/settings', { method: 'PUT', body: form }); notify(r.message); } catch (err) { notify(err.message); } };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const items = payouts.data?.items || [];
  return <PortalShell {...shell}>
    <div className="portal-two-col">
      <PageCard title="Platform fees & delivery" subtitle="Applies to new orders only. Existing orders keep the values they were placed with.">
        {!form ? <Loading /> : <form className="portal-form" onSubmit={saveSettings}>
          <label>Marketplace fee (% of each sale)<input type="number" min="0" max="50" step="0.5" value={form.commissionRate} onChange={set('commissionRate')} /></label>
          <label>Delivery fee per seller order (BDT)<input type="number" min="0" value={form.deliveryFee} onChange={set('deliveryFee')} /></label>
          <label>Free delivery above (BDT)<input type="number" min="0" value={form.freeDeliveryOver} onChange={set('freeDeliveryOver')} /></label>
          <label>Minimum payout (BDT)<input type="number" min="0" value={form.minPayout} onChange={set('minPayout')} /></label>
          <button className="portal-primary" type="submit"><Save size={16} /> Save settings</button>
        </form>}
        {settings.error && <ErrorBox message={settings.error} onRetry={settings.reload} />}
      </PageCard>
      <PageCard title="Payout summary" subtitle="What sellers have asked for">
        <div className="order-totals"><div><span>Waiting for review</span><b>{taka(items.filter((p) => p.status === 'requested').reduce((n, p) => n + p.amount, 0))}</b></div><div><span>Paid so far</span><b>{taka(items.filter((p) => p.status === 'paid').reduce((n, p) => n + p.amount, 0))}</b></div><div><span>Requests</span><b>{items.length}</b></div></div>
        <p className="portal-note">Send the money from your bKash / Nagad / bank account first, then click the green tick to mark the payout as paid.</p>
      </PageCard>
    </div>
    {payouts.loading && <Loading />}{payouts.error && <ErrorBox message={payouts.error} onRetry={payouts.reload} />}
    {payouts.data && <PageCard title="Payout requests" action={<button className="portal-secondary" disabled={!items.length} onClick={() => downloadCsv('khamari-payouts.csv', ['Requested', 'Seller', 'Email', 'Amount', 'Method', 'Account', 'Status', 'Note'], items.map((p) => [p.createdAt?.slice(0, 10), p.sellerName, p.sellerEmail, p.amount, p.method, p.account, p.status, p.note || '']))}><Download size={15} /> Export CSV</button>}><Table headers={['Requested', 'Seller', 'Amount', 'Send to', 'Status', '']} empty="No payout requests yet."
      rows={items.map((p) => ({ key: p.id, cells: [dateText(p.createdAt), <><b>{p.sellerName}</b><small className="portal-sub">{p.sellerEmail}</small></>, <b>{taka(p.amount)}</b>, `${p.method} · ${p.account}`, <StatusBadge status={p.status} />, p.status === 'requested' ? <div className="portal-row-actions"><button className="portal-row-action portal-approve" title="Mark as paid" onClick={() => decide(p, 'paid')}><Check size={15} /></button><button className="portal-row-action" title="Decline" onClick={() => decide(p, 'rejected')}><X size={15} /></button></div> : p.note || ''] }))} /></PageCard>}
  </PortalShell>;
}