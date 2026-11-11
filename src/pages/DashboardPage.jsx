import { ArrowRight, BadgeCheck, ClipboardList, CreditCard, Gavel, Heart, LifeBuoy, PackageCheck, RotateCcw, ShoppingBag, Wallet } from 'lucide-react';
import { taka } from '../utils/portal.js';
import { useApi, dateText } from '../api.js';
import { useWishlist } from '../wishlist.js';
import { PortalShell, StatCard, PageCard, StatusBadge, Loading, ErrorBox, Table, EmptyState } from '../components/PortalUI.jsx';

const isCod = (order) => ['cash', 'cod', 'cash on delivery'].includes(String(order.paymentMethod || '').toLowerCase()) || order.paymentStatus === 'not_required';

export default function DashboardPage({ shell, navigate }) {
  const ordersFeed = useApi('/orders/mine', { poll: 15000 });
  const refundsFeed = useApi('/refunds/mine', { poll: 20000 });
  const { ids: savedIds } = useWishlist();
  const orders = ordersFeed.data?.items || [];
  const refunds = refundsFeed.data?.items || [];
  const live = orders.filter((o) => o.status !== 'cancelled');
  const paidOnline = live.filter((o) => !isCod(o) && o.paymentStatus === 'paid');
  const codOrders = live.filter(isCod);
  const pendingOnline = live.filter((o) => !isCod(o) && ['pending', 'submitted'].includes(String(o.paymentStatus || 'pending')));
  const active = live.filter((o) => !['received', 'cancelled'].includes(o.status));
  const openRefunds = refunds.filter((r) => !['refunded', 'rejected', 'closed', 'cancelled'].includes(r.status));
  const recent = [...orders].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 6);

  const shortcuts = [
    { title: 'My orders', detail: 'Track fulfilment and delivery', icon: ClipboardList, route: 'orders', count: live.length },
    { title: 'Payments', detail: 'Submit references and view status', icon: CreditCard, route: 'payments', count: pendingOnline.length, suffix: 'pending' },
    { title: 'Refunds & returns', detail: 'Request and track refunds', icon: RotateCcw, route: 'refunds', count: openRefunds.length, suffix: 'open' },
    { title: 'Wishlist', detail: 'Your saved products', icon: Heart, route: 'wishlist', count: savedIds.length },
    { title: 'Support', detail: 'Get help with an order', icon: LifeBuoy, route: 'support' },
    { title: 'Shop products', detail: 'Discover more from local sellers', icon: ShoppingBag, route: 'products' },
  ];

  return <PortalShell {...shell}>
    <section className="kh-dashboard-hero kh-customer-hero">
      <div><span className="kh-dashboard-kicker">YOUR KHAMARI ACCOUNT</span><h2>Welcome back, {shell?.user?.name?.split(' ')[0] || 'Customer'}</h2><p>Your orders, payments, delivery updates and returns in one place.</p></div>
      <div className="kh-hero-actions"><button className="portal-primary" onClick={() => navigate('products')}><ShoppingBag size={16}/> Continue shopping</button><button className="portal-secondary" onClick={() => navigate('orders')}>View orders <ArrowRight size={15}/></button></div>
    </section>

    {ordersFeed.error && <ErrorBox message={ordersFeed.error} onRetry={ordersFeed.reload}/>}
    {refundsFeed.error && <ErrorBox message={refundsFeed.error} onRetry={refundsFeed.reload}/>}

    <div className="portal-stat-grid kh-dashboard-stats">
      <StatCard icon={ClipboardList} label="Orders placed" value={live.length} trend="Across all sellers" />
      <StatCard icon={PackageCheck} label="Active orders" value={active.length} trend="Being prepared or delivered" tone="amber" />
      <StatCard icon={Wallet} label="Total order value" value={taka(live.reduce((n, o) => n + Number(o.total || 0), 0))} trend="Excludes cancelled orders" tone="green" />
      <StatCard icon={BadgeCheck} label="Online payments paid" value={paidOnline.length} trend="Verified online payments" tone="green" />
      <StatCard icon={CreditCard} label="Online payments pending" value={pendingOnline.length} trend="Awaiting submission or verification" tone="amber" />
      <StatCard icon={ShoppingBag} label="COD orders" value={codOrders.length} trend="No online payment required" />
      <StatCard icon={RotateCcw} label="Open refund requests" value={openRefunds.length} trend={`${refunds.length} total refund records`} tone={openRefunds.length ? 'amber' : 'blue'} />
      <StatCard icon={Heart} label="Saved items" value={savedIds.length} trend="In your wishlist" />
    </div>

    <PageCard title="Your account shortcuts" subtitle="Open any part of your customer account. Payments and refund tools remain available.">
      <div className="kh-dashboard-shortcuts">{shortcuts.map(({ title, detail, icon: Icon, route, count, suffix }) => <button key={route} className="kh-dashboard-shortcut" onClick={() => navigate(route)}><span className="kh-shortcut-icon"><Icon size={19}/></span><span className="kh-shortcut-copy"><b>{title}</b><small>{detail}</small></span>{count !== undefined && <span className="kh-shortcut-count">{count}{suffix ? <small>{suffix}</small> : null}</span>}<ArrowRight size={16}/></button>)}</div>
    </PageCard>

    <div className="portal-dashboard-grid kh-dashboard-main-grid">
      <PageCard title="Recent orders" subtitle="Your latest purchases and payment states" action={<button className="portal-text-link" onClick={() => navigate('orders')}>All orders <ArrowRight size={14}/></button>}>
        {ordersFeed.loading && !ordersFeed.data ? <Loading/> : <Table headers={['Order', 'Items', 'Total', 'Payment', 'Status', 'Placed']} empty="Your purchases will appear here after checkout." rows={recent.map((o) => ({ key: o.id, cells: [<b>{o.orderNumber}</b>, (o.items || []).map((i) => `${i.name} × ${i.quantity}`).join(', '), taka(o.total), <span>{isCod(o) ? 'COD' : String(o.paymentMethod || 'Online').toUpperCase()}<small className="portal-sub">{isCod(o) ? 'No online payment' : o.paymentStatus === 'paid' ? 'Paid' : o.paymentStatus === 'submitted' ? 'Awaiting verification' : 'Payment pending'}</small></span>, <StatusBadge status={o.status}/>, dateText(o.createdAt)] }))}/> }
      </PageCard>
      <PageCard title="Payment & refund overview" subtitle="Payment status is separate from delivery status.">
        <div className="kh-finance-list"><div><span><BadgeCheck size={17}/> Verified online payments</span><b>{paidOnline.length}</b></div><div><span><CreditCard size={17}/> Awaiting payment verification</span><b>{pendingOnline.length}</b></div><div><span><Wallet size={17}/> COD orders</span><b>{codOrders.length}</b></div><div><span><RotateCcw size={17}/> Refunds in progress</span><b>{openRefunds.length}</b></div></div>
        <div className="kh-dashboard-inline-actions"><button className="portal-primary" onClick={() => navigate('payments')}>Open payment history</button><button className="portal-secondary" onClick={() => navigate('refunds')}>Manage refunds</button></div>
        <p className="portal-note">COD receipt confirmation updates delivery status only. It does not create an online payment transaction.</p>
      </PageCard>
    </div>

    <PageCard title="Explore Khamari" subtitle="Discover more from local farms and sellers.">
      <div className="kh-explore-row"><button onClick={() => navigate('products')}><ShoppingBag size={18}/><span><b>Browse marketplace</b><small>Fresh produce, livestock and farm supplies</small></span><ArrowRight size={15}/></button><button onClick={() => navigate('auction')}><Gavel size={18}/><span><b>Live auctions</b><small>Explore available lots and bids</small></span><ArrowRight size={15}/></button></div>
      {!orders.length && !ordersFeed.loading && <EmptyState icon={ShoppingBag} title="No orders yet" text="When you place an order, it will appear in your order history." action={<button className="portal-primary" onClick={() => navigate('products')}>Start shopping</button>}/>}
    </PageCard>
  </PortalShell>;
}
