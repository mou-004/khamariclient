import { useState } from 'react';
import { ClipboardList, Download, Gavel, Users, Wallet } from 'lucide-react';
import { taka } from '../utils/portal.js';
import { useApi } from '../api.js';
import { downloadCsv } from '../csv.js';
import { PortalShell, StatCard, PageCard, Loading, ErrorBox, AreaChart, BarList } from '../components/PortalUI.jsx';

export default function AdminAnalyticsPage({ shell }) {
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useApi(`/admin/analytics?days=${days}`);
  const t = data?.totals;
  const range = <div className="range-switch">{[7, 30, 90].map((d) => <button key={d} className={days === d ? 'active' : ''} onClick={() => setDays(d)}>{d} days</button>)}</div>;
  return <PortalShell {...shell}>
    {error && <ErrorBox message={error} onRetry={reload} />}
    {!data && loading && <Loading />}
    {data && <>
      <div className="portal-stat-grid">
        <StatCard icon={Wallet} label="Delivered revenue" value={taka(t.deliveredRevenue)} trend="Completed orders only" tone="green" />
        <StatCard icon={ClipboardList} label="Orders" value={t.orders} trend={`Average ${taka(t.avgOrder)}`} />
        <StatCard icon={Users} label="Customers / sellers" value={`${t.customers} / ${t.sellers}`} trend={`${t.newUsers} new in 30 days`} tone="amber" />
        <StatCard icon={Gavel} label="Open auctions" value={t.openAuctions} trend={`${t.activeProducts} live products`} />
        <StatCard icon={Wallet} label="Refunded to customers" value={taka(t.refunded)} trend={`${t.refundsOpen} request${t.refundsOpen === 1 ? '' : 's'} open`} tone="amber" />
      </div>
      <PageCard title="Daily revenue" subtitle={`Last ${days} days`} action={<div className="portal-row-actions">{range}<button className="portal-secondary" onClick={() => downloadCsv(`khamari-revenue-${days}d.csv`, ['Date', 'Orders', 'Revenue (BDT)'], data.revenueByDay.map((d) => [d.date, d.orders, d.revenue]))}><Download size={15} /> CSV</button></div>}><AreaChart data={data.revenueByDay} /></PageCard>
      <div className="portal-two-col">
        <PageCard title="Sales by department" subtitle="All time"><BarList rows={data.categorySales.map((c) => ({ label: c.category, value: c.revenue }))} empty="Sales by department will appear after the first orders." /></PageCard>
        <PageCard title="Top sellers" subtitle="All time"><BarList rows={data.topSellers.map((s) => ({ label: s.name, value: s.revenue }))} empty="No seller sales yet." /></PageCard>
      </div>
      <PageCard title="Best-selling products"><div className="portal-mini-products">{data.topProducts.map((p) => <article key={p.productId}><img src={p.image} alt="" /><div><b>{p.name}</b><small>{p.units} sold</small><strong>{taka(p.revenue)}</strong></div></article>)}{!data.topProducts.length && <p className="portal-empty-note">No product sales yet.</p>}</div></PageCard>
    </>}
  </PortalShell>;
}