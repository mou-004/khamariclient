import { useEffect, useMemo, useState } from 'react';
import { Gavel, Heart, Trophy } from 'lucide-react';
import { api, assetUrl, dateTimeText, useApi } from '../api.js';
import { taka } from '../utils/portal.js';
import { STATE_LABEL, timeLeft, useNow } from '../components/AuctionParts.jsx';
import { PortalShell, Loading, ErrorBox, Modal, Tabs } from '../components/PortalUI.jsx';

const TABS = [['all', 'All'], ['active', 'Active'], ['won', 'Won'], ['lost', 'Ended'], ['watching', 'Watching']];
const group = (s) => (['winning', 'outbid'].includes(s) ? 'active' : ['won', 'won_paid', 'unpaid'].includes(s) ? 'won' : 'lost');

// "Pay now" for a won auction: delivery details + payment method, then the order is created.
function PayModal({ item, onClose, onDone, notify }) {
  const a = item.auction;
  const me = useApi('/me');
  const cfg = useApi('/payments/config');
  const fee = useApi('/settings/public', { auto: true });
  const [f, setF] = useState({ name: '', phone: '', address: '', area: '' });
  const [method, setMethod] = useState('cash');
  const [busy, setBusy] = useState(false);
  useEffect(() => { const p = me.data?.profile; if (p) setF((x) => ({ name: x.name || p.name || '', phone: x.phone || p.phone || '', address: x.address || p.address || '', area: x.area || p.area || '' })); }, [me.data]);
  const accounts = cfg.data?.accounts || {};
  const price = a.finalPrice || 0;
  const delivery = fee.data ? (price >= fee.data.freeDeliveryOver ? 0 : fee.data.deliveryFee) : 0;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    try { setBusy(true); const r = await api(`/auctions/${a.id}/checkout`, { method: 'POST', body: { recipient: f, paymentMethod: method } }); notify(r.message); onDone(r.order); }
    catch (err) { notify(err.message); } finally { setBusy(false); }
  };
  return <Modal wide title={`Pay for “${a.title}”`} onClose={onClose}>
    <form className="portal-form" onSubmit={submit}>
      <div className="portal-form-grid">
        <label>Recipient name<input value={f.name} onChange={set('name')} required /></label>
        <label>Phone<input value={f.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" required /></label>
        <label>Area / district<input value={f.area} onChange={set('area')} /></label>
        <label>Full delivery address<input value={f.address} onChange={set('address')} required /></label>
      </div>
      <div className="cm-field"><label>Payment method</label>
        <div className="cm-seg">{[['cash', 'Cash on delivery'], ...['bkash', 'nagad'].filter((m) => accounts[m]).map((m) => [m, m === 'bkash' ? 'bKash' : 'Nagad'])].map(([k, l]) => <button type="button" key={k} className={method === k ? 'on' : ''} onClick={() => setMethod(k)}>{l}</button>)}</div>
        {method !== 'cash' && <p className="cm-hint">Send {taka(price + delivery)} to <b>{accounts[method]}</b>, then submit your transaction reference on <b>My payments</b>. {cfg.data?.instructions}</p>}
      </div>
      <div className="order-totals"><div><span>Winning bid</span><b>{taka(price)}</b></div><div><span>Delivery</span><b>{delivery ? taka(delivery) : 'Free'}</b></div><div className="order-grand"><span>Total</span><b>{taka(price + delivery)}</b></div></div>
      <div className="portal-form-actions"><button type="button" className="portal-secondary" onClick={onClose}>Not now</button><button className="portal-primary" disabled={busy}><Trophy size={15} /> {busy ? 'Placing order…' : 'Place order'}</button></div>
    </form>
  </Modal>;
}

