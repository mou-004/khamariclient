import { useState } from 'react';
import { ArrowLeft, CheckCircle2, ImagePlus, Info, X } from 'lucide-react';
import { api, assetUrl, uploadEvidenceImage, useApi } from '../api.js';
import { taka } from '../utils/portal.js';
import { hashId } from '../components/AuctionParts.jsx';
import { PortalShell, Loading, ErrorBox } from '../components/PortalUI.jsx';

const SELLER_FAULT = ['damaged', 'spoiled', 'wrong_item', 'not_as_described', 'missing_items', 'not_received'];
const HELP = { damaged: 'Broken, leaking or defective on arrival.', spoiled: 'Fresh produce, dairy or fish that was off or poor quality.', wrong_item: 'You received something different from what you ordered.', not_as_described: 'The item does not match its product description.', missing_items: 'Part of your order was not in the package.', not_received: 'The order was shipped but never reached you.', changed_mind: 'Not available for fresh produce or live animals.', other: 'Tell us what happened.' };

// Customer: ask for a refund / return on one order.
export default function RefundRequestPage({ shell, navigate, notify }) {
  const orderId = hashId() || new URLSearchParams(window.location.hash.split('?')[1] || '').get('order') || '';
  const { data, loading, error } = useApi(orderId ? `/refunds/eligibility/${orderId}` : '');
  const [sel, setSel] = useState({});            // productId -> quantity
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [photos, setPhotos] = useState([]);
  const [method, setMethod] = useState('');
  const [account, setAccount] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(null);

  if (!orderId) return <PortalShell {...shell}><div className="cm-empty"><b>Choose an order first</b>Open My orders and press “Request refund” on the order.<br /><br /><button className="cm-btn cm-btn-primary" onClick={() => navigate('orders')}>Go to my orders</button></div></PortalShell>;
  if (loading) return <PortalShell {...shell}><Loading /></PortalShell>;
  if (error) return <PortalShell {...shell}><ErrorBox message={error} onRetry={() => window.location.reload()} /><button className="cm-btn" onClick={() => navigate('orders')}>Back to orders</button></PortalShell>;

  if (done) return <PortalShell {...shell}><div className="rf-success">
    <div className="tick"><CheckCircle2 size={32} /></div><h2>Refund request submitted</h2>
    <p>Reference <b>{done.refundNumber}</b> · estimated refund <b>{taka(done.amount)}</b></p>
    <p style={{ color: 'var(--muted)' }}>The seller has 3 days to respond. If they don’t, Khamari support steps in. We’ll notify you at every step and you can follow progress any time.</p>
    <div className="portal-form-actions" style={{ justifyContent: 'center' }}><button className="cm-btn cm-btn-primary" onClick={() => navigate('refunds')}>Track my refund</button><button className="cm-btn" onClick={() => navigate('orders')}>Back to orders</button></div>
  </div></PortalShell>;

  const chosen = data.reasons.find((r) => r.code === reason);
  const method0 = method || data.defaultMethod;
  const items = data.items;
  const lines = Object.entries(sel).filter(([, q]) => q > 0).map(([productId, quantity]) => ({ productId, quantity }));
  const toggle = (i) => setSel((s) => ({ ...s, [i.productId]: s[i.productId] ? 0 : 1 }));
  const step = (i, d) => setSel((s) => ({ ...s, [i.productId]: Math.min(i.remaining, Math.max(1, (s[i.productId] || 1) + d)) }));
  const blocked = (i) => i.remaining < 1 || (reason === 'changed_mind' && i.freshGoods);

  // Estimate only: the server calculates the final amount.
  const o = data.order;
  const gross = lines.reduce((n, l) => n + (items.find((i) => i.productId === l.productId)?.price || 0) * l.quantity, 0);
  const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0) || 1;
  const itemsAmount = Math.round((gross - ((o.discount || 0) * gross) / subtotal) * 100) / 100;
  const whole = items.filter((i) => i.remaining > 0).every((i) => (sel[i.productId] || 0) === i.remaining);
  const delivery = reason && SELLER_FAULT.includes(reason) && whole && lines.length ? Number(o.deliveryFee || 0) : 0;
  const total = itemsAmount + delivery;

  const addPhotos = async (files) => {
    const room = data.maxEvidence - photos.length;
    if (!room) return;
    setUploading(true);
    try { for (const file of [...files].slice(0, room)) { const url = await uploadEvidenceImage(file); setPhotos((p) => [...p, url]); } }
    catch (e) { notify(e.message); } finally { setUploading(false); }
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!lines.length) return notify('Choose at least one item.');
    if (!reason) return notify('Choose a reason.');
    try { setBusy(true); const r = await api('/refunds', { method: 'POST', body: { orderId, reason, details, items: lines, evidence: photos, refundTo: { method: method0, account } } }); setDone(r); }
    catch (err) { notify(err.message); } finally { setBusy(false); }
  };

  return <PortalShell {...shell}>
    <button className="cm-crumb" onClick={() => navigate('orders')}><ArrowLeft size={16} /> Back to my orders</button>
    {!data.anyAllowed && <div className="cm-note cm-note-warn" style={{ marginBottom: 16 }}><Info size={20} /><span><b>This order can’t be refunded right now</b>{data.reasons[0]?.error}</span></div>}
    <form className="rf-layout rf-form" onSubmit={submit}>
      <div>
        <section className="rf-section"><h2><span>1</span> What’s the problem with order {o.orderNumber}?</h2><p>Choose the items and how many.</p>
          {items.map((i) => <div key={i.productId} className={`rf-item ${blocked(i) ? 'off' : ''}`}>
            <input type="checkbox" checked={Boolean(sel[i.productId])} disabled={blocked(i)} onChange={() => toggle(i)} aria-label={`Select ${i.name}`} />
            <img src={assetUrl(i.image)} alt="" /><span><b>{i.name}</b><small>{taka(i.price)} · ordered {i.quantity}{i.remaining < i.quantity ? ` · ${i.remaining} left to refund` : ''}{reason === 'changed_mind' && i.freshGoods ? ' · fresh goods can’t be returned' : ''}</small></span>
            {sel[i.productId] > 0 && <span className="rf-qty"><button type="button" onClick={() => step(i, -1)}>−</button><b>{sel[i.productId]}</b><button type="button" onClick={() => step(i, 1)}>+</button></span>}
          </div>)}
        </section>
        <section className="rf-section"><h2><span>2</span> Why are you asking for a refund?</h2><p>Pick the closest reason.</p>
          <div className="rf-reasons">{data.reasons.map((r) => <button type="button" key={r.code} className={`rf-reason ${reason === r.code ? 'on' : ''}`} disabled={!r.ok} onClick={() => setReason(r.code)}><span className="rf-dot" /><span><b>{r.label}</b><small>{r.ok ? HELP[r.code] : r.error}</small></span></button>)}</div>
          {chosen?.returnRequired && <div className="cm-note cm-note-info" style={{ marginTop: 12 }}><Info size={18} /><span>For this reason you’ll be asked to send the item back once the seller approves. Your refund is paid after the seller confirms it arrived.</span></div>}
        </section>
        <section className="rf-section"><h2><span>3</span> Tell us more</h2><p>{chosen?.evidence ? 'Photos are required for this reason.' : 'Photos help us decide faster.'}</p>
          <label className="lbl" htmlFor="rf-details">What happened?</label>
          <textarea id="rf-details" value={details} onChange={(e) => setDetails(e.target.value)} minLength={10} maxLength={1000} required placeholder="Describe the problem, e.g. which item and what is wrong with it." />
          <label className="lbl">Photos ({photos.length}/{data.maxEvidence}){chosen?.evidence && ' *'}</label>
          <div className="rf-upload">{photos.map((u) => <div className="rf-thumb" key={u}><img src={assetUrl(u)} alt="Evidence" /><button type="button" aria-label="Remove photo" onClick={() => setPhotos((p) => p.filter((x) => x !== u))}><X size={12} /></button></div>)}
            {photos.length < data.maxEvidence && <label className="rf-add"><ImagePlus size={20} />{uploading ? 'Uploading…' : 'Add photo'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={uploading} onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} /></label>}</div>
        </section>
        <section className="rf-section"><h2><span>4</span> Where should we send your refund?</h2><p>Refunds are sent by Khamari support to this account.</p>
          <div className="rf-grid2"><div><label className="lbl" htmlFor="rf-method">Method</label><select id="rf-method" value={method0} onChange={(e) => setMethod(e.target.value)}><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="bank">Bank account</option></select></div>
            <div><label className="lbl" htmlFor="rf-acc">{method0 === 'bank' ? 'Account details' : 'Mobile number'}</label><input id="rf-acc" value={account} onChange={(e) => setAccount(e.target.value)} required minLength={5} maxLength={80} placeholder={method0 === 'bank' ? 'Bank, branch, account name and number' : '01XXXXXXXXX'} /></div></div>
        </section>
      </div>
      <aside className="rf-section rf-summary"><h2>Refund summary</h2><p>Estimate. The final amount is confirmed when you submit.</p>
        {lines.length ? lines.map((l) => { const i = items.find((x) => x.productId === l.productId); return <div className="rf-sumrow" key={l.productId}><span>{i.name} × {l.quantity}</span><b>{taka(i.price * l.quantity)}</b></div>; }) : <p>No items selected yet.</p>}
        {o.discount > 0 && lines.length > 0 && <div className="rf-sumrow"><span>Coupon share</span><b>−{taka(Math.round((gross - itemsAmount) * 100) / 100)}</b></div>}
        {delivery > 0 && <div className="rf-sumrow"><span>Delivery fee returned</span><b>{taka(delivery)}</b></div>}
        <div className="rf-sumrow total"><span>Estimated refund</span><b>{taka(total)}</b></div>
        <button className="cm-btn cm-btn-primary cm-btn-block" style={{ marginTop: 14 }} disabled={busy || uploading || !data.anyAllowed}>{busy ? 'Submitting…' : 'Submit refund request'}</button>
        <p className="cm-hint">By submitting you agree to the <a href="#refund-policy" onClick={() => navigate('refund-policy')}>returns &amp; refund policy</a>.</p>
      </aside>
    </form>
  </PortalShell>;
}