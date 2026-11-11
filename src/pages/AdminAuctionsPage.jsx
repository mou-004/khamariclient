import { useState } from 'react';
import { Clock3, Eye, Gavel, Users, X } from 'lucide-react';
import { taka } from '../utils/portal.js';
import { api, useApi, dateTimeText } from '../api.js';
import { PortalShell, StatCard, Table, PageCard, StatusBadge, Loading, ErrorBox, Modal, Tabs } from '../components/PortalUI.jsx';

export default function AdminAuctionsPage({ shell, notify }) {
  const { data, loading, error, reload } = useApi('/admin/auctions', { poll: 20000 });
  const [tab, setTab] = useState('live');
  const [cancel, setCancel] = useState(null);
  const [reason, setReason] = useState('');
  const [bids, setBids] = useState(null);
  const [busy, setBusy] = useState(false);
  const items = data?.items || [];
  const live = items.filter((a) => !a.isEnded);
  const shown = tab === 'live' ? live : tab === 'ended' ? items.filter((a) => a.isEnded) : items;
  const doCancel = async (e) => {
    e.preventDefault();
    try { setBusy(true); const r = await api(`/admin/auctions/${cancel.id}/cancel`, { method: 'PATCH', body: { reason } }); notify(r.message); setCancel(null); setReason(''); reload(); } catch (err) { notify(err.message); } finally { setBusy(false); }
  };
  const showBids = async (a) => { try { const r = await api(`/admin/auctions/${a.id}/bids`); setBids({ a, items: r.items }); } catch (e) { notify(e.message); } };
  return <PortalShell {...shell}>
    {loading && !data && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
    {data && <>
      <div className="portal-stat-grid">
        <StatCard icon={Gavel} label="Live auctions" value={live.length} trend="Open for bids" tone="green" />
        <StatCard icon={Users} label="Total bids" value={items.reduce((n, a) => n + (a.bidCount || 0), 0)} trend="All auctions" />
        <StatCard icon={Clock3} label="Sold" value={items.filter((a) => a.status === 'sold').length} trend={taka(items.filter((a) => a.status === 'sold').reduce((n, a) => n + (a.finalPrice || 0), 0))} tone="amber" />
      </div>
      <PageCard title="All auctions" subtitle="Bids, reserves and deadlines are enforced by the server. Finished auctions close automatically.">
        <Tabs value={tab} onChange={setTab} tabs={[['live', 'Live', live.length], ['ended', 'Ended', items.length - live.length], ['all', 'All', items.length]]} />
        <Table headers={['Lot', 'Seller', 'Current / final', 'Reserve', 'Bids', 'Ends', 'Status', '']} empty="No auctions here."
          rows={shown.map((a) => ({ key: a.id, cells: [<span className="portal-product-cell"><img src={a.image} alt="" /><b>{a.title}</b></span>, a.sellerName || '—', taka(a.finalPrice || a.currentBid), a.reservePrice ? <>{taka(a.reservePrice)}<small className="portal-sub">{a.reserveMet ? 'Met' : 'Not met'}</small></> : '—', a.bidCount, dateTimeText(a.endsAt), <StatusBadge status={a.status === 'sold' && !a.orderId ? 'pending' : a.status} />,
            <div className="portal-row-actions"><button className="portal-row-action" title="See all bids" onClick={() => showBids(a)}><Eye size={15} /></button>{!a.isEnded && <button className="portal-row-action" title="Cancel auction" onClick={() => setCancel(a)}><X size={15} /></button>}</div>] }))} />
      </PageCard>
    </>}
    {cancel && <Modal title={`Cancel “${cancel.title}”`} onClose={() => setCancel(null)}>
      <form className="portal-form" onSubmit={doCancel}>
        <p className="portal-sub">The seller and all {cancel.bidderCount} bidder(s) will be told. Bids are released.</p>
        <label>Reason (shown to bidders and the seller)<textarea value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} maxLength={200} /></label>
        <div className="portal-form-actions"><button type="button" className="portal-secondary" onClick={() => setCancel(null)}>Keep auction</button><button className="portal-primary" disabled={busy}>Cancel auction</button></div>
      </form>
    </Modal>}
    {bids && <Modal wide title={`Bids — ${bids.a.title}`} onClose={() => setBids(null)}>
      <Table headers={['Bidder', 'Bid', 'Type', 'Time']} empty="No bids." rows={bids.items.map((b) => ({ key: b.id, cells: [b.bidder, taka(b.amount), b.auto ? 'Auto-bid' : 'Bid', dateTimeText(b.createdAt)] }))} />
    </Modal>}
  </PortalShell>;
}