export default function MyBidsPage({ shell, navigate, notify }) {
  const { data, loading, error, reload } = useApi('/me/bids', { poll: 10000 });
  const [tab, setTab] = useState('all');
  const [pay, setPay] = useState(null);
  const now = useNow(1000);
  const items = data?.items || [];
  const list = useMemo(() => (tab === 'all' ? items : tab === 'watching' ? [] : items.filter((i) => group(i.state) === tab)), [items, tab]);
  const count = (g) => items.filter((i) => group(i.state) === g).length;
  const toWin = items.filter((i) => i.state === 'won');
  const unwatch = async (a) => { try { const r = await api(`/auctions/${a.id}/watch`, { method: 'POST', body: { watch: false } }); notify(r.message); reload(); } catch (e) { notify(e.message); } };
  const open = (a) => navigate(`auction-detail?id=${a.id}`);

  return <PortalShell {...shell}>
    {loading && !data && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
    {toWin.map((i) => <div className="portal-alert" key={i.auction.id}><span><Trophy size={15} /> You won <b>{i.auction.title}</b> for {taka(i.auction.finalPrice)}. Pay by {dateTimeText(i.auction.paymentDueAt)} ({timeLeft(i.auction.paymentDueAt, now)} left).</span><button className="portal-primary" onClick={() => setPay(i)}>Pay now</button></div>)}
    {data && <>
      <Tabs value={tab} onChange={setTab} tabs={TABS.map(([k, l]) => [k, l, k === 'all' ? items.length : k === 'watching' ? data.watching.length : count(k)])} />
      {tab === 'watching'
        ? (data.watching.length ? <div className="mb-list">{data.watching.map((a) => <div className="mb-row" key={a.id}><img src={assetUrl(a.image)} alt="" /><div><h4 onClick={() => open(a)}>{a.title}</h4><div className="cm-row"><span>{taka(a.currentBid)} · {a.bidCount} bids</span><span className="cm-time"><b>{a.isEnded ? 'Ended' : timeLeft(a.endsAt, now)}</b></span></div></div><div className="mb-side"><button className="cm-btn cm-btn-sm" onClick={() => open(a)}>View</button><button className="cm-btn cm-btn-sm" onClick={() => unwatch(a)}><Heart size={14} /> Remove</button></div></div>)}</div> : <div className="cm-empty"><Heart size={28} /><b>Your watchlist is empty</b>Tap the heart on any auction to follow it. We’ll warn you before it ends.</div>)
        : list.length
          ? <div className="mb-list">{list.map((i) => { const a = i.auction, [label, tone] = STATE_LABEL[i.state] || ['', 'blue']; return <div className="mb-row" key={a.id}>
            <img src={assetUrl(a.image)} alt="" />
            <div><h4 onClick={() => open(a)}>{a.title}</h4>
              <div className="cm-row"><span className={`cm-chip cm-chip-${tone}`}>{label}</span><span>{a.isEnded ? (a.finalPrice ? `Final ${taka(a.finalPrice)}` : `Last bid ${taka(a.currentBid)}`) : `Current ${taka(a.currentBid)}`}</span><span>My max {taka(i.myMax)}</span></div>
              <div className="cm-row" style={{ marginTop: 4 }}><span className={`cm-time ${!a.isEnded && Date.parse(a.endsAt) - now < 3600000 ? 'urgent' : ''}`}>{a.isEnded ? `Ended ${dateTimeText(a.endedAt || a.endsAt)}` : `${timeLeft(a.endsAt, now)} left`}</span></div></div>
            <div className="mb-side">
              {i.state === 'won' && <button className="cm-btn cm-btn-primary cm-btn-sm" onClick={() => setPay(i)}>Pay now</button>}
              {i.state === 'won_paid' && <button className="cm-btn cm-btn-sm" onClick={() => navigate('orders')}>View order {a.orderNumber}</button>}
              {i.state === 'outbid' && <button className="cm-btn cm-btn-primary cm-btn-sm" onClick={() => open(a)}><Gavel size={14} /> Bid again</button>}
              {i.state === 'winning' && <button className="cm-btn cm-btn-sm" onClick={() => open(a)}>View</button>}
              {!['won', 'won_paid', 'outbid', 'winning'].includes(i.state) && <button className="cm-btn cm-btn-sm" onClick={() => open(a)}>Details</button>}
            </div></div>; })}</div>
          : <div className="cm-empty"><Gavel size={28} /><b>No auctions here yet</b>Find something you like and place your first bid.<br /><br /><button className="cm-btn cm-btn-primary" onClick={() => navigate('auction')}>Browse live auctions</button></div>}
    </>}
    {pay && <PayModal item={pay} notify={notify} onClose={() => setPay(null)} onDone={(order) => { setPay(null); reload(); navigate(order.paymentMethod === 'cash' ? 'orders' : 'payments'); }} />}
  </PortalShell>;
}