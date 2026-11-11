import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Gavel, Heart, Info, ShieldCheck, Trophy, XCircle } from 'lucide-react';
import { api, assetUrl, dateTimeText, useApi } from '../api.js';
import { taka } from '../utils/portal.js';
import { endsOn, hashId, isUrgent, timeLeft, useNow } from '../components/AuctionParts.jsx';
import { Modal } from '../components/PortalUI.jsx';

// One auction: live countdown, proxy ("maximum") bidding with a confirmation step, Buy It Now, watchlist and bid history.
export default function AuctionDetailPage({ user, navigate, notify }) {
  const id = hashId();
  const [ended, setEnded] = useState(false);
  const { data, loading, error, reload } = useApi(id ? `/auctions/${id}` : '', { auto: true, poll: ended ? 0 : 5000 });
  const now = useNow(1000);
  const [max, setMax] = useState('');
  const [confirm, setConfirm] = useState(null); // 'bid' | 'buy'
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('details');
  const [pic, setPic] = useState(0);
  const a = data?.item, viewer = data?.viewer;
  useEffect(() => { if (a?.isEnded) setEnded(true); }, [a?.isEnded]);
  useEffect(() => { setMax(''); setPic(0); setEnded(false); }, [id]);
  // The clock ran out while the page was open: refresh once so the result appears.
  useEffect(() => { if (a && !a.isEnded && Date.parse(a.endsAt) <= now) reload(); }, [now, a?.endsAt, a?.isEnded]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!id) return <div className="cm-wrap"><div className="cm-empty"><b>No auction selected</b><button className="cm-btn cm-btn-primary" onClick={() => navigate('auction')}>Browse live auctions</button></div></div>;
  if (error) return <div className="cm-wrap"><div className="cm-note cm-note-bad"><span><b>We couldn’t open this auction</b>{error}</span></div><p><button className="cm-btn" onClick={() => navigate('auction')}>Back to auctions</button></p></div>;
  if (!a) return <div className="cm-wrap"><div className="cm-empty"><span className="portal-spinner" /> Loading auction…</div></div>;

  const live = !a.isEnded;
  const urgent = isUrgent(a.endsAt, now);
  const amount = Number(max);
  const gallery = [a.image, ...(a.images || []).filter((u) => u !== a.image)].filter(Boolean);
  const outbid = live && viewer.myMax != null && !a.isLeading;
  const needSignIn = () => { if (!user) { notify('Sign in to bid.'); navigate('login'); return true; } return false; };
  // Bids move up in fixed steps (for example start 5, step 5: 10, 15, 20 ...).
  const onStep = (v) => { const n = (v - a.minNextBid) / a.incrementAmount; return Math.abs(n - Math.round(n)) < 1e-6; };
  const stepBy = (dir) => { const base = amount >= a.minNextBid && onStep(amount) ? amount : (amount > a.minNextBid ? a.minNextBid + Math.floor((amount - a.minNextBid) / a.incrementAmount) * a.incrementAmount : a.minNextBid - (dir > 0 ? a.incrementAmount : 0)); setMax(String(Math.max(a.minNextBid, Math.round((base + dir * a.incrementAmount) * 100) / 100))); };
  const requestBid = () => {
    if (needSignIn()) return;
    if (!(amount >= a.minNextBid)) { notify(`Enter at least ${taka(a.minNextBid)}.`); return; }
    if (!onStep(amount)) { const lo = a.minNextBid + Math.floor((amount - a.minNextBid) / a.incrementAmount) * a.incrementAmount; notify(`Bids go up in steps of ${taka(a.incrementAmount)}. Try ${taka(lo)} or ${taka(lo + a.incrementAmount)}.`); return; }
    setConfirm('bid');
  };
  const submitBid = async () => {
    try { setBusy(true); const r = await api(`/auctions/${a.id}/bids`, { method: 'POST', body: { maxBid: amount } }); notify(r.message); setMax(''); setConfirm(null); reload(); }
    catch (e) { notify(e.message); setConfirm(null); reload(); } finally { setBusy(false); }
  };
  const buyNow = async () => {
    try { setBusy(true); const r = await api(`/auctions/${a.id}/buy-now`, { method: 'POST', body: {} }); notify(r.message); setConfirm(null); navigate('my-bids'); }
    catch (e) { notify(e.message); setConfirm(null); reload(); } finally { setBusy(false); }
  };
  const watch = async () => {
    if (needSignIn()) return;
    try { const r = await api(`/auctions/${a.id}/watch`, { method: 'POST', body: { watch: !viewer.watching } }); notify(r.message); reload(); } catch (e) { notify(e.message); }
  };

  return <div className="cm-wrap">
    <button className="cm-crumb" onClick={() => navigate('auction')}><ArrowLeft size={16} /> All auctions</button>
    <div className="cm-detail">
      <div className="cm-gallery">
        <div className="cm-main" style={{ backgroundImage: `url(${assetUrl(gallery[pic] || a.image)})` }} role="img" aria-label={a.title} />
        {gallery.length > 1 && <div className="cm-thumbs">{gallery.map((u, i) => <button key={u} className={i === pic ? 'on' : ''} style={{ backgroundImage: `url(${assetUrl(u)})` }} onClick={() => setPic(i)} aria-label={`Picture ${i + 1}`} />)}</div>}
      </div>

      <div>
        <div className="cm-panel">
          <div className="cm-sub"><span>{a.category}</span><span>·</span><span>Sold by <b>{a.sellerName}</b></span></div>
          <h1 className="cm-title">{a.title}</h1>
          {live
            ? <div className={`cm-clock ${urgent ? 'urgent' : ''}`}><Clock3 size={22} /><div><small>Time left</small><b>{timeLeft(a.endsAt, now, true)}</b></div><small style={{ marginLeft: 'auto', textAlign: 'right' }}>Ends {endsOn(a.endsAt)}</small></div>
            : <div className="cm-clock"><Clock3 size={22} /><div><small>Auction ended</small><b>{dateTimeText(a.endedAt || a.endsAt)}</b></div></div>}

          <div className="cm-bigprice"><small>{a.isEnded ? (a.finalPrice ? 'Sold for' : 'Last bid') : a.bidCount ? 'Current bid' : 'Starting bid'}</small><strong>{taka(a.isEnded && a.finalPrice ? a.finalPrice : a.currentBid)}</strong></div>
          <div className="cm-facts">
            <div><small>Bids</small><b>{a.bidCount}</b></div>
            <div><small>Bidders</small><b>{a.bidderCount}</b></div>
            <div><small>Watching</small><b>{a.watchers}</b></div>
          </div>
          {a.hasReserve && live && <p className="cm-hint" style={{ marginTop: -6, marginBottom: 12 }}><ShieldCheck size={13} style={{ verticalAlign: '-2px' }} /> {a.reserveMet ? 'Reserve price met. This item will sell to the highest bidder.' : 'Reserve price not met yet. The seller only sells above a hidden minimum.'}</p>}

          {/* status for the signed-in viewer */}
          {live && a.isLeading && <div className="cm-note cm-note-good"><CheckCircle2 size={20} /><span><b>You’re the highest bidder</b>Your private maximum is {taka(viewer.myMax)}. We only raise your bid when someone competes.</span></div>}
          {outbid && <div className="cm-note cm-note-bad"><XCircle size={20} /><span><b>You’ve been outbid</b>Your maximum of {taka(viewer.myMax)} was beaten. Place a higher maximum to get back in front.</span></div>}
          {a.isEnded && a.isWinner && !a.orderId && a.status === 'sold' && <div className="cm-note cm-note-good"><Trophy size={20} /><span><b>You won this auction!</b>Complete your purchase by {dateTimeText(a.paymentDueAt)}.<br /><button className="cm-btn cm-btn-primary" style={{ marginTop: 8 }} onClick={() => navigate('my-bids')}>Pay now</button></span></div>}
          {a.isEnded && a.isWinner && a.orderId && <div className="cm-note cm-note-good"><Trophy size={20} /><span><b>You won and paid</b>Order {a.orderNumber}. <button className="cm-btn cm-btn-sm" onClick={() => navigate('orders')}>View my orders</button></span></div>}
          {a.isEnded && !a.isWinner && !a.isSeller && <div className="cm-note cm-note-info"><Info size={20} /><span><b>{a.status === 'sold' || a.status === 'unpaid' ? 'This auction has ended' : a.status === 'cancelled' ? 'This auction was cancelled' : 'Ended without a sale'}</b>{a.status === 'sold' ? `Sold for ${taka(a.finalPrice)}.` : 'Bidding is closed.'}</span></div>}
          {a.isSeller && <div className="cm-note cm-note-info"><Info size={20} /><span><b>This is your auction</b>{a.reservePrice ? `Reserve ${taka(a.reservePrice)} · ` : ''}manage it from <button className="cm-btn cm-btn-sm" onClick={() => navigate('seller-auctions')}>My auctions</button></span></div>}

          {live && !a.isSeller && <div className="cm-field" style={{ marginTop: 14 }}>
            <label htmlFor="max-bid">Your maximum bid</label>
            <div className="cm-money"><button type="button" className="cm-stepbtn" aria-label="Lower bid" onClick={() => stepBy(-1)}>−</button><span>৳</span><input id="max-bid" type="number" inputMode="decimal" min={a.minNextBid} step={a.incrementAmount} value={max} onChange={(e) => setMax(e.target.value)} placeholder={`${a.minNextBid}`} onKeyDown={(e) => e.key === 'Enter' && requestBid()} /><button type="button" className="cm-stepbtn" aria-label="Raise bid" onClick={() => stepBy(1)}>+</button></div>
            <p className="cm-hint">Bids go up by <b>{taka(a.incrementAmount)}</b> each time: {taka(a.minNextBid)}, {taka(a.minNextBid + a.incrementAmount)}, {taka(a.minNextBid + 2 * a.incrementAmount)}… Enter the most you would pay. Khamari bids for you one step at a time, only as much as needed to keep you ahead. Other bidders never see your maximum.</p>
            <div className="cm-quick">{[0, 1, 3, 5].map((n) => { const v = a.minNextBid + n * a.incrementAmount; return <button key={n} type="button" onClick={() => setMax(String(v))}>{taka(v)}</button>; })}</div>
            <div className="cm-stack">
              <button className="cm-btn cm-btn-primary cm-btn-block" disabled={busy} onClick={requestBid}><Gavel size={16} /> {user ? (a.isLeading ? 'Raise my maximum' : 'Place bid') : 'Sign in to bid'}</button>
              {a.buyNowAvailable && <button className="cm-btn cm-btn-buy cm-btn-block" disabled={busy} onClick={() => (needSignIn() ? null : setConfirm('buy'))}>Buy It Now · {taka(a.buyNowPrice)}</button>}
              <button className={`cm-btn cm-btn-block`} onClick={watch}><Heart size={16} fill={viewer.watching ? 'currentColor' : 'none'} color={viewer.watching ? '#d6336c' : undefined} /> {viewer.watching ? 'Watching' : 'Add to watchlist'}</button>
            </div>
          </div>}
        </div>
        <div className="cm-panel" style={{ fontSize: 14, color: '#1A3D63' }}>
          <b style={{ color: 'var(--navy)' }}>Buyer protection</b>
          <p style={{ margin: '6px 0 0' }}>Pay within the payment window after you win. If your item arrives damaged or not as described, you can request a refund. <a href="#refund-policy" onClick={() => navigate('refund-policy')}>Read the returns &amp; refund policy</a>.</p>
        </div>
      </div>
    </div>

    <div className="cm-tabs">{[['details', 'Details'], ['bids', `Bid history (${a.bidCount})`], ['shipping', 'Payment & delivery']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === 'details' && <div className="cm-prose"><p>{a.description || 'The seller has not added a description. Ask questions through Khamari support before you bid.'}</p><p><b>Starting bid:</b> {taka(a.startingBid)} · <b>Bid increment:</b> {taka(a.incrementAmount)}{a.buyNowPrice ? <> · <b>Buy It Now:</b> {taka(a.buyNowPrice)}</> : null}</p>{a.productId && <p><button className="cm-btn cm-btn-sm" onClick={() => navigate(`product-detail?id=${a.productId}`)}>View product page</button></p>}</div>}
    {tab === 'bids' && (data.bids.length
      ? <div className="cm-panel" style={{ overflowX: 'auto' }}><table className="cm-table"><thead><tr><th>Bidder</th><th>Bid</th><th>Time</th></tr></thead><tbody>{data.bids.map((b) => <tr key={b.id} className={b.isMine ? 'mine' : ''}><td>{b.isMine ? 'You' : b.bidder}{b.auto && <span className="cm-auto">auto-bid</span>}</td><td><b>{taka(b.amount)}</b></td><td>{dateTimeText(b.createdAt)}</td></tr>)}</tbody></table><p className="cm-hint">Bidder names are partly hidden to protect privacy. Auto-bids are placed on a bidder’s behalf up to their private maximum.</p></div>
      : <div className="cm-empty"><b>No bids yet</b>Be the first to bid on this lot.</div>)}
    {tab === 'shipping' && <div className="cm-prose"><h3>Payment</h3><p>After you win you have a few days to check out. Pay with cash on delivery, bKash or Nagad. Items are fulfilled by the seller once your order is placed.</p><h3>Delivery</h3><p>Delivery fees and free-delivery rules are the same as the rest of Khamari and are shown at checkout.</p><h3>Returns &amp; refunds</h3><p>Auction purchases are covered for damaged, wrong or not-as-described items. Because bids are binding, they can’t be returned for a change of mind.</p></div>}

    {confirm === 'bid' && <Modal title="Confirm your bid" onClose={() => setConfirm(null)}>
      <div className="cm-stack">
        <div className="cm-bigprice"><small>Your maximum bid</small><strong>{taka(amount)}</strong></div>
        <p className="cm-hint">Current price: {taka(a.currentBid)}. You will only pay as much as needed to stay in front, up to your maximum. <b>Bids are binding</b>: if you win, you agree to buy this item.</p>
        {amount >= a.currentBid * 3 && <div className="cm-note cm-note-warn"><Info size={18} /><span>That’s a lot higher than the current price. Double-check the amount.</span></div>}
        <div className="portal-form-actions"><button className="cm-btn" onClick={() => setConfirm(null)}>Change</button><button className="cm-btn cm-btn-primary" disabled={busy} onClick={submitBid}><Gavel size={15} /> {busy ? 'Placing…' : 'Confirm bid'}</button></div>
      </div>
    </Modal>}
    {confirm === 'buy' && <Modal title="Buy It Now" onClose={() => setConfirm(null)}>
      <div className="cm-stack"><div className="cm-bigprice"><small>You pay</small><strong>{taka(a.buyNowPrice)}</strong></div><p className="cm-hint">This ends the auction immediately and the item is yours. You’ll choose delivery and payment next. This can’t be undone.</p>
        <div className="portal-form-actions"><button className="cm-btn" onClick={() => setConfirm(null)}>Cancel</button><button className="cm-btn cm-btn-primary" disabled={busy} onClick={buyNow}>{busy ? 'Working…' : 'Buy now'}</button></div></div>
    </Modal>}
  </div>;
}