import { useState } from 'react';
import { Bell, Megaphone, Send } from 'lucide-react';
import { api, useApi, dateTimeText } from '../api.js';
import { PortalShell, Table, PageCard, Loading, ErrorBox } from '../components/PortalUI.jsx';

const AUDIENCE = { all: 'Everyone', customer: 'Customers', seller: 'Sellers' };
const LINKS = [['', 'Just show the message'], ['products', 'Open the shop'], ['auction', 'Open live auctions'], ['orders', 'Open My orders'], ['seller', 'Open the seller dashboard'], ['support', 'Open Help & support']];

// Send a message that appears in every chosen user's notifications (bell icon and Notifications page).
export default function AdminAnnouncementsPage({ shell, notify }) {
  const { data, loading, error, reload } = useApi('/admin/announcements');
  const [form, setForm] = useState({ title: '', body: '', audience: 'all', link: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const send = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Send “${form.title}” to ${AUDIENCE[form.audience].toLowerCase()}? This cannot be undone.`)) return;
    try { setBusy(true); const r = await api('/admin/announcements', { method: 'POST', body: form }); notify(r.message); setForm({ title: '', body: '', audience: form.audience, link: '' }); reload(); }
    catch (err) { notify(err.message); } finally { setBusy(false); }
  };
  return <PortalShell {...shell}>
    <div className="portal-two-col">
      <PageCard title="New announcement" subtitle="Great for sales, new features, delivery notices or holiday hours.">
        <form className="portal-form" onSubmit={send}>
          <label>Title<input value={form.title} onChange={set('title')} maxLength={100} placeholder="e.g. Free delivery this weekend" required /></label>
          <label>Message<textarea value={form.body} onChange={set('body')} maxLength={300} placeholder="Keep it short and clear (up to 300 characters)." required /></label>
          <div className="portal-form-grid">
            <label>Send to<select value={form.audience} onChange={set('audience')}>{Object.entries(AUDIENCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>When tapped<select value={form.link} onChange={set('link')}>{LINKS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          </div>
          <div className="announce-preview"><small>Preview</small><div><span><Bell size={15} /></span><section><b>{form.title || 'Your title'}</b><p>{form.body || 'Your message appears here.'}</p></section></div></div>
          <button className="portal-primary" disabled={busy}><Send size={16} /> {busy ? 'Sending…' : 'Send announcement'}</button>
        </form>
      </PageCard>
      <PageCard title="Sent announcements" subtitle="People who turned announcements off in their settings are skipped.">
        {loading && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
        {data && <Table pageSize={8} headers={['Sent', 'Title', 'To', 'Reached']} empty="You haven't sent any announcements yet." rows={data.items.map((a) => ({ key: a.id, cells: [<>{dateTimeText(a.createdAt)}<small className="portal-sub">{a.adminName}</small></>, <><b>{a.title}</b><small className="portal-sub">{a.body}</small></>, AUDIENCE[a.audience] || a.audience, a.sentTo] }))} />}
      </PageCard>
    </div>
  </PortalShell>;
}