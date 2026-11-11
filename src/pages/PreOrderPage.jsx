import { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Clock3, Package, RefreshCw, Sprout } from 'lucide-react';
import { api, useApi, dateText, dateTimeText } from '../api.js';
import { taka } from '../utils/money';
import { PortalShell, PageCard, Loading, ErrorBox, StatusBadge, Table } from '../components/PortalUI.jsx';
import ProductCard from '../components/ProductCard.jsx';
import './PreOrderPage.css';

const ORDER_NEXT = {
  placed: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: ['received'],
  received: [],
  cancelled: []
};
const LEGACY_STATUSES = ['requested', 'confirmed', 'ready', 'completed', 'cancelled'];
const isPreorderLine = (line) => line?.isPreorder === true || line?.listingType === 'preorder';
const preorderLines = (order) => (Array.isArray(order?.items) ? order.items : []).filter(isPreorderLine);
const lineQuantity = (lines) => lines.reduce((total, line) => total + Number(line.quantity || 0), 0);
const lineValue = (lines) => lines.reduce((total, line) => total + Number(line.lineTotal ?? (Number(line.price || 0) * Number(line.quantity || 0))), 0);
const dateLabel = (value) => value ? dateText(value) : 'To be confirmed';

export default function PreOrderPage({ navigate, user, notify, route, addToCart, shell, products: suppliedProducts = [] }) {
  const adminMode = route === 'preorders';
  const publicMode = route === 'preorder';
  const orderEndpoint = adminMode ? '/admin/orders' : route === 'my-preorders' ? '/orders/mine' : null;
  const legacyEndpoint = adminMode ? '/admin/preorders' : route === 'my-preorders' ? '/preorders/mine' : null;

  // Public pre-order products are the same approved seller products used by the marketplace.
  const publicFeed = useApi(publicMode ? '/products?limit=200' : null, { auto: true, poll: 30000 });
  const orderFeed = useApi(orderEndpoint, { poll: 10000 });
  // Retain visibility of older harvest-box requests created by the previous pre-order form.
  const legacyFeed = useApi(legacyEndpoint, { poll: 15000 });

  const [busyId, setBusyId] = useState('');
  const [search, setSearch] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const products = useMemo(() => (publicFeed.data?.items || suppliedProducts)
    .filter((product) => product.listingType === 'preorder'
      && product.status === 'active'
      && (!product.preOrderDetails?.preorderDeadline || product.preOrderDetails.preorderDeadline >= today))
    .sort((a, b) => String(a.preOrderDetails?.harvestDate || '9999-12-31').localeCompare(String(b.preOrderDetails?.harvestDate || '9999-12-31'))),
  [publicFeed.data, suppliedProducts, today]);

  const orderItems = useMemo(() => (orderFeed.data?.items || [])
    .filter((order) => preorderLines(order).length > 0)
    .filter((order) => !search || [
      order.orderNumber,
      order.customerName,
      order.customerEmail,
      ...preorderLines(order).map((line) => line.name)
    ].join(' ').toLowerCase().includes(search.toLowerCase())),
  [orderFeed.data, search]);

  const legacyItems = useMemo(() => (legacyFeed.data?.items || [])
    .filter((item) => !search || [item.orderNumber, item.customerName, item.phone, item.productName].join(' ').toLowerCase().includes(search.toLowerCase())),
  [legacyFeed.data, search]);

  const changeOrderStatus = async (order, status) => {
    try {
      setBusyId(order.id);
      const result = await api(`/orders/${order.id}/status`, { method: 'PATCH', body: { status } });
      notify(result.message);
      orderFeed.reload();
    } catch (error) {
      notify(error.message);
    } finally {
      setBusyId('');
    }
  };

  const changeLegacyStatus = async (item, status) => {
    try {
      setBusyId(item.id);
      const result = await api(`/admin/preorders/${item.id}/status`, { method: 'PATCH', body: { status } });
      notify(result.message);
      legacyFeed.reload();
    } catch (error) {
      notify(error.message);
    } finally {
      setBusyId('');
    }
  };

  if (adminMode || route === 'my-preorders') {
    const ordersLoading = orderFeed.loading || legacyFeed.loading;
    const ordersError = orderFeed.error || legacyFeed.error;
    return <PortalShell {...shell} user={user} navigate={navigate} title={adminMode ? 'Pre-order management' : 'My pre-orders'} subtitle={adminMode ? 'Review customer orders containing seller-added pre-order products.' : 'Track orders for products you reserved before harvest.'}>
      <PageCard title={adminMode ? 'Seller product pre-orders' : 'Your seller product pre-orders'} subtitle={`${orderItems.length} order${orderItems.length === 1 ? '' : 's'}`}>
        {adminMode && <input className="portal-input" placeholder="Search order, customer or product" value={search} onChange={(event) => setSearch(event.target.value)} />}
        {ordersLoading && <Loading />}
        {ordersError && <ErrorBox message={ordersError} onRetry={() => { orderFeed.reload(); legacyFeed.reload(); }} />}
        {orderFeed.data && <Table
          headers={adminMode ? ['Order', 'Customer', 'Reserved products', 'Qty', 'Pre-order value', 'Status', 'Placed', 'Update'] : ['Order', 'Reserved products', 'Qty', 'Pre-order value', 'Status', 'Placed']}
          empty="No seller product pre-orders have been placed yet."
          rows={orderItems.map((order) => {
            const lines = preorderLines(order);
            const details = lines.map((line) => <span key={line.productId}><b>{line.name}</b><small className="portal-sub">Expected: {dateLabel(line.preOrderDetails?.harvestDate)}</small></span>);
            const common = [
              <b>{order.orderNumber}</b>,
              ... (adminMode ? [<span>{order.customerName}<small className="portal-sub">{order.phone || order.customerEmail || ''}</small></span>] : []),
              <span>{details}</span>,
              lineQuantity(lines),
              taka(lineValue(lines)),
              <StatusBadge status={order.status} />,
              dateTimeText(order.createdAt)
            ];
            if (!adminMode) return { key: order.id, cells: common };
            const next = ORDER_NEXT[order.status] || [];
            return {
              key: order.id,
              cells: [...common, <select
                className="portal-select"
                disabled={!next.length || busyId === order.id}
                value={order.status}
                onChange={(event) => changeOrderStatus(order, event.target.value)}
              >
                <option value={order.status}>{order.status}</option>
                {next.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
              </select>]
            };
          })}
        />}
        {!adminMode && <div className="portal-form-actions"><button className="portal-primary" onClick={() => navigate('preorder')}>Browse available pre-orders <ArrowRight size={15}/></button><button className="portal-secondary" onClick={() => navigate('orders')}>View all orders</button></div>}
      </PageCard>

      {legacyItems.length > 0 && <PageCard title="Earlier seasonal box requests" subtitle="Requests submitted through the previous fixed-box reservation form.">
        <Table
          headers={adminMode ? ['Reference', 'Customer', 'Delivery', 'Boxes', 'Total', 'Status', 'Update'] : ['Reference', 'Harvest box', 'Qty', 'Total', 'Status', 'Submitted']}
          empty="No earlier requests."
          rows={legacyItems.map((item) => ({
            key: item.id,
            cells: adminMode ? [
              <b>{item.orderNumber}</b>,
              <span>{item.customerName}<small className="portal-sub">{item.phone}</small></span>,
              <span>{item.address}<small className="portal-sub">{item.area}</small></span>,
              item.quantity,
              taka(item.total),
              <StatusBadge status={item.status}/>,
              <select className="portal-select" disabled={busyId === item.id || ['completed', 'cancelled'].includes(item.status)} value={item.status} onChange={(event) => changeLegacyStatus(item, event.target.value)}>
                {LEGACY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            ] : [
              <b>{item.orderNumber}</b>,
              item.productName,
              item.quantity,
              taka(item.total),
              <StatusBadge status={item.status}/>,
              dateTimeText(item.createdAt)
            ]
          }))}
        />
      </PageCard>}
    </PortalShell>;
  }

  return <main className="page-container kh-preorder-page">
    <section className="kh-preorder-hero">
      <div className="kh-preorder-hero-copy">
        <span className="section-kicker"><Sprout size={15}/> KHAMARI HARVEST RESERVATIONS</span>
        <h1>Reserve products <em>before harvest.</em></h1>
        <p>Browse upcoming harvests and seasonal products shared by Khamari sellers. Each product shows its expected availability date, price and reservation deadline.</p>
        <div className="kh-preorder-trust"><span><CalendarDays size={16}/> Seller-set harvest dates</span><span><Package size={16}/> Limited available quantities</span><span><Clock3 size={16}/> Clear reservation deadlines</span></div>
      </div>
      <div className="kh-preorder-hero-image"><img src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1100&q=85" alt="Fresh seasonal vegetables"/></div>
    </section>

    <section className="kh-preorder-products">
      <div className="kh-preorder-heading">
        <div><span className="section-kicker">FROM LOCAL SELLERS</span><h2>Available pre-orders</h2><p>Only approved products with an open reservation period appear here.</p></div>
        <button className="portal-secondary" type="button" onClick={() => publicFeed.reload()}><RefreshCw size={15}/> Refresh</button>
      </div>
      {publicFeed.loading && <Loading label="Loading available pre-orders…"/>}
      {publicFeed.error && <ErrorBox message={publicFeed.error} onRetry={publicFeed.reload}/>}
      {!publicFeed.loading && !publicFeed.error && (products.length ? <div className="product-grid kh-preorder-grid">
        {products.map((product) => <article className="kh-preorder-product" key={product.id}>
          <ProductCard
            product={product}
            onAdd={addToCart}
            onOpen={(item) => navigate(`product-detail?id=${encodeURIComponent(item.id)}`)}
          />
          <div className="kh-preorder-dates">
            <span><CalendarDays size={14}/> Expected: <b>{dateLabel(product.preOrderDetails?.harvestDate)}</b></span>
            <span><Clock3 size={14}/> Closes: <b>{dateLabel(product.preOrderDetails?.preorderDeadline)}</b></span>
          </div>
        </article>)}
      </div> : <div className="kh-preorder-empty">
        <Sprout size={30}/>
        <h3>No available pre-orders right now</h3>
        <p>Seller products appear here after an administrator approves them and while their reservation period is open.</p>
        <button className="portal-secondary" onClick={() => navigate('products')}>Browse all products <ArrowRight size={15}/></button>
      </div>)}
    </section>
  </main>;
}
