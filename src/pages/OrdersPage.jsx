import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Download, Eye, PackageCheck, RotateCcw, Search, Star, Truck, X, Printer } from 'lucide-react';
import { downloadCsv } from '../csv.js';
import { taka } from '../utils/portal.js';
import { api, useApi, dateText, dateTimeText } from '../api.js';
import { PortalShell, Table, PageCard, StatusBadge, Loading, ErrorBox, Modal, Tabs } from '../components/PortalUI.jsx';

const NEXT = {
  placed: ['accepted', 'Accept order'],
  accepted: ['preparing', 'Start preparing'],
  preparing: ['out_for_delivery', 'Dispatch order'],
  out_for_delivery: ['delivered', 'Confirm delivered']
};
const STATUSES = ['placed', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'received', 'cancelled'];
const STATUS_LABELS = { placed: 'Order placed', accepted: 'Accepted', preparing: 'Preparing', out_for_delivery: 'Out for delivery', delivered: 'Delivered · awaiting customer confirmation', received: 'Received', cancelled: 'Cancelled' };
const ORDER_PROGRESS = ['placed', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'received'];

// One orders screen for customers (orders), sellers (seller-orders) and admins (admin-orders).
export default function OrdersPage({ shell, route, notify, navigate }) {
  const mode = route === 'admin-orders' ? 'admin' : route === 'seller-orders' ? 'seller' : 'customer';
  const endpoint = { admin: '/admin/orders', seller: '/seller/orders', customer: '/orders/mine' }[mode];
  const { data, loading, error, reload } = useApi(endpoint, { poll: 10000 });
  const ownershipRepairFor = useRef('');
  const sellerUid = shell?.user?.uid;
  useEffect(() => {
    if (mode !== 'seller' || !sellerUid || ownershipRepairFor.current === sellerUid) return;
    ownershipRepairFor.current = sellerUid;
    api('/seller/repair-ownership', { method: 'POST' })
      .then((result) => { if (result.repairedOrders || result.repairedProducts) reload(); })
      .catch(() => {});
  }, [mode, sellerUid]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [receiptSuccess, setReceiptSuccess] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState({ method: 'Seller delivery', courier: '', trackingNumber: '', estimatedDelivery: '' });
  const items = data?.items || [];
  const list = useMemo(() => items.filter((o) => (tab === 'all' || o.status === tab) && [o.orderNumber, o.customerName, o.sellerName, o.items.map((i) => i.name).join(' ')].join(' ').toLowerCase().includes(search.toLowerCase())), [items, tab, search]);
  const current = open && items.find((o) => o.id === open);
  const exportCsv = () => downloadCsv(`khamari-orders-${mode}.csv`, ['Order', 'Placed', 'Customer', 'Phone', 'Address', 'Seller', 'Items', 'Subtotal', 'Discount', 'Delivery', 'Total', 'Marketplace fee', 'Seller earnings', 'Payment', 'Status'], list.map((o) => [o.orderNumber, o.createdAt?.slice(0, 10), o.customerName, o.phone, `${o.address}${o.area ? `, ${o.area}` : ''}`, o.sellerName, o.items.map((i) => `${i.name} x${i.quantity}`).join('; '), o.subtotal, o.discount, o.deliveryFee, o.total, o.commission, o.sellerNet, `${o.paymentMethod} (${o.paymentStatus})`, o.status]));

  const change = async (order, status) => {
    if (status === 'cancelled' && !window.confirm('Cancel this order? Stock will be returned to the shop.')) return;
    if (status === 'out_for_delivery' && !deliveryInfo.estimatedDelivery) {
      notify('Please enter an estimated delivery date before dispatching.');
      return;
    }
    try {
      setBusy(true);
      const body = { status };
      if (status === 'out_for_delivery') body.deliveryInfo = deliveryInfo;
      const r = await api(`/orders/${order.id}/status`, { method: 'PATCH', body });
      notify(r.message); reload();
    } catch (e) { notify(e.message); } finally { setBusy(false); }
  };
  const canCancel = (o) => o.status === 'placed' && (mode !== 'customer' || !o.legacyStatus);
  const cols = mode === 'customer'
    ? ['Order', 'Items', 'Total', 'Payment', 'Status', 'Placed', '']
    : mode === 'seller'
      ? ['Order', 'Customer', 'Items', 'Your earnings', 'Payment method / status', 'Status', 'Placed', '']
      : ['Order', 'Customer / seller', 'Items', 'Total', 'Payment method / status', 'Status', 'Placed', ''];

  return <PortalShell {...shell}>
    {mode === "customer" && <button className="portal-secondary" onClick={() => navigate("payments")}>My payments</button>}
    <div className="portal-toolbar"><label className="portal-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders" /></label>{mode !== 'customer' && <button className="portal-secondary" onClick={exportCsv} disabled={!list.length}><Download size={15} /> Export CSV</button>}</div>
    {mode === "admin" && items.filter(o => o.paymentStatus === "submitted").map(o => <div className="portal-alert" key={o.id}><span>{o.orderNumber} · {o.paymentMethod} · {o.paymentReference} · {taka(o.total)}</span>{["paid", "rejected"].map(status => <button key={status} className="portal-secondary" disabled={busy} onClick={async () => { if (!window.confirm(`Mark payment ${status}? Verify it against your merchant statement first.`)) return; try { setBusy(true); const result = await api(`/admin/orders/${o.id}/payment`, {method:"PATCH", body:{status}}); notify(result.message); reload(); } catch(e) { notify(e.message); } finally { setBusy(false); } }}>{status === "paid" ? "Confirm payment" : "Reject payment"}</button>)}</div>)}
    {loading && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
    {data && <PageCard title={mode === 'admin' ? 'All platform orders' : mode === 'seller' ? 'Customer orders' : 'Order history'} subtitle={`${items.length} order${items.length === 1 ? '' : 's'}`}>
      <Tabs value={tab} onChange={setTab} tabs={[['all', 'All', items.length], ...STATUSES.map((s) => [s, STATUS_LABELS[s], items.filter((o) => o.status === s).length])]} />
      <Table headers={cols} empty={mode === 'customer' ? 'No orders yet. Your purchases will appear here after checkout.' : 'No orders in this view.'}
        rows={list.map((o) => ({ key: o.id, cells: mode === 'customer'
          ? [<b>{o.orderNumber}</b>, o.items.map((i) => `${i.isPreorder ? 'Pre-order: ' : ''}${i.name} × ${i.quantity}`).join(', '), taka(o.total), o.paymentStatus === 'not_required' || o.paymentMethod === 'cash' ? 'COD · no online payment' : o.paymentStatus === 'paid' ? 'Paid' : o.paymentStatus === 'submitted' ? 'Awaiting payment review' : o.paymentMethod ? 'Payment pending' : 'Payment method not recorded', <StatusBadge status={o.status} />, dateText(o.createdAt), <button className="portal-row-action" onClick={() => { setOpen(o.id); setReceiptSuccess(''); }} title="View"><Eye size={15} /></button>]
          : [<b>{o.orderNumber}</b>, mode === 'admin' ? <>{o.customerName}<small className="portal-sub">{o.sellerName}</small></> : <>{o.customerName}<small className="portal-sub">{o.phone}{o.customerEmail ? ` · ${o.customerEmail}` : ''}</small></>, o.items.map((i) => `${i.isPreorder ? 'Pre-order: ' : ''}${i.name} × ${i.quantity}`).join(', '), taka(mode === 'seller' ? o.sellerNet : o.total), <span>{String(o.paymentMethod || 'not recorded').toUpperCase()}<small className="portal-sub">{o.paymentStatus === 'not_required' || o.paymentMethod === 'cash' ? 'COD · no online payment' : o.paymentStatus === 'paid' ? (o.paymentDemo ? 'Demo paid' : 'Paid') : o.paymentStatus === 'submitted' ? 'Reference submitted · awaiting admin' : 'Not yet paid'}</small></span>, <StatusBadge status={o.status} />, dateText(o.createdAt), <button className="portal-row-action" onClick={() => { setOpen(o.id); setReceiptSuccess(''); }} title="View"><Eye size={15} /></button>] }))} />
    </PageCard>}
    {current && <Modal wide title={`Order ${current.orderNumber}`} onClose={() => setOpen(null)}>
      <div className="order-detail">
        <div className="portal-form-actions invoice-action-row">
          <button type="button" className="portal-secondary" onClick={() => window.print()}><Printer size={16}/> Download / Print invoice (PDF)</button>
        </div>
        <section className="kh-invoice-print" aria-label="Order invoice">
          <header className="kh-invoice-header">
            <div><h1>KHAMARI</h1><p>Fresh from the farm</p></div>
            <div className="kh-invoice-heading"><h2>ORDER INVOICE</h2><b>{current.orderNumber}</b><small>{dateTimeText(current.createdAt)}</small></div>
          </header>
          <div className="kh-invoice-parties">
            <div><b>Bill to</b><strong>{current.customerName}</strong><span>{current.phone}</span><span>{current.address}</span>{current.area && <span>{current.area}</span>}</div>
            <div><b>Seller</b><strong>{current.sellerName || 'Khamari Marketplace'}</strong><span>Order status: {String(current.status || '').replaceAll('_',' ')}</span><span>Payment: {String(current.paymentMethod || '').toUpperCase()} · {current.paymentMethod === 'cash' || current.paymentStatus === 'not_required' ? 'NOT REQUIRED' : String(current.paymentStatus || 'pending').toUpperCase()}</span></div>
          </div>
          <table className="kh-invoice-table"><thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>
            {(current.items || []).map((item, idx) => <tr key={`${item.productId || item.name}-${idx}`}><td>{item.name}</td><td>{item.quantity}</td><td>{taka(item.price)}</td><td>{taka(item.lineTotal ?? Number(item.price)*Number(item.quantity))}</td></tr>)}
          </tbody></table>
          <div className="kh-invoice-totals">
            <div><span>Subtotal</span><b>{taka(current.subtotal || 0)}</b></div>
            {Number(current.discount)>0 && <div><span>Discount</span><b>− {taka(current.discount)}</b></div>}
            <div><span>Delivery</span><b>{taka(current.deliveryFee || 0)}</b></div>
            <div className="grand"><span>Order total</span><b>{taka(current.total || 0)}</b></div>
          </div>
          <footer>Thank you for shopping with Khamari. Keep this invoice for your records.</footer>
        </section>
        <div className="order-detail-top"><StatusBadge status={current.status} /><span>Placed {dateTimeText(current.createdAt)}</span><span>{current.paymentMethod === 'cash' ? 'Cash on delivery' : current.paymentMethod} · {current.paymentMethod === 'cash' || current.paymentStatus === 'not_required' ? 'Payment not required' : current.paymentStatus}</span>{current.source === 'auction' && <span className="portal-badge portal-badge-amber">Auction win</span>}{current.refundStatus && <span className="portal-badge portal-badge-red">{{ requested: 'Refund in progress', partial: `Partly refunded ${taka(current.refundedAmount)}`, refunded: `Refunded ${taka(current.refundedAmount)}` }[current.refundStatus]}</span>}</div>
        {mode === 'customer' && current.paymentStatus === 'paid' && !current.paymentDemo && !receiptSuccess && (
          <div className="cod-payment-success" role="status" aria-live="polite">
            <div className="cod-payment-success-icon"><Check size={28}/></div>
            <div className="cod-payment-success-copy">
              <strong>PAYMENT SUCCESSFUL!</strong>
              <p>Your payment for order {current.orderNumber} has been confirmed.</p>
              <b className="cod-payment-success-amount">{taka(current.total)} PAID</b>
            </div>
          </div>
        )}
        <div className="checkout-items">{current.items.map((i) => <div key={i.productId}><img src={i.image} alt="" /><span><b>{i.isPreorder ? 'Pre-order · ' : ''}{i.name}</b><small>{i.quantity} × {taka(i.price)} / {i.unit}{i.isPreorder && i.preOrderDetails?.harvestDate ? ` · Expected ${i.preOrderDetails.harvestDate}` : ''}</small></span><strong>{taka(i.lineTotal)}</strong>{mode === 'customer' && current.status === 'received' && <button className="portal-secondary" onClick={() => navigate(`product-detail?id=${encodeURIComponent(i.productId)}`)}><Star size={14}/> Review product</button>}</div>)}</div>
        <div className="order-totals"><div><span>Subtotal</span><b>{taka(current.subtotal)}</b></div>{current.discount > 0 && <div><span>Discount {current.couponCode && `(${current.couponCode})`}</span><b>−{taka(current.discount)}</b></div>}<div><span>Delivery</span><b>{current.deliveryFee ? taka(current.deliveryFee) : 'Free'}</b></div><div className="order-grand"><span>Total</span><b>{taka(current.total)}</b></div>{mode !== 'customer' && <div><span>Marketplace fee ({current.commissionRate}%)</span><b>−{taka(current.commission)}</b></div>}{mode !== 'customer' && <div className="order-grand"><span>Seller earnings</span><b>{taka(current.sellerNet)}</b></div>}</div>
        <section className="portal-note order-payment-summary" style={{margin:'14px 0'}}>
          <b>Payment information</b>
          <div className="order-payment-meta">
            <span>Payment method: <strong>{({ cash: 'Cash on Delivery', bkash: 'bKash', nagad: 'Nagad', card: 'Credit / Debit Card' }[current.paymentMethod] || current.paymentMethod || 'Not recorded for this order')}</strong></span>
            <span>Payment status: <strong>{current.paymentStatus === 'not_required' || current.paymentMethod === 'cash' ? 'Not applicable · Cash on Delivery' : current.paymentStatus === 'paid' ? (current.paymentDemo ? 'Demo paid · no real transfer' : 'Paid') : current.paymentStatus === 'submitted' ? 'Reference submitted · awaiting Khamari admin verification' : current.paymentStatus === 'rejected' ? 'Payment reference rejected · contact Khamari support' : 'Payment pending'}</strong></span>
            {!current.paymentMethod && <span className="portal-muted">This is a legacy order without a saved payment method. Delivery method (pickup/courier) is separate from payment method. Contact Khamari admin to confirm the original payment choice.</span>}
            {current.paymentReference && <span>Transaction reference: <strong>{current.paymentReference}</strong></span>}
            {current.paymentReviewNote && <span>Admin note: <strong>{current.paymentReviewNote}</strong></span>}
            {current.paymentReviewedAt && <span>Reviewed: <strong>{dateTimeText(current.paymentReviewedAt)}</strong></span>}
          </div>
          {mode === 'customer' && ['bkash', 'nagad'].includes(current.paymentMethod) && current.paymentStatus !== 'paid' && current.status !== 'cancelled' && (
            <div className="portal-form-actions" style={{marginTop:12}}>
              <button type="button" className="portal-primary" onClick={() => navigate('payments')}>
                {current.paymentStatus === 'submitted' ? 'View payment verification' : 'Go to My Payments'}
              </button>
              <span className="portal-muted">Customer transfers are verified by Khamari admin. Sellers do not collect payments separately.</span>
            </div>
          )}
        </section>
        {current.deliveryInfo && <div className="portal-note" style={{margin:'14px 0'}}><b><Truck size={15} style={{verticalAlign:'-3px'}}/> Delivery information</b><p style={{margin:'8px 0 0'}}>Delivery method: {current.deliveryInfo.method || 'Seller delivery'}{current.deliveryInfo.courier ? ` · Courier: ${current.deliveryInfo.courier}` : ''}{current.deliveryInfo.trackingNumber ? ` · Tracking: ${current.deliveryInfo.trackingNumber}` : ''}{current.deliveryInfo.estimatedDelivery ? ` · Estimated delivery: ${current.deliveryInfo.estimatedDelivery}` : ''}</p></div>}
        <div className="order-detail-cols">
          <div><h4>Deliver to</h4><p><b>{current.customerName}</b><br />{current.phone}{current.customerEmail ? <><br />{current.customerEmail}</> : null}<br />{current.address}{current.area ? `, ${current.area}` : ''}</p>{mode !== 'seller' && <p className="portal-sub">Seller: {current.sellerName}</p>}</div>
          <div>
            <h4>Order progress</h4>
            {mode === 'customer' && current.status === 'placed' && <p className="portal-note">Your order has been submitted. The seller will review and accept it before preparing your items.</p>}
            {mode === 'customer' && current.status === 'accepted' && <p className="portal-note">The seller accepted your order and is preparing it.</p>}
            {mode === 'customer' && current.status === 'preparing' && <p className="portal-note">Your items are being prepared. The seller will add delivery details when dispatching.</p>}
            {mode === 'customer' && current.status === 'delivered' && <p className="portal-note">The seller marked this order as delivered. If you have physically received the items, click Confirm received below. COD receipt confirmation does not process or verify a payment.</p>}
            {mode === 'customer' && current.status === 'received' && <p className="portal-note">Receipt confirmed. Your order history has been updated. COD is recorded as not requiring online payment. You can now review each product in this order.</p>}
            {mode === 'seller' && current.status === 'delivered' && <p className="portal-note">Delivery has been marked. The order is now awaiting customer confirmation. Only the customer can mark it Received.</p>}
            {current.status === 'cancelled' ? (
              <ol className="order-timeline">{(current.history || []).map((h, i) => <li key={i}><Check size={13} /><span><b>{STATUS_LABELS[h.status] || h.status}</b><small>{dateTimeText(h.at)} · {h.by}</small></span></li>)}</ol>
            ) : (
              <ol className="order-progress-list">
                {ORDER_PROGRESS.map((step, index) => {
                  const currentIndex = ORDER_PROGRESS.indexOf(current.status);
                  const complete = index <= currentIndex;
                  const event = (current.history || []).find((entry) => entry.status === step);
                  return <li key={step} className={`${complete ? 'is-complete' : ''} ${index === currentIndex ? 'is-current' : ''}`}>
                    <span className="order-progress-marker">{complete ? <Check size={13} /> : index + 1}</span>
                    <span className="order-progress-copy"><b>{STATUS_LABELS[step]}</b><small>{event ? `${dateTimeText(event.at)} · ${event.by}` : index === currentIndex ? 'Current status' : 'Awaiting update'}</small></span>
                  </li>;
                })}
              </ol>
            )}
          </div>
        </div>
        {mode !== 'customer' && current.status === 'preparing' && <section style={{marginTop:18,padding:16,border:'1px solid var(--border,#B3CFE5)',borderRadius:12}}><h4 style={{marginTop:0}}>Delivery details before dispatch</h4><div className="portal-form-grid"><label>Delivery method<select value={deliveryInfo.method} onChange={e=>setDeliveryInfo(v=>({...v,method:e.target.value}))}><option>Seller delivery</option><option>Third-party courier</option><option>Customer pickup</option></select></label><label>Courier / delivery person<input value={deliveryInfo.courier} onChange={e=>setDeliveryInfo(v=>({...v,courier:e.target.value}))} placeholder="Name or courier company"/></label><label>Tracking / consignment number<input value={deliveryInfo.trackingNumber} onChange={e=>setDeliveryInfo(v=>({...v,trackingNumber:e.target.value}))} placeholder="Optional tracking number"/></label><label>Estimated delivery date<input type="date" min={new Date().toISOString().slice(0,10)} value={deliveryInfo.estimatedDelivery} onChange={e=>setDeliveryInfo(v=>({...v,estimatedDelivery:e.target.value}))} required/></label></div><p className="portal-muted">Enter the expected arrival date. Khamari will not mark the order delivered automatically.</p></section>}
        <div className="portal-form-actions">
          {mode === 'customer' && current.status === 'delivered' && <button className="portal-primary" disabled={busy} onClick={() => change(current, 'received')}><PackageCheck size={15} /> Confirm received</button>}
          {mode === 'customer' && current.status === 'received' && <div className="portal-note" role="status">You confirmed receipt of this order. No COD payment action is required in Khamari.</div>}
          {mode === 'customer' && current.status === 'received' && current.items.map(i => <button key={i.productId} className="portal-secondary" onClick={() => navigate(`product-detail?id=${encodeURIComponent(i.productId)}`)}><Star size={15} /> Review {i.name}</button>)}
          {mode === 'customer' && current.refundStatus && <button className="portal-secondary" onClick={() => navigate('refunds')}>View refund</button>}
          {mode === 'customer' && current.paymentStatus === 'paid' && ['delivered', 'shipped'].includes(current.legacyStatus || current.status) && !current.activeRefundId && current.refundStatus !== 'refunded' && <button className="portal-secondary" onClick={() => navigate(`refund-request?order=${current.id}`)}><RotateCcw size={15} /> Request refund / return</button>}
          {canCancel(current) && <button className="portal-secondary" disabled={busy} onClick={() => change(current, 'cancelled')}><X size={15} /> Cancel order</button>}
           {mode !== 'customer' && NEXT[current.status] && <button className="portal-primary" disabled={busy} onClick={() => change(current, NEXT[current.status][0])}><Check size={15} /> {NEXT[current.status][1]}</button>}
        </div>
      </div>
    </Modal>}
  </PortalShell>;
}