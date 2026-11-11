import { useState } from 'react';
import { Banknote, Clock3, Send, Wallet, ShoppingBag, CreditCard } from 'lucide-react';
import { taka } from '../utils/portal.js';
import { api, useApi, dateText } from '../api.js';
import { PortalShell, StatCard, Table, PageCard, StatusBadge, Loading, ErrorBox, AreaChart } from '../components/PortalUI.jsx';

export default function SellerEarningsPage({ shell, notify, user }) {
  const { data, loading, error, reload } = useApi('/seller/earnings', { poll: 15000 });
  const [form, setForm] = useState({ amount: '', method: 'bkash', account: '' });
  const [busy, setBusy] = useState(false);
  const s = data?.summary;
  const waiting = user?.role === 'seller_pending';
  const submit = async (e) => {
    e.preventDefault();
    try { setBusy(true); const r = await api('/seller/payouts', { method: 'POST', body: { ...form, account: form.account || data.payoutAccount?.account || '' } }); notify(r.message); setForm((f) => ({ ...f, amount: '' })); reload(); }
    catch (err) { notify(err.message); } finally { setBusy(false); }
  };
  return <PortalShell {...shell}>
    {loading && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
    {data && <>
      <div className="portal-stat-grid">
        <StatCard icon={Wallet} label="Available to withdraw" value={taka(s.available)} trend="Only received and paid orders" tone="green" />
        <StatCard icon={Banknote} label="Total earned" value={taka(s.earned)} trend={`${s.completedPaidOrders || 0} completed paid orders`} tone="green" />
        <StatCard icon={ShoppingBag} label="Order value in progress" value={taka(s.inProgress)} trend="Awaiting fulfilment / customer receipt" tone="amber" />
        <StatCard icon={CreditCard} label="Payment not yet received" value={taka(s.pendingPayment)} trend={`${s.pendingPaymentOrders || 0} unpaid orders`} tone="amber" />
        <StatCard icon={Send} label="Payout requested" value={taka(s.pendingPayout)} trend="Waiting for admin review" />
        <StatCard icon={Banknote} label="Paid out" value={taka(s.paidOut)} trend="Transferred to your payout account" tone="green" />
        {(s.refunded > 0 || s.refundHold > 0) && <StatCard icon={Clock3} label="Refunds" value={taka(s.refunded)} trend={s.refundHold > 0 ? `${taka(s.refundHold)} held for open requests` : 'Deducted from earnings'} tone="amber" />}
      </div>
      <div className="portal-dashboard-grid">
        <PageCard title="Completed earnings — last 30 days" subtitle={`Orders received by customers and paid, after the ${data.commissionRate}% marketplace fee`}><AreaChart data={data.series} /></PageCard>
        <PageCard title="Request a payout" subtitle={`Minimum ${taka(data.minPayout)}. Payouts are sent to your bKash, Nagad or bank account.`}>
          <form className="portal-form" onSubmit={submit}>
            <label>Amount (BDT)<input type="number" min="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder={`Up to ${s.available}`} required /></label>
            <label>Send to<select value={form.method || data.payoutAccount?.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="bank">Bank account</option></select></label>
            <label>Number / account details<input value={form.account || data.payoutAccount?.account || ''} onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))} placeholder="01XXXXXXXXX" required /></label>
            <button className="portal-primary portal-full" disabled={busy || waiting}><Send size={16} /> {busy ? 'Sending…' : 'Request payout'}</button>
          </form>
          <p className="portal-note">Completed gross sales {taka(s.gross)} · marketplace fee {taka(s.commission)}</p>
        </PageCard>
      </div>
      <PageCard title="Payout history"><Table headers={['Requested', 'Amount', 'Method', 'Account', 'Status', 'Note']} empty="No payouts yet." rows={data.payouts.map((p) => ({ key: p.id, cells: [dateText(p.createdAt), <b>{taka(p.amount)}</b>, p.method, p.account, <StatusBadge status={p.status} />, p.note || '—'] }))} /></PageCard>
    </>}
  </PortalShell>;
}