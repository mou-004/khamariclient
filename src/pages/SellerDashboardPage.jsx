import { useEffect, useRef } from 'react';
import { ArrowRight, Banknote, Bell, Boxes, CalendarDays, ClipboardList, Clock3, CreditCard, Package, Percent, Plus, RotateCcw, ShoppingBag, Star, Store, Tag, Users, Wallet } from 'lucide-react';
import { taka } from '../utils/portal.js';
import { api, useApi, dateText } from '../api.js';
import { PortalShell, StatCard, Table, PageCard, StatusBadge, Loading, ErrorBox, AreaChart, BarList, EmptyState } from '../components/PortalUI.jsx';

export default function SellerDashboardPage({ shell, navigate, notify }) {
  const { data, loading, error, reload } = useApi('/seller/overview', { poll: 10000 });
  const finance = useApi('/seller/earnings', { poll: 15000 });
  const refunds = useApi('/seller/refunds', { poll: 20000 });
  const ownershipRepairFor = useRef('');
  const sellerUid = shell?.user?.uid;
  useEffect(() => {
    if (!sellerUid || ownershipRepairFor.current === sellerUid) return;
    ownershipRepairFor.current = sellerUid;
    api('/seller/repair-ownership', { method: 'POST' }).then((result) => {
      if (result.repairedProducts || result.repairedOrders) { notify?.(result.message || 'Your products and orders have been reconnected.'); reload(); }
    }).catch(() => {});
  }, [sellerUid]);

  const promoFeed = useApi('/coupons/available', { poll: 60000 });
  const orderNotifications = useApi('/notifications?type=order&limit=8', { poll: 15000 });
  const paymentNotifications = useApi('/notifications?type=payment&limit=8', { poll: 15000 });
  const t = data?.totals || {};
  const s = finance.data?.summary || {};
  const promoCodes = promoFeed.data?.items || [];
  const refundItems = refunds.data?.items || [];
  const openRefunds = refundItems.filter((r) => !['refunded', 'rejected', 'closed', 'cancelled'].includes(r.status));
  const recentOrders = data?.recentOrders || [];
  const waitingPayout = (finance.data?.payouts || []).filter((p) => p.status === 'requested').length;
  const quickLinks = [
    ['Manage orders', 'seller-orders', ClipboardList, t.newOrders || 0],
    ['Products & stock', 'seller-products', Package, t.active || 0],
    ['Earnings & payouts', 'seller-earnings', Wallet, waitingPayout],
    ['Returns & refunds', 'seller-refunds', RotateCcw, openRefunds.length],
    ['Discounts', 'seller-discounts', Tag, t.discountedProducts || 0],
    ['Customer reviews', 'seller-reviews', Star, null],
  ];

  return <PortalShell {...shell}>
    <section className="kh-dashboard-hero kh-seller-hero">
      <div><span className="kh-dashboard-kicker">SELLER WORKSPACE</span><h2>{shell?.user?.storeName || shell?.user?.name || 'Your store'}</h2><p>Manage customer orders, inventory, payments, refunds and seller settlements from one workspace.</p></div>
      <div className="kh-hero-actions"><button className="portal-primary" onClick={() => navigate('product-new')}><Plus size={16}/> Add product</button><button className="portal-secondary" onClick={() => navigate('product-new?type=preorder')}><CalendarDays size={16}/> Add pre-order</button><button className="portal-secondary" onClick={() => { reload(); finance.reload(); refunds.reload(); }}>Refresh data</button></div>
    </section>

    {loading && <Loading/>}{error && <ErrorBox message={error} onRetry={reload}/>}
    {finance.error && <ErrorBox message={`Seller finance data: ${finance.error}`} onRetry={finance.reload}/>}
    {refunds.error && <ErrorBox message={`Refund data: ${refunds.error}`} onRetry={refunds.reload}/>}
    {data && <>
      <div className="portal-stat-grid kh-dashboard-stats">
        <StatCard icon={ShoppingBag} label="Non-cancelled orders" value={t.orders || 0} trend="All orders assigned to your store" />
        <StatCard icon={Clock3} label="New orders" value={t.newOrders || 0} trend="Waiting for seller action" tone="amber" />
        <StatCard icon={Wallet} label="Product sales value" value={taka(t.grossOrderValue)} trend="Before marketplace fee" tone="green" />
        <StatCard icon={Banknote} label="Your order value" value={taka(t.orderValue ?? t.sales)} trend="After marketplace fee" />
        <StatCard icon={Wallet} label="Available to withdraw" value={taka(s.available ?? 0)} trend="Received and settled orders" tone="green" />
        <StatCard icon={Banknote} label="Paid out" value={taka(s.paidOut ?? 0)} trend="Seller payouts marked paid" tone="green" />
        <StatCard icon={CreditCard} label="Online payment pending" value={taka(t.pendingPayment)} trend={`${t.pendingPaymentOrders || 0} online orders awaiting`} tone="amber" />
        <StatCard icon={CreditCard} label="Online payments received" value={t.paidOnlineOrders || 0} trend="Verified online payments" tone="green" />
        <StatCard icon={ShoppingBag} label="COD orders" value={t.codOrders || 0} trend="Not counted as online payments" />
        <StatCard icon={RotateCcw} label="Open refunds" value={openRefunds.length} trend={`${refundItems.length} total refund records`} tone={openRefunds.length ? 'amber' : 'blue'}/>
        <StatCard icon={Package} label="Live products" value={t.active || 0} trend={`${t.pending || 0} awaiting review`}/>
        <StatCard icon={Boxes} label="Low stock" value={t.lowStock || 0} trend="5 units or fewer" tone="amber"/>
      </div>

      <PageCard title="Seller workspace" subtitle="Quick access to all existing seller tools, including refunds and payout requests.">
        <div className="kh-dashboard-shortcuts">{quickLinks.map(([label, route, Icon, count]) => <button key={route} className="kh-dashboard-shortcut" onClick={() => navigate(route)}><span className="kh-shortcut-icon"><Icon size={19}/></span><span className="kh-shortcut-copy"><b>{label}</b><small>{route === 'seller-earnings' ? 'Balances, payout requests and history' : route === 'seller-refunds' ? 'Review and respond to customer returns' : route === 'seller-orders' ? 'Accept, prepare and fulfil orders' : 'Manage your seller account'}</small></span>{count !== null && <span className="kh-shortcut-count">{count}</span>}<ArrowRight size={16}/></button>)}</div>
      </PageCard>

      <div className="portal-dashboard-grid">
        <PageCard title="Completed sales · last 30 days" subtitle="Received orders with verified online payment or COD settlement."><AreaChart data={data.salesByDay || []} valueKey="revenue"/></PageCard>
        <PageCard title="Orders by status" subtitle="Current fulfilment pipeline."><BarList money={false} rows={['placed', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'received', 'cancelled'].map((status) => ({ label: ({ out_for_delivery: 'Out for delivery' }[status] || status[0].toUpperCase() + status.slice(1)), value: data.ordersByStatus?.[status] || 0 }))}/></PageCard>
      </div>

      <PageCard title="Order and payment notifications" subtitle="Recent notifications delivered to your seller account.">
        <div className="portal-two-col"><div><h3 className="kh-section-mini-title"><Bell size={16}/> New orders</h3>{(orderNotifications.data?.items || []).length ? orderNotifications.data.items.map((n) => <div className="kh-notification-row" key={n.id}><b>{n.title}</b><small>{n.body} · {dateText(n.createdAt)}</small></div>) : <p className="portal-muted">No recent order notifications.</p>}</div><div><h3 className="kh-section-mini-title"><CreditCard size={16}/> Online payments</h3>{(paymentNotifications.data?.items || []).length ? paymentNotifications.data.items.map((n) => <div className="kh-notification-row" key={n.id}><b>{n.title}</b><small>{n.body} · {dateText(n.createdAt)}</small></div>) : <p className="portal-muted">No recent payment notifications.</p>}</div></div>
      </PageCard>

      <div className="portal-two-col">
        <PageCard title="My active product discounts" subtitle="Sale prices visible to customers." action={<button className="portal-text-link" onClick={() => navigate('seller-discounts')}>Manage discounts <ArrowRight size={14}/></button>}>
          {data.discountedProducts?.length ? <div className="portal-mini-products">{data.discountedProducts.map((p) => <article key={p.id}><img src={p.image} alt=""/><div><b>{p.name}</b><small>{p.discountPercent}% OFF · ends {p.discountEndsAt ? dateText(p.discountEndsAt) : 'until removed'}</small><strong>{taka(p.discountedPrice)} <del>{taka(p.price)}</del></strong></div></article>)}</div> : <EmptyState icon={Percent} title="No active product discounts" text="Create a sale price for any live product." action={<button className="portal-primary" onClick={() => navigate('seller-discounts')}>Manage discounts</button>}/>}
        </PageCard>
        <PageCard title="Admin promo codes" subtitle="Active codes available to your seller account.">
          {promoCodes.length ? <div className="portal-mini-products">{promoCodes.map((offer) => <article key={offer.code}><div className="portal-promo-code-mark"><Tag size={19}/></div><div><b>{offer.code}</b><small>{offer.discount}% OFF · {Number(offer.minOrder) > 0 ? `minimum ${taka(offer.minOrder)}` : 'no minimum order'}</small><strong>{offer.expiresAt ? `Expires ${dateText(offer.expiresAt)}` : 'No expiry date'}</strong></div></article>)}</div> : <EmptyState icon={Tag} title="No active promo codes" text="Admin-issued offers will appear here."/>}
        </PageCard>
      </div>

      <div className="portal-two-col">
        <PageCard title="Best sellers" subtitle="Your products ranked by revenue.">{data.topProducts?.length ? <div className="portal-mini-products">{data.topProducts.map((p) => <article key={p.productId}><img src={p.image} alt=""/><div><b>{p.name}</b><small>{p.units} sold</small><strong>{taka(p.revenue)}</strong></div></article>)}</div> : <EmptyState icon={Package} title="No sales yet" text="Your best sellers appear after your first orders."/>}</PageCard>
        <PageCard title="Low stock" subtitle="Products that may need restocking." action={<button className="portal-text-link" onClick={() => navigate('seller-products')}>Manage <ArrowRight size={14}/></button>}>{data.lowStock?.length ? <div className="portal-mini-products">{data.lowStock.map((p) => <article key={p.id}><img src={p.image} alt=""/><div><b>{p.name}</b><small>{p.category}</small><strong>{p.stock} left</strong></div></article>)}</div> : <EmptyState icon={Boxes} title="Stock looks healthy" text="Nothing is running low right now."/>}</PageCard>
      </div>

      <PageCard title="Recent customer orders" subtitle="Order details, delivery and payment status. Customer payments remain administered through Khamari; sellers should not collect a separate payment.">
        <Table headers={['Order', 'Customer', 'Items', 'Your earnings', 'Payment', 'Status', 'Placed']} empty="No orders yet. Share your products to get your first order." rows={recentOrders.map((o) => ({ key: o.id, cells: [<b>{o.orderNumber}</b>, <span>{o.customerName}<small className="portal-sub">{[o.phone, o.customerEmail].filter(Boolean).join(' · ')}</small></span>, (o.items || []).map((i) => `${i.name} × ${i.quantity}`).join(', '), taka(o.sellerNet), <span>{String(o.paymentMethod || 'not recorded').toUpperCase()}<small className="portal-sub">{o.paymentMethod === 'cash' || o.paymentStatus === 'not_required' ? 'COD · no online payment' : o.paymentDemo ? 'Legacy demo · no transfer' : o.paymentStatus === 'paid' ? 'Paid' : o.paymentStatus === 'submitted' ? 'Awaiting admin verification' : 'Payment pending'}</small></span>, <StatusBadge status={o.status}/>, dateText(o.createdAt)] }))}/>
      </PageCard>
    </>}
  </PortalShell>;
}
