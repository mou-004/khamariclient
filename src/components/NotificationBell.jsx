import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Gavel, Megaphone, Package, ShieldCheck, Star, Tag, Wallet, X } from 'lucide-react';
import { dismissFresh, markAllRead, markRead, timeAgo, useNotifications } from '../notifications.js';

export const TYPE_META = {
  order: { label: 'Orders', icon: Package }, product: { label: 'Products', icon: Tag }, auction: { label: 'Auctions', icon: Gavel },
  payment: { label: 'Payments', icon: Wallet }, review: { label: 'Reviews', icon: Star }, announcement: { label: 'Announcements', icon: Megaphone }, account: { label: 'Account', icon: ShieldCheck },
};
export const openLink = (link, navigate) => { const target = link || 'notifications'; if (navigate) navigate(target); else window.location.hash = target; };

// The bell shown in every header (shop and dashboards). Hidden when nobody is signed in.
export default function NotificationBell({ navigate }) {
  const { signedIn, items, unread, fresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', outside); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', esc); };
  }, [open]);
  useEffect(() => { if (!fresh) return undefined; const t = window.setTimeout(dismissFresh, 7000); return () => window.clearTimeout(t); }, [fresh]);
  if (!signedIn) return null;

  const go = (n) => { markRead([n.id]); setOpen(false); dismissFresh(); openLink(n.link, navigate); };
  const Icon = (type) => (TYPE_META[type] || TYPE_META.account).icon;

  return <div className="notif-wrap" ref={box}>
    <button type="button" className="icon-btn notification-btn notif-bell" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-expanded={open} onClick={() => { setOpen(!open); dismissFresh(); }}>
      <Bell size={19} />{unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <div className="notif-panel" role="dialog" aria-label="Notifications">
      <div className="notif-head"><b>Notifications</b>{unread > 0 && <button type="button" onClick={markAllRead}><CheckCheck size={14} /> Mark all read</button>}</div>
      <div className="notif-list">
        {items.slice(0, 8).map((n) => { const I = Icon(n.type); return <button type="button" key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => go(n)}><span className={`notif-icon t-${n.type}`}><I size={16} /></span><span className="notif-text"><b>{n.title}</b>{n.body && <small>{n.body}</small>}<em>{timeAgo(n.createdAt)}</em></span>{!n.read && <i className="notif-dot" />}</button>; })}
        {!items.length && <div className="notif-empty"><Bell size={22} /><b>You're all caught up</b><small>Order updates, offers and alerts will appear here.</small></div>}
      </div>
      <button type="button" className="notif-foot" onClick={() => { setOpen(false); openLink('notifications', navigate); }}>See all notifications</button>
    </div>}
    {fresh && !open && <div className="notif-toast" role="status" onClick={() => go(fresh)}>
      <span className={`notif-icon t-${fresh.type}`}>{(() => { const I = Icon(fresh.type); return <I size={16} />; })()}</span>
      <span className="notif-text"><b>{fresh.title}</b>{fresh.body && <small>{fresh.body}</small>}</span>
      <button type="button" aria-label="Dismiss" onClick={(e) => { e.stopPropagation(); dismissFresh(); }}><X size={14} /></button>
    </div>}
  </div>;
}