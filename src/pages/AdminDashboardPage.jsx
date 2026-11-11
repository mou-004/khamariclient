import { useState } from 'react';
import { ArrowRight, Banknote, BarChart3, Bell, CheckCircle2, CreditCard, MailCheck, Package, RotateCcw, ShoppingBag, Store, Users, Wallet } from 'lucide-react';
import { taka } from '../utils/portal.js';
import { api, useApi, dateText } from '../api.js';
import { PortalShell, StatCard, Table, PageCard, StatusBadge, Loading, ErrorBox, AreaChart, BarList } from '../components/PortalUI.jsx';

export default function AdminDashboardPage({ shell, navigate }) {
  const { data, loading, error, reload } = useApi('/admin/analytics', { poll: 15000 });
  const refunds = useApi('/admin/refunds', { poll: 20000 });
  const payouts = useApi('/admin/payouts', { poll: 20000 });
  const smtp = useApi('/payments/email-status');
  const [smtpBusy, setSmtpBusy] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState('');
  const testSmtp = async () => {
    try { setSmtpBusy(true); setSmtpMessage(''); const result = await api('/admin/payments/smtp-test', { method: 'POST', body: {} }); setSmtpMessage(result.message || 'SMTP test successful.'); smtp.reload(); }
    catch (e) { setSmtpMessage(e.message || 'SMTP test failed.'); } finally { setSmtpBusy(false); }
  };
  const t = data?.totals || {}, p = data?.pending || {};
  const refundItems = refunds.data?.items || [];
  const payoutItems = payouts.data?.items || [];
  const requestedPayouts = payoutItems.filter((x) => x.status === 'requested');
  const openRefunds = refundItems.filter((x) => ['requested', 'approved', 'return_shipped', 'refund_pending', 'escalated'].includes(x.status));
  const tasks = [
    ['Seller approvals', p.sellers || 0, 'admin-users', Store],
    ['Products to review', p.products || 0, 'admin-products', Package],
    ['Online payments to verify', p.onlinePayments || 0, 'admin-orders', CreditCard],
    ['Payout requests', p.payouts || requestedPayouts.length, 'admin-payouts', Wallet],
    ['Refund cases', p.refunds || openRefunds.length, 'admin-refunds', RotateCcw],
    ['New orders', p.newOrders || 0, 'admin-orders', ShoppingBag],
  ];
  return <PortalShell {...shell}>
    <section className="kh-dashboard-hero kh-admin-hero">
      <div><span className="kh-dashboard-kicker">KHAMARI PLATFORM CONTROL</span><h2>Marketplace overview</h2><p>Monitor customer orders, payment verification, refunds, seller payouts and platform activity.</p></div>
      <div className="kh-hero-actions"><button className="portal-primary" onClick={() => navigate('admin-orders')}><ShoppingBag size={16}/> Manage orders</button><button className="portal-secondary" onClick={() => { reload(); refunds.reload(); payouts.reload(); }}>Refresh overview</button></div>
    </section>
    {loading && <Loading/>}{error && <ErrorBox message={error} onRetry={reload}/>}
    {refunds.error && <ErrorBox message={`Refund data: ${refunds.error}`} onRetry={refunds.reload}/>}
    {payouts.error && <ErrorBox message={`Payout data: ${payouts.error}`} onRetry={payouts.reload}/>}
    {data && <>
      <div className="portal-stat-grid kh-dashboard-stats">
        <StatCard icon={Wallet} label="Order revenue" value={taka(t.revenue)} trend={`${t.orders || 0} non-cancelled orders`} tone="green"/>
        <StatCard icon={BarChart3} label="Marketplace fees earned" value={taka(t.commission)} trend="From delivered and received orders" tone="green"/>
        <StatCard icon={Users} label="Registered users" value={t.users || 0} trend={`${t.customers || 0} customers · ${t.sellers || 0} sellers`}/>
        <StatCard icon={Package} label="Live products" value={t.activeProducts || 0} trend={`${t.products || 0} total products`}/>
        <StatCard icon={CreditCard} label="Online payments to verify" value={p.onlinePayments || 0} trend={taka(p.onlinePaymentValue || 0) + ' awaiting verification'} tone="amber"/>
        <StatCard icon={Wallet} label="Seller payout requests" value={requestedPayouts.length || p.payouts || 0} trend={taka(requestedPayouts.reduce((n, x) => n + Number(x.amount || 0), 0)) + ' requested'} tone="amber"/>
        <StatCard icon={RotateCcw} label="Open refunds" value={openRefunds.length || t.refundsOpen || 0} trend={taka(t.refunded || 0) + ' refunded to date'} tone="amber"/>
        <StatCard icon={ShoppingBag} label="New orders" value={p.newOrders || 0} trend="Awaiting seller acceptance"/>
      </div>

      <PageCard title="Needs your attention" subtitle="Open the relevant work queue to review or process these items.">
        <div className="kh-dashboard-shortcuts">{tasks.map(([label, n, to, Icon]) => <button key={to} className="kh-dashboard-shortcut" onClick={() => navigate(to)}><span className="kh-shortcut-icon"><Icon size={19}/></span><span className="kh-shortcut-copy"><b>{label}</b><small>{label === 'Online payments to verify' ? 'Review submitted transaction references' : label === 'Payout requests' ? 'Process seller settlements' : label === 'Refund cases' ? 'Review, approve and pay refunds' : 'Open administration queue'}</small></span><span className="kh-shortcut-count">{n}</span><ArrowRight size={16}/></button>)}</div>
      </PageCard>

      <div className="portal-dashboard-grid"><PageCard title="Revenue · last 30 days" subtitle="Non-cancelled orders placed in the selected period."><AreaChart data={data.revenueByDay || []}/></PageCard><PageCard title="Orders by status" subtitle="Marketplace fulfilment overview."><BarList money={false} rows={['placed', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'received', 'cancelled'].map((s) => ({ label: ({ out_for_delivery: 'Out for delivery' }[s] || s[0].toUpperCase() + s.slice(1)), value: data.ordersByStatus?.[s] || 0 }))}/></PageCard></div>

      <PageCard title="Latest orders" subtitle="Recent customer purchases across the marketplace." action={<button className="portal-text-link" onClick={() => navigate('admin-orders')}>View all orders <ArrowRight size={14}/></button>}>
        <Table headers={['Order', 'Customer', 'Seller', 'Total', 'Payment', 'Status', 'Placed']} empty="No orders yet." rows={(data.recentOrders || []).map((o) => ({ key: o.id, cells: [<b>{o.orderNumber}</b>, o.customerName, o.sellerName, taka(o.total), <span>{String(o.paymentMethod || '—').toUpperCase()}<small className="portal-sub">{o.paymentStatus || 'pending'}</small></span>, <StatusBadge status={o.status}/>, dateText(o.createdAt)] }))}/>
      </PageCard>

      <PageCard title="Email OTP / SMTP status" subtitle="Customer payment OTP and order email notifications use the configured server SMTP connection.">
        <div className="smtp-health-row"><div><strong>{smtp.data?.configured ? (smtp.data.status === 'ready' ? 'SMTP connected' : smtp.data.status === 'failed' ? 'SMTP connection failed' : 'SMTP checking') : 'SMTP not configured'}</strong><small>{smtp.data?.configured ? `Sender: ${smtp.data.senderConfigured ? 'configured' : 'missing'} · Admin email: ${smtp.data.customerEmailAvailable ? 'available' : 'missing'}` : 'Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM in backend .env.'}</small>{smtpMessage && <small role="status">{smtpMessage}</small>}</div><button type="button" className="portal-primary" onClick={testSmtp} disabled={smtpBusy || !smtp.data?.configured || !smtp.data?.customerEmailAvailable}><MailCheck size={16}/>{smtpBusy ? 'Testing SMTP…' : 'Send test email'}</button></div>
      </PageCard>
    </>}
  </PortalShell>;
}
