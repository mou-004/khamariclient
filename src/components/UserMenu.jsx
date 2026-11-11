import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, ClipboardList, Gavel, LayoutDashboard, LogOut, RotateCcw, UserRound } from 'lucide-react';

const dashboardFor = (role) => (['seller', 'seller_pending'].includes(role) ? 'seller' : ['admin', 'superAdmin', 'super-admin'].includes(role) ? 'admin' : 'customer');
const roleLabel = (role) => (dashboardFor(role) === 'admin' ? 'Administrator' : dashboardFor(role) === 'seller' ? (role === 'seller_pending' ? 'Seller (awaiting approval)' : 'Seller') : 'Customer');

// Header account button. Signed out: a "Sign in" button. Signed in: your initial, name and a menu with Sign out.
export default function UserMenu({ user, navigate, onLogout }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', outside); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!user) return <button className="sign-in-btn" onClick={() => navigate('login')}>Sign in</button>;
  const go = (path) => { setOpen(false); navigate(path); };
  const customer = dashboardFor(user.role) === 'customer';
  return <div className="user-menu" ref={box}>
    <button type="button" className="user-menu-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span className="user-avatar">{(user.name || user.email || '?').slice(0, 1).toUpperCase()}</span>
      <span className="user-menu-name">{(user.name || 'My account').split(' ')[0]}</span><ChevronDown size={14} />
    </button>
    {open && <div className="user-menu-panel" role="menu">
      <div className="user-menu-head"><b>{user.name || 'My account'}</b><small>{user.email}</small><em>{roleLabel(user.role)}</em></div>
      <button role="menuitem" onClick={() => go(dashboardFor(user.role))}><LayoutDashboard size={16} /> {customer ? 'My account' : 'Dashboard'}</button>
      {customer && <button role="menuitem" onClick={() => go('orders')}><ClipboardList size={16} /> My orders</button>}
      {customer && <button role="menuitem" onClick={() => go('payments')}><ClipboardList size={16} /> My payments</button>}
      {customer && <button role="menuitem" onClick={() => go('my-bids')}><Gavel size={16} /> My bids</button>}
      {customer && <button role="menuitem" onClick={() => go('refunds')}><RotateCcw size={16} /> Refunds &amp; returns</button>}
      <button role="menuitem" onClick={() => go('notifications')}><Bell size={16} /> Notifications</button>
      <button role="menuitem" onClick={() => go('profile')}><UserRound size={16} /> Profile</button>
      <button type="button" role="menuitem" className="user-menu-out" onClick={async () => { setOpen(false); await onLogout?.(); }}><LogOut size={16} /> Sign out</button>
    </div>}
  </div>;
}