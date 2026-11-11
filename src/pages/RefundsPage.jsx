import { useMemo, useState } from 'react';
import { Banknote, CheckCircle2, Clock3, RotateCcw, Search, ShieldAlert, Send } from 'lucide-react';
import { api, assetUrl, dateText, dateTimeText, useApi } from '../api.js';
import { taka } from '../utils/portal.js';
import { PortalShell, StatCard, Table, PageCard, Badge, Loading, ErrorBox, Modal, Tabs } from '../components/PortalUI.jsx';

const TONE = { requested: 'amber', approved: 'blue', return_shipped: 'blue', refund_pending: 'amber', refunded: 'green', rejected: 'red', escalated: 'red', cancelled: 'red' };
const LABEL = { requested: 'Awaiting seller', approved: 'Approved – return item', return_shipped: 'Return on the way', refund_pending: 'Refund processing', refunded: 'Refunded', rejected: 'Rejected', escalated: 'With Khamari support', cancelled: 'Withdrawn' };
const StatusPill = ({ status }) => <Badge tone={TONE[status] || 'blue'}>{LABEL[status] || status}</Badge>;
const GROUPS = { open: ['requested', 'approved', 'return_shipped', 'refund_pending', 'escalated'], done: ['refunded'], closed: ['rejected', 'cancelled'] };

// The step tracker above the detail.
function Tracker({ r }) {
  const ret = r.kind === 'return_refund';
  const steps = [['Requested', ['requested']], ['Seller review', ['requested', 'escalated']], ...(ret ? [['Return item', ['approved', 'return_shipped']]] : []), ['Refund processing', ['refund_pending']], ['Refunded', ['refunded']]];
  const order = ['requested', 'approved', 'return_shipped', 'refund_pending', 'refunded'];
  const idx = { requested: 1, escalated: 1, approved: ret ? 2 : 1, return_shipped: ret ? 2 : 1, refund_pending: ret ? 3 : 2, refunded: ret ? 4 : 3 }[r.status] ?? 0;
  const dead = ['rejected', 'cancelled'].includes(r.status);
  void order;
  return <div className="rf-steps">{steps.map(([label], i) => <div key={label} className={`rf-step ${dead && i === 1 ? 'bad' : i < idx ? 'done' : i === idx && !dead ? 'now' : ''}`}><i>{i < idx && !dead ? '✓' : dead && i === 1 ? '!' : i + 1}</i>{label}</div>)}</div>;
}

function Detail({ id, mode, onClose, onChanged, notify, navigate }) {
  const { data, loading, error, reload } = useApi(`/refunds/${id}`, { poll: 8000 });
  const r = data?.item;
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [ship, setShip] = useState({ courier: '', trackingNo: '' });
  const [pay, setPay] = useState({ method: '', reference: '' });
  const [restock, setRestock] = useState(true);
  const [skip, setSkip] = useState(false);
  const [panel, setPanel] = useState('');
  const [busy, setBusy] = useState(false);
  const act = async (fn) => { try { setBusy(true); const res = await fn(); notify(res.message); setPanel(''); setNote(''); reload(); onChanged(); } catch (e) { notify(e.message); } finally { setBusy(false); } };
  const patch = (path, body) => api(path, { method: 'PATCH', body });
  const has = (a) => r?.actions.includes(a);
  return <Modal wide title={r ? `Refund ${r.refundNumber}` : 'Refund'} onClose={onClose}>
    {loading && !r && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
    {r && <div className="order-detail">
      <div className="order-detail-top"><StatusPill status={r.status} /><span>Order {r.orderNumber}</span><span>Opened {dateTimeText(r.createdAt)}</span><b>{taka(r.amount)}</b></div>
      <Tracker r={r} />
      {r.status === 'requested' && mode === 'seller' && <div className="cm-note cm-note-warn"><Clock3 size={18} /><span>Please respond by <b>{dateText(r.sellerDeadline)}</b>. After that this request goes to Khamari support.</span></div>}
      {r.status === 'approved' && mode === 'customer' && <div className="cm-note cm-note-info"><RotateCcw size={18} /><span><b>Send the item back</b>Ship it by {dateText(r.shipBy)} and add the courier and tracking number below. {r.messages?.length ? '' : 'You can message the seller for the return address.'}</span></div>}
      {r.status === 'rejected' && <div className="cm-note cm-note-bad"><ShieldAlert size={18} /><span><b>Declined</b>{r.rejectedReason}{mode === 'customer' && has('escalate') ? ` You can ask Khamari support to review until ${dateText(r.escalateUntil)}.` : ''}</span></div>}
      {r.status === 'refunded' && <div className="cm-note cm-note-good"><CheckCircle2 size={18} /><span><b>{taka(r.amount)} refunded</b>Sent via {r.payoutMethod} · ref {r.payoutReference} · {dateTimeText(r.refundedAt)}</span></div>}

      <div className="order-detail-cols">
        <div>
          <h4>Items</h4>
          <div className="checkout-items">{r.items.map((i) => <div key={i.productId}><img src={assetUrl(i.image)} alt="" /><span><b>{i.name}</b><small>{i.quantity} × {taka(i.price)}</small></span><strong>{taka(i.lineTotal)}</strong></div>)}</div>
          <div className="order-totals"><div><span>Items{r.itemsAmount !== r.items.reduce((n, i) => n + i.lineTotal, 0) ? ' (after coupon)' : ''}</span><b>{taka(r.itemsAmount)}</b></div>{r.deliveryRefund > 0 && <div><span>Delivery fee</span><b>{taka(r.deliveryRefund)}</b></div>}<div className="order-grand"><span>Refund total</span><b>{taka(r.amount)}</b></div>{mode === 'seller' && <div><span>Deducted from your earnings</span><b>{taka(r.sellerDeduction)}</b></div>}</div>
          <h4>Reason</h4><p><b>{r.reasonLabel}</b><br />{r.details}</p>
          {r.evidence.length > 0 && <><h4>Photos</h4><div className="rf-photos">{r.evidence.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Evidence" /></a>)}</div></>}
          <h4>{mode === 'customer' ? 'Refund sent to' : 'Customer'}</h4>
          <p>{mode === 'customer' ? <>{r.refundTo?.method} · {r.refundTo?.account}</> : <><b>{r.customerName}</b> · {r.customerEmail}<br />Pay to {r.refundTo?.method}: <b>{r.refundTo?.account}</b></>}{mode === 'admin' && <><br />Seller: {r.sellerName}</>}</p>
          {r.returnShipment && <p><b>Return shipment:</b> {r.returnShipment.courier} · {r.returnShipment.trackingNo} ({dateText(r.returnShipment.shippedAt)})</p>}
        </div>
        <div>
          <h4>Progress</h4>
          <ul className="rf-timeline">{(r.history || []).map((h, i) => <li key={i}><i /><span><b>{LABEL[h.status] || h.status}</b><small>{dateTimeText(h.at)} · {h.by}{h.byRole === 'system' ? '' : ` (${h.byRole})`}</small>{h.note && <p>{h.note}</p>}</span></li>)}</ul>
          <h4>Messages</h4>
          <div className="rf-thread">{(r.messages || []).length ? r.messages.map((m, i) => <div key={i} className={`rf-msg ${m.from === r.role ? 'me' : ''}`}><small>{m.name} · {m.from} · {dateTimeText(m.at)}</small>{m.text}</div>) : <small className="portal-sub">No messages yet.</small>}</div>
          {has('message') && <div style={{ display: 'flex', gap: 8 }}><input style={{ flex: 1, border: '1.5px solid var(--pale)', borderRadius: 10, padding: '9px 12px', font: 'inherit' }} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Write a message…" maxLength={800} onKeyDown={(e) => e.key === 'Enter' && msg.trim().length > 1 && act(async () => { const res = await api(`/refunds/${r.id}/messages`, { method: 'POST', body: { text: msg } }); setMsg(''); return res; })} /><button className="cm-btn cm-btn-sm" disabled={busy || msg.trim().length < 2} onClick={() => act(async () => { const res = await api(`/refunds/${r.id}/messages`, { method: 'POST', body: { text: msg } }); setMsg(''); return res; })}><Send size={14} /></button></div>}
        </div>
      </div>

      {/* actions */}
      <div className="rf-actions rf-form">
        {has('ship') && (panel === 'ship' ? <div className="rf-grid2"><div><label className="lbl">Courier</label><input value={ship.courier} onChange={(e) => setShip({ ...ship, courier: e.target.value })} placeholder="e.g. Sundarban" /></div><div><label className="lbl">Tracking / receipt no.</label><input value={ship.trackingNo} onChange={(e) => setShip({ ...ship, trackingNo: e.target.value })} /></div><div><button className="cm-btn cm-btn-primary" disabled={busy} onClick={() => act(() => patch(`/refunds/${r.id}/return-shipped`, ship))}>Confirm shipment</button></div></div> : <button className="cm-btn cm-btn-primary" onClick={() => setPanel('ship')}>I’ve sent the item back</button>)}
        {(has('reject') || has('reject_return') || has('escalate')) && panel === 'note' && <div><label className="lbl">{has('escalate') ? 'Why do you disagree with the decision?' : 'Explain your decision (the customer will see this)'}</label><textarea value={note} onChange={(e) => setNote(e.target.value)} minLength={10} maxLength={400} /><div className="portal-form-actions"><button className="cm-btn" onClick={() => setPanel('')}>Back</button><button className="cm-btn cm-btn-danger" disabled={busy || note.trim().length < 10} onClick={() => act(() => has('escalate') ? patch(`/refunds/${r.id}/escalate`, { note }) : patch(`/refunds/${r.id}/respond`, { action: 'reject', note }))}>{has('escalate') ? 'Escalate to Khamari' : 'Decline request'}</button></div></div>}
        {has('process') && (panel === 'pay' ? <div className="rf-grid2"><div><label className="lbl">Sent via</label><select value={pay.method || r.refundTo?.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="bank">Bank transfer</option><option value="cash">Cash</option></select></div><div><label className="lbl">Transaction reference</label><input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} placeholder="e.g. 8N7A6D5E4C" /></div><div><button className="cm-btn cm-btn-primary" disabled={busy} onClick={() => { if (window.confirm(`Confirm you have sent ${taka(r.amount)} to ${r.refundTo?.account}?`)) act(() => patch(`/admin/refunds/${r.id}/process`, { method: pay.method || r.refundTo?.method, reference: pay.reference })); }}>Mark as refunded</button></div></div> : <button className="cm-btn cm-btn-primary" onClick={() => setPanel('pay')}><Banknote size={16} /> Record refund payment ({taka(r.amount)})</button>)}
        {has('received') && (panel === 'recv' ? <div><label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" style={{ width: 'auto' }} checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Put the item back in stock (only if it’s resalable)</label><div className="portal-form-actions"><button className="cm-btn" onClick={() => setPanel('')}>Back</button><button className="cm-btn cm-btn-primary" disabled={busy} onClick={() => act(() => patch(`/refunds/${r.id}/received`, { restock }))}>Confirm item received</button></div></div> : <button className="cm-btn cm-btn-primary" onClick={() => setPanel('recv')}>Item received</button>)}
        {has('approve') && panel === '' && <div className="portal-form-actions" style={{ justifyContent: 'flex-start' }}>
          {mode === 'admin' && r.kind === 'return_refund' && <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}><input type="checkbox" style={{ width: 'auto' }} checked={skip} onChange={(e) => setSkip(e.target.checked)} /> Refund without return</label>}
          <button className="cm-btn cm-btn-primary" disabled={busy} onClick={() => act(() => patch(`/refunds/${r.id}/respond`, { action: 'approve', skipReturn: skip }))}><CheckCircle2 size={16} /> {r.kind === 'return_refund' && !skip ? 'Approve & request return' : 'Approve refund'}</button>
          {(has('reject') || has('reject_return')) && <button className="cm-btn cm-btn-danger" onClick={() => setPanel('note')}>Decline</button>}</div>}
        {!has('approve') && panel === '' && (has('reject') || has('reject_return')) && <button className="cm-btn cm-btn-danger" onClick={() => setPanel('note')}>{has('reject_return') ? 'Item not as expected – decline' : 'Decline'}</button>}
        {has('escalate') && panel === '' && <button className="cm-btn" onClick={() => setPanel('note')}><ShieldAlert size={16} /> Escalate to Khamari support</button>}
        {has('cancel') && panel === '' && <button className="cm-btn cm-btn-danger" disabled={busy} onClick={() => window.confirm('Withdraw this refund request?') && act(() => patch(`/refunds/${r.id}/cancel`, {}))}>Withdraw request</button>}
      </div>
      <p className="cm-hint">Questions about the policy? <a href="#refund-policy" onClick={() => navigate('refund-policy')}>Read the returns &amp; refund policy</a>.</p>
    </div>}
  </Modal>;
}

// One screen for customers (refunds), sellers (seller-refunds) and administrators (admin-refunds).
export default function RefundsPage({ shell, route, notify, navigate }) {
  const mode = route === 'admin-refunds' ? 'admin' : route === 'seller-refunds' ? 'seller' : 'customer';
  const endpoint = { admin: '/admin/refunds', seller: '/seller/refunds', customer: '/refunds/mine' }[mode];
  const { data, loading, error, reload } = useApi(endpoint, { poll: 20000 });
  const [tab, setTab] = useState(mode === 'admin' ? 'attention' : 'open');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] || '').get('open'));
  const items = data?.items || [];
  const attention = (r) => (mode === 'seller' ? ['requested', 'return_shipped'].includes(r.status) : r.status === 'escalated' || r.status === 'refund_pending');
  const list = useMemo(() => items.filter((r) => (tab === 'attention' ? attention(r) : tab === 'all' ? true : GROUPS[tab].includes(r.status)) && [r.refundNumber, r.orderNumber, r.customerName, r.sellerName, ...r.items.map((i) => i.name)].join(' ').toLowerCase().includes(search.toLowerCase())), [items, tab, search]); // eslint-disable-line react-hooks/exhaustive-deps
  const tabs = [...(mode !== 'customer' ? [['attention', mode === 'seller' ? 'Needs my action' : 'Needs action', items.filter(attention).length]] : []), ['open', 'In progress', items.filter((r) => GROUPS.open.includes(r.status)).length], ['done', 'Refunded', items.filter((r) => r.status === 'refunded').length], ['closed', 'Closed', items.filter((r) => GROUPS.closed.includes(r.status)).length], ['all', 'All', items.length]];
  const st = data?.stats;
  const cols = mode === 'customer' ? ['Refund', 'Order', 'Items', 'Amount', 'Status', 'Opened'] : ['Refund', mode === 'admin' ? 'Customer / seller' : 'Customer', 'Reason', 'Amount', 'Status', 'Opened'];
  return <PortalShell {...shell}>
    <div className="portal-toolbar"><label className="portal-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search refunds" /></label><button className="portal-secondary" onClick={() => navigate('refund-policy')}>Refund policy</button>{mode === 'customer' && <button className="portal-primary" onClick={() => navigate('orders')}>Request a refund</button>}</div>
    {loading && !data && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
    {mode === 'admin' && st && <div className="portal-stat-grid">
      <StatCard icon={RotateCcw} label="Open requests" value={st.open} trend="Not finished yet" />
      <StatCard icon={ShieldAlert} label="Escalated" value={st.escalated} trend="Need a decision" tone="amber" />
      <StatCard icon={Banknote} label="To pay out" value={taka(st.toPayAmount)} trend={`${st.toPay} approved refund${st.toPay === 1 ? '' : 's'}`} tone="amber" />
      <StatCard icon={CheckCircle2} label="Refunded" value={taka(st.refundedAmount)} trend={`${st.refunded} completed`} tone="green" />
    </div>}
    {data && <PageCard title={mode === 'admin' ? 'All refund requests' : mode === 'seller' ? 'Returns & refunds' : 'My refunds & returns'} subtitle={`${items.length} request${items.length === 1 ? '' : 's'}`}>
      <Tabs value={tab} onChange={setTab} tabs={tabs} />
      <Table headers={cols} empty={mode === 'customer' ? 'No refund requests. Open My orders to request one for a delivered order.' : 'Nothing here.'}
        rows={list.map((r) => ({ key: r.id, cells: [<button className="portal-row-action" style={{ width: 'auto', padding: '0 8px', fontWeight: 700 }} onClick={() => setOpen(r.id)}>{r.refundNumber}</button>,
          mode === 'customer' ? r.orderNumber : mode === 'admin' ? <>{r.customerName}<small className="portal-sub">{r.sellerName}</small></> : r.customerName,
          mode === 'customer' ? r.items.map((i) => `${i.name} × ${i.quantity}`).join(', ') : r.reasonLabel, taka(r.amount), <StatusPill status={r.status} />, dateText(r.createdAt)] }))} />
    </PageCard>}
    {open && <Detail id={open} mode={mode} notify={notify} navigate={navigate} onClose={() => setOpen(null)} onChanged={reload} />}
  </PortalShell>;
}