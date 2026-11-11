import { useState } from 'react';
import { Clock3, Gavel, Plus, RotateCcw, Trophy, Users } from 'lucide-react';
import { api, dateTimeText, useApi } from '../api.js';
import { taka } from '../utils/portal.js';
import { timeLeft, useNow } from '../components/AuctionParts.jsx';
import { PortalShell, StatCard, Table, PageCard, StatusBadge, Loading, ErrorBox, Tabs } from '../components/PortalUI.jsx';

export default function SellerAuctionsPage({ shell, navigate, notify, user }) {
  const { data, loading, error, reload } = useApi('/seller/auctions', { poll: 15000 });
  const [tab, setTab] = useState('live');
  const [busy, setBusy] = useState('');
  const now = useNow(1000);
  const items = data?.items || [];
  const live = items.filter((a) => !a.isEnded), sold = items.filter((a) => ['sold'].includes(a.status));
  const shown = tab === 'live' ? live : tab === 'sold' ? sold : tab === 'unsold' ? items.filter((a) => ['unsold', 'unpaid', 'cancelled'].includes(a.status)) : items;
  const run = async (key, fn) => { try { setBusy(key); const r = await fn(); notify(r.message); reload(); } catch (e) { notify(e.message); } finally { setBusy(''); } };
  const end = (a) => window.confirm(`End “${a.title}” now? It has no bids so it will simply be withdrawn.`) && run(a.id, () => api(`/auctions/${a.id}/end`, { method: 'PATCH', body: {} }));
  const relist = (a) => run(a.id, () => api(`/auctions/${a.id}/relist`, { method: 'POST', body: {} }));
  return <PortalShell {...shell}>
    <div className="portal-toolbar"><span /><button className="portal-primary" disabled={user?.role === 'seller_pending'} onClick={() => navigate('seller-products')}><Plus size={16} /> Start an auction from a product</button></div>
    {loading && !data && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
    {data && <>
      <div className="portal-stat-grid">
        <StatCard icon={Gavel} label="Live auctions" value={live.length} trend="Open for bids" tone="green" />
        <StatCard icon={Users} label="Bids on live lots" value={live.reduce((n, a) => n + a.bidCount, 0)} trend="Across your auctions" />
        <StatCard icon={Trophy} label="Sold" value={sold.length} trend={taka(sold.reduce((n, a) => n + (a.finalPrice || 0), 0))} tone="amber" />
        <StatCard icon={Clock3} label="Awaiting payment" value={sold.filter((a) => !a.orderId).length} trend="Winners who haven’t paid yet" />
      </div>
      <PageCard title="My auctions" subtitle="Start an auction from the Gavel button on any approved product in My products.">
        <Tabs value={tab} onChange={setTab} tabs={[['live', 'Live', live.length], ['sold', 'Sold', sold.length], ['unsold', 'Not sold', items.filter((a) => ['unsold', 'unpaid', 'cancelled'].includes(a.status)).length], ['all', 'All', items.length]]} />
        <Table headers={['Lot', 'Current bid', 'Reserve', 'Bids', 'Ends', 'Status', '']} empty="No auctions here yet."
          rows={shown.map((a) => ({ key: a.id, cells: [
            <span className="portal-product-cell"><img src={a.image} alt="" /><span><b>{a.title}</b><small className="portal-sub">Start {taka(a.startingBid)} · step {taka(a.incrementAmount)}{a.buyNowPrice ? ` · BIN ${taka(a.buyNowPrice)}` : ''}</small></span></span>,
            <>{taka(a.finalPrice || a.currentBid)}{a.status === 'sold' && <small className="portal-sub">{a.orderId ? `Paid · ${a.orderNumber}` : `Winner ${a.winnerFullName || ''} · unpaid`}</small>}</>,
            a.reservePrice ? <>{taka(a.reservePrice)}<small className="portal-sub">{a.reserveMet ? 'Met' : 'Not met'}</small></> : '—',
            a.bidCount, a.isEnded ? dateTimeText(a.endedAt || a.endsAt) : <>{dateTimeText(a.endsAt)}<small className="portal-sub">{timeLeft(a.endsAt, now)} left</small></>,
            <StatusBadge status={a.isEnded && a.status === 'active' ? 'ended' : a.status === 'sold' && !a.orderId ? 'pending' : a.status} />,
            <div className="portal-row-actions">
              <button className="portal-row-action" title="View lot" onClick={() => navigate(`auction-detail?id=${a.id}`)}><Gavel size={15} /></button>
              {!a.isEnded && a.bidCount === 0 && <button className="portal-secondary" disabled={busy === a.id} onClick={() => end(a)}>End</button>}
              {['unsold', 'unpaid', 'cancelled'].includes(a.status) && <button className="portal-row-action" title="Relist" disabled={busy === a.id} onClick={() => relist(a)}><RotateCcw size={15} /></button>}
            </div>] }))} />
      </PageCard>
    </>}
  </PortalShell>;
}