import { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Undo2 } from 'lucide-react';
import { api, useApi } from '../api.js';
import { refreshNotifications, timeAgo } from '../notifications.js';
import { TYPE_META, openLink } from '../components/NotificationBell.jsx';
import { PortalShell, PageCard, Loading, ErrorBox, EmptyState, Tabs } from '../components/PortalUI.jsx';

const SETTING_ROWS = [['order', 'Orders and delivery', 'Order placed, delivered and receipt confirmed'], ['product', 'Products and stock', 'Product approvals and low-stock alerts'], ['auction', 'Auctions', 'Bids, outbid alerts and results'], ['payment', 'Payments and payouts', 'Payout requests and payments'], ['review', 'Reviews', 'Review requests and new reviews on your products'], ['announcement', 'Announcements', 'Offers and news from Khamari'], ['email', 'Also email me about orders and payments', 'Needs the store’s email settings to be switched on']];

export default function NotificationsPage({ shell, navigate, notify }) {
  const [tab, setTab] = useState('all');
  const [limit, setLimit] = useState(30);
  const query = `/notifications?limit=${limit}${tab === 'unread' ? '&unread=true' : tab !== 'all' ? `&type=${tab}` : ''}`;
  const { data, loading, error, reload } = useApi(query);
  const settings = useApi('/me/notification-settings');
  const [prefs, setPrefs] = useState(null);
  const current = prefs || settings.data?.settings;

  const run = async (fn, okMessage) => { try { const r = await fn(); if (okMessage || r?.message) notify(okMessage || r.message); reload(); refreshNotifications(); } catch (e) { notify(e.message); } };
  const toggleRead = (n) => run(() => api(`/notifications/${n.read ? 'unread' : 'read'}`, { method: 'POST', body: { ids: [n.id] } }), '');
  const remove = (n) => run(() => api(`/notifications/${n.id}`, { method: 'DELETE' }), '');
  const open = async (n) => { if (!n.read) api('/notifications/read', { method: 'POST', body: { ids: [n.id] } }).then(refreshNotifications).catch(() => {}); openLink(n.link, navigate); };
  const saveSetting = async (key) => {
    const next = { ...current, [key]: !current[key] };
    setPrefs(next);
    try { await api('/me/notification-settings', { method: 'PUT', body: next }); notify('Notification settings saved.'); } catch (e) { setPrefs(current); notify(e.message); }
  };

  const counts = data?.counts || {};
  const tabs = [['all', 'All'], ['unread', 'Unread', data?.unread], ...Object.entries(TYPE_META).filter(([k]) => counts[k] > 0 || tab === k).map(([k, m]) => [k, m.label, counts[k]])];
  const items = data?.items || [];

  return <PortalShell {...shell}>
    <div className="portal-two-col notif-page">
      <PageCard title="Your notifications" subtitle={data ? `${data.unread} unread` : ''} action={<div className="portal-row-actions"><button className="portal-secondary" disabled={!data?.unread} onClick={() => run(() => api('/notifications/read', { method: 'POST', body: {} }), 'All notifications marked as read.')}><CheckCheck size={15} /> Mark all read</button><button className="portal-secondary" onClick={() => window.confirm('Remove all read notifications?') && run(() => api('/notifications?read=true', { method: 'DELETE' }))}><Trash2 size={15} /> Clear read</button></div>}>
        <Tabs value={tab} onChange={(t) => { setTab(t); setLimit(30); }} tabs={tabs} />
        {loading && !data && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
        {data && (items.length
          ? <div className="portal-notice-list">{items.map((n) => { const I = (TYPE_META[n.type] || TYPE_META.account).icon; return <div key={n.id} className={`notif-row ${n.read ? '' : 'unread'}`}><button type="button" className="notif-row-main" onClick={() => open(n)}><span className={`notif-icon t-${n.type}`}><I size={16} /></span><div><b>{n.title}</b>{n.body && <small>{n.body}</small>}</div><em>{timeAgo(n.createdAt)}</em></button><div className="notif-row-actions"><button type="button" title={n.read ? 'Mark as unread' : 'Mark as read'} onClick={() => toggleRead(n)}>{n.read ? <Undo2 size={15} /> : <Check size={15} />}</button><button type="button" title="Delete" onClick={() => remove(n)}><Trash2 size={15} /></button></div></div>; })}
            {data.total > items.length && <button className="portal-secondary notif-more" onClick={() => setLimit(limit + 30)}>Show more ({data.total - items.length} left)</button>}</div>
          : <EmptyState icon={Bell} title={tab === 'all' ? 'You are all caught up' : 'Nothing here'} text="Order updates, offers and alerts will appear here as they happen." />)}
      </PageCard>
      <PageCard title="What should we tell you about?" subtitle="Account and security messages are always sent.">
        {!current ? <Loading /> : <div className="notif-settings">{SETTING_ROWS.map(([key, label, hint]) => <label key={key}><span><b>{label}</b><small>{hint}</small></span><input type="checkbox" role="switch" checked={current[key] !== false} onChange={() => saveSetting(key)} /><i /></label>)}</div>}
      </PageCard>
    </div>
  </PortalShell>;
}