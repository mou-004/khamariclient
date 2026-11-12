import { useEffect, useState } from "react";
import { api } from "../api.js";
import NotificationBell from "./NotificationBell.jsx";
import { CalendarDays, ArrowLeft, ArrowRight, Bell, BarChart3, CircleHelp, Heart, LayoutDashboard, Leaf, LogOut, Menu, Package, Plus, ShieldCheck, ShoppingBag, Store, Users, X, Gavel, RotateCcw, ClipboardList, Tag, Boxes, UserRound, CheckCircle2, Wallet, Clock3, Star, History, Megaphone } from "lucide-react";
export function Brand({ navigate }) {
  return <a className="portal-brand" href="#home" onClick={() => navigate('home')}>
    <span className="portal-brand-mark"><Leaf size={23}/></span>
    <span><b>Khamari</b><small>Farm to Home</small></span>
  </a>;
}

export function PortalShell({ children, user, navigate, onLogout, toast, onDismissToast, title = 'Your workspace', subtitle = 'Manage your Khamari activity.' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [counts, setCounts] = useState({});
  const rawRole = user?.role || 'customer';
  const role = rawRole === 'seller_pending' ? 'seller' : (rawRole === 'superAdmin' || rawRole === 'super-admin') ? 'admin' : rawRole;
  const waiting = rawRole === 'seller_pending';
  useEffect(() => {
    if (!user || role !== 'admin') return undefined;
    let stop = false;
    api('/admin/counts').then((d) => !stop && setCounts(d)).catch(() => {});
    return () => { stop = true; };
  }, [user?.uid, role, title]);
  const badges = { 'admin-products': counts.products, 'admin-users': (counts.sellers || 0) + (counts.admins || 0), 'admin-orders': counts.orders, 'admin-payouts': counts.payouts, 'admin-refunds': counts.refunds, 'admin-support': counts.support };
  const menus = role === 'admin' ? [
    ['admin','Overview',LayoutDashboard],['admin-products','Products',Package],['admin-orders','All orders',ClipboardList],['preorders','Pre-orders',CalendarDays],['admin-reviews','Product reviews',Star],['admin-support','Support inbox',CircleHelp],
    ['admin-users','Users & approvals',Users],['admin-categories','Categories',Boxes],['admin-auctions','Auctions',Gavel],['admin-refunds','Refunds & disputes',RotateCcw],
    ['admin-coupons','Coupons & offers',Tag],['admin-announcements','Announcements',Megaphone],['admin-payouts','Payouts & fees',Wallet],['admin-analytics','Analytics',BarChart3],['admin-activity','Activity log',History]
  ] : role === 'seller' ? [
    ['seller','Overview',LayoutDashboard],['seller-products','My products',Package],['seller-discounts','Manage discounts',Tag],['product-new','Add a product',Plus],['seller-reviews','Product reviews',Star],
    ['seller-orders','Orders & fulfilment',ClipboardList],['seller-auctions','My auctions',Gavel],['seller-refunds','Returns & refunds',RotateCcw],['seller-earnings','Earnings & payouts',Wallet],['profile','Store profile',Store]
  ] : [
    ['customer','Overview',LayoutDashboard],['orders','My orders',ClipboardList],['my-reviews','My reviews',Star],['my-preorders','My pre-orders',CalendarDays],['payments','My payments',Wallet],['wishlist','Saved items',Heart],
    ['auction','Live auctions',Gavel],['my-bids','My bids',Gavel],['refunds','Refunds & returns',RotateCcw],['profile','My profile',UserRound]
  ];
  return <div className="portal-shell">
    <header className="portal-topbar">
      <div className="portal-topbar-inner">
        <button className="portal-mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle workspace menu"><Menu size={21}/></button>
        <Brand navigate={navigate}/>
        <div className="portal-top-actions">
          <a href="#products" onClick={() => navigate('products')} className="portal-header-link">Products</a>
          <a href="#how-it-works" onClick={() => navigate('how-it-works')} className="portal-header-link">How it works</a>
          <a href="#checkout" onClick={() => navigate('checkout')} className="portal-header-link portal-basket-link"><ShoppingBag size={16}/> Basket</a>
          <a href="#home" onClick={() => navigate('home')} className="portal-back-shop">Continue shopping</a>
          <span className="portal-user-avatar">{(user?.name || 'Guest').slice(0,1).toUpperCase()}</span>
          <div className="portal-user-label"><b>{user?.name || 'Guest'}</b><small>{role === 'admin' ? 'Admin workspace' : role === 'seller' ? 'Seller workspace' : 'Customer account'}</small></div>
          <NotificationBell navigate={navigate}/>
          <button type="button" className="portal-icon-button" title="Sign out" aria-label="Sign out of Khamari" onClick={() => onLogout?.()}><LogOut size={18}/></button>
        </div>
      </div>
    </header>
    <div className="portal-layout">
      <aside className={`portal-sidebar ${menuOpen ? 'portal-sidebar-open' : ''}`}>
        <div className="portal-side-welcome"><small>WORKSPACE</small><b>{role === 'admin' ? 'Platform control' : role === 'seller' ? (user?.storeName || 'Seller centre') : 'My Khamari'}</b><span>{user?.email || ''}</span></div>
        <nav className="portal-side-nav">{menus.map(([href,label,Icon]) => <a key={href} href={`#${href}`} onClick={() => { navigate(href); setMenuOpen(false); }} className={(window.location.hash.replace(/^#\/?/, '').split('?')[0] === href) ? 'active' : ''}><Icon size={17}/><span>{label}</span>{badges[href] > 0 && <em className="portal-side-count">{badges[href]}</em>}<ArrowRight size={13} className="portal-side-arrow"/></a>)}</nav>
        <div className="portal-side-bottom"><a href="#support" onClick={() => navigate('support')}><CircleHelp size={17}/> Help & support</a></div>
      </aside>
      {menuOpen && <button className="portal-mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation"/>}
      <main className="portal-main">
        <div className="portal-page-heading"><div><div className="portal-eyebrow">KHAMARI / {role.toUpperCase()}</div><h1>{title}</h1><p>{subtitle}</p></div><div className="portal-heading-actions">{role === 'seller' && !waiting && <button className="portal-primary" onClick={() => navigate('product-new')}><Plus size={16}/> Add product</button>}{role === 'admin' && <span className="portal-secure-tag"><ShieldCheck size={15}/> Control centre</span>}</div></div>
        {waiting && <div className="portal-admin-alert portal-waiting"><Clock3 size={18}/><span><b>Your seller account is awaiting approval</b><small>You can set up your store profile now. Adding products unlocks as soon as an administrator approves your account.</small></span></div>}
        {children}
        {toast && <div className="portal-toast" role="status"><CheckCircle2 size={17}/>{toast}<button onClick={onDismissToast} aria-label="Dismiss notification"><X size={14}/></button></div>}
        <footer className="portal-footer">© 2026 Khamari · Fresh from the farm <span>Live workspace · data is saved to your Khamari account.</span></footer>
      </main>
    </div>
  </div>;
}

export function AuthLayout({ children, navigate, heading, subheading }) {
  return <div className="auth-page">
    <header className="auth-top"><Brand navigate={navigate}/><a href="#home" onClick={() => navigate('home')}><ArrowLeft size={15}/> Back to marketplace</a></header>
    <div className="auth-layout">
      <section className="auth-form-wrap"><div className="auth-form-heading"><span className="auth-mark"><Leaf size={20}/></span><h2>{heading}</h2><p>{subheading}</p></div>{children}<p className="auth-legal">By continuing, you agree to Khamari’s <a href="#support" onClick={() => navigate('support')}>terms and privacy information</a>.</p></section>
    </div>
  </div>;
}

export function StatCard({ icon: Icon, label, value, trend, tone='blue' }) {
  return <article className={`portal-stat portal-stat-${tone}`}><span className="portal-stat-icon"><Icon size={19}/></span><div><small>{label}</small><strong>{value}</strong><span>{trend}</span></div></article>;
}

export function Table({ headers, rows, empty='No records to display yet.', pageSize = 15 }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => { setPage(0); }, [rows.length]);
  const shown = rows.slice(page * pageSize, (page + 1) * pageSize);
  return <><div className="portal-table-wrap"><table className="portal-table"><thead><tr>{headers.map((h,i)=><th key={`${h}${i}`}>{h}</th>)}</tr></thead><tbody>{shown.length ? shown.map((row,i)=><tr key={row.key || i}>{row.cells.map((cell,j)=><td key={j}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="portal-table-empty">{empty}</td></tr>}</tbody></table></div>
    {pages > 1 && <div className="portal-pager"><span>{page * pageSize + 1}–{Math.min(rows.length, (page + 1) * pageSize)} of {rows.length}</span><button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><b>{page + 1} / {pages}</b><button disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button></div>}</>;
}

export function Badge({ children, tone='blue' }) { return <span className={`portal-badge portal-badge-${tone}`}>{children}</span>; }

export function PageCard({ title, subtitle, action, children }) {
  return <section className="portal-card"><div className="portal-card-head"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}

const TONES = { accepted: 'blue', preparing: 'amber', out_for_delivery: 'blue', active: 'green', approved: 'green', delivered: 'green', received: 'green', paid: 'green', open: 'green', pending: 'amber', placed: 'amber', requested: 'amber', paused: 'amber', 'pending approval': 'amber', rejected: 'red', cancelled: 'red', suspended: 'red', ended: 'red' };
export function StatusBadge({ status }) { const key = String(status || '').toLowerCase(); const labels = { out_for_delivery: 'Out for delivery' }; return <Badge tone={TONES[key] || 'blue'}>{labels[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : '—')}</Badge>; }

export function Loading({ label = 'Loading…' }) { return <div className="portal-loading"><span className="portal-spinner"/>{label}</div>; }
export function ErrorBox({ message, onRetry }) { return <div className="portal-error"><b>Something went wrong</b><p>{message}</p>{onRetry && <button className="portal-secondary" onClick={onRetry}>Try again</button>}</div>; }
export function EmptyState({ icon: Icon = Package, title, text, action }) { return <div className="portal-empty-panel"><Icon size={23}/><b>{title}</b>{text && <p>{text}</p>}{action}</div>; }

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => { const onKey = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  return <div className="portal-modal-backdrop" onClick={onClose}><section className={`portal-modal ${wide ? 'portal-modal-wide' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}><div className="portal-modal-head"><h3>{title}</h3><button className="portal-icon-button" onClick={onClose} aria-label="Close"><X size={17}/></button></div>{children}</section></div>;
}

export function Tabs({ tabs, value, onChange }) {
  return <div className="portal-tabs">{tabs.map(([key, label, count]) => <button key={key} className={value === key ? 'active' : ''} onClick={() => onChange(key)}>{label}{count != null && <span>{count}</span>}</button>)}</div>;
}

// Simple SVG area chart (no extra libraries). data: [{ date, revenue }]
export function AreaChart({ data, valueKey = 'revenue', labelKey = 'date', money = true }) {
  const W = 640, H = 170, P = 8;
  const values = data.map((d) => Number(d[valueKey] || 0));
  const max = Math.max(...values, 1);
  const x = (i) => P + (i * (W - P * 2)) / Math.max(data.length - 1, 1);
  const y = (v) => H - 24 - (v / max) * (H - 44);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const total = values.reduce((n, v) => n + v, 0);
  const fmt = (v) => (money ? `৳${Math.round(v).toLocaleString('en-BD')}` : Math.round(v).toLocaleString('en-BD'));
  return <div className="portal-chart">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trend chart" preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={P} x2={W - P} y1={H - 24 - f * (H - 44)} y2={H - 24 - f * (H - 44)} className="chart-grid"/>)}
      {total > 0 && <path d={`${line} L${x(values.length - 1)},${H - 24} L${x(0)},${H - 24} Z`} className="chart-area"/>}
      <path d={line} className="chart-line"/>
      {data.map((d, i) => values[i] > 0 && <circle key={i} cx={x(i)} cy={y(values[i])} r="3" className="chart-dot"><title>{`${d[labelKey]}: ${fmt(values[i])}`}</title></circle>)}
    </svg>
    <div className="chart-foot"><span>{data[0]?.[labelKey]}</span><b>{fmt(total)} in {data.length} days</b><span>{data[data.length - 1]?.[labelKey]}</span></div>
  </div>;
}

export function BarList({ rows, money = true, empty = 'No data yet.' }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (!rows.length) return <p className="portal-empty-note">{empty}</p>;
  return <div className="portal-barlist">{rows.map((r) => <div key={r.label}><span className="barlist-label">{r.label}</span><div className="barlist-track"><div style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }}/></div><b>{money ? `৳${Math.round(r.value).toLocaleString('en-BD')}` : r.value}</b></div>)}</div>;
}
