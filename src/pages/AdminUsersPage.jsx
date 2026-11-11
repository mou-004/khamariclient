import { useMemo, useState } from 'react';
import { Ban, Check, Download, RotateCcw, Search, ShieldCheck, ShieldOff, X } from 'lucide-react';
import { taka } from '../utils/portal.js';
import { downloadCsv } from '../csv.js';
import { api, useApi, dateText } from '../api.js';
import { PortalShell, Table, PageCard, StatusBadge, Loading, ErrorBox, Tabs, Badge, Modal } from '../components/PortalUI.jsx';

const ROLE = { customer: 'Customer', seller: 'Seller', seller_pending: 'Seller (pending)', admin: 'Admin', superAdmin: 'Admin' };

export default function AdminUsersPage({ shell, notify, user }) {
  const { data, loading, error, reload } = useApi('/admin/users');
  const [tab, setTab] = useState('attention');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('');
  const [detail, setDetail] = useState(null);
  const items = data?.items || [];
  const need = (u) => u.role === 'seller_pending';
  const filters = { attention: need, customer: (u) => u.role === 'customer', seller: (u) => u.role === 'seller', admin: (u) => u.role === 'admin', all: () => true };
  const list = useMemo(() => items.filter(filters[tab]).filter((u) => [u.name, u.email, u.storeName].join(' ').toLowerCase().includes(search.toLowerCase())), [items, tab, search]);
  const act = async (u, action, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try { setBusy(u.id); const r = await api(`/admin/users/${u.id}`, { method: 'PATCH', body: { action } }); notify(r.message); reload(); } catch (e) { notify(e.message); } finally { setBusy(''); }
  };
  const openUser = (u) => { setDetail({ loading: true, user: { name: u.name } }); api(`/admin/users/${u.id}`).then(setDetail).catch((e) => { notify(e.message); setDetail(null); }); };
  const exportCsv = () => downloadCsv('khamari-users.csv', ['Name', 'Email', 'Role', 'Status', 'Phone', 'Area', 'Store', 'Joined'], list.map((u) => [u.name, u.email, ROLE[u.role] || u.role, u.status, u.phone, u.area, u.storeName, u.createdAt?.slice(0, 10)]));
  const btn = (u, action, title, Icon, cls = '', confirmText) => <button key={action} className={`portal-row-action ${cls}`} title={title} disabled={busy === u.id} onClick={() => act(u, action, confirmText)}><Icon size={15} /></button>;
  return <PortalShell {...shell}>
    <div className="portal-toolbar"><label className="portal-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or store" /></label><button className="portal-secondary" onClick={exportCsv} disabled={!list.length}><Download size={15} /> Export CSV</button></div>
    {loading && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
    {data && <PageCard title="Users & approvals" subtitle="Approve sellers, suspend or restore accounts">
      <Tabs value={tab} onChange={setTab} tabs={[['attention', 'Needs approval', items.filter(need).length], ['customer', 'Customers', items.filter(filters.customer).length], ['seller', 'Sellers', items.filter(filters.seller).length], ['admin', 'Admins', items.filter(filters.admin).length], ['all', 'Everyone', items.length]]} />
      <Table headers={['Name', 'Email', 'Role', 'Area', 'Status', 'Joined', 'Actions']} empty={tab === 'attention' ? 'No approvals are waiting.' : 'No users here.'}
        rows={list.map((u) => ({ key: u.id, cells: [<><button className="portal-name-btn" onClick={() => openUser(u)}>{u.name}</button>{u.storeName && <small className="portal-sub">{u.storeName}</small>}</>, u.email, <>{ROLE[u.role] || u.role}{u.adminApplication === 'pending' && <small className="portal-sub"><Badge tone="amber">Admin application</Badge></small>}</>, u.area || '—', <StatusBadge status={u.status} />, dateText(u.createdAt),
          <div className="portal-row-actions">
            {u.role === 'seller_pending' && <>{btn(u, 'approve-seller', 'Approve seller', Check, 'portal-approve')}{btn(u, 'reject-seller', 'Decline seller', X, '', `Decline ${u.name}'s seller application?`)}</>}
            {u.status === 'suspended' ? btn(u, 'activate', 'Restore account', RotateCcw) : u.id !== user?.uid && btn(u, 'suspend', 'Suspend account', Ban, '', `Suspend ${u.name}? They will be blocked immediately.`)}
          </div>] }))} />
    </PageCard>}
    {detail && <Modal wide title={detail.user.name} onClose={() => setDetail(null)}>
      {detail.loading ? <Loading /> : <>
        <div className="user-detail-info">
          <div><span>Email</span>{detail.user.email}</div><div><span>Role</span>{ROLE[detail.user.role] || detail.user.role} · <StatusBadge status={detail.user.status} /></div>
          <div><span>Phone</span>{detail.user.phone || '—'}</div><div><span>Area</span>{detail.user.area || '—'}</div><div><span>Address</span>{detail.user.address || '—'}</div>
          {detail.user.storeName && <div><span>Store</span>{detail.user.storeName}{detail.user.bio ? ` — ${detail.user.bio}` : ''}</div>}
          {detail.user.payout && <div><span>Payout to</span>{detail.user.payout.method} · {detail.user.payout.account}</div>}
          <div><span>Joined</span>{dateText(detail.user.createdAt)}</div>
        </div>
        <div className="user-detail-grid">
          <div><small>Orders placed</small><b>{detail.customer.orders}</b></div><div><small>Total spent</small><b>{taka(detail.customer.spent)}</b></div><div><small>Products</small><b>{detail.seller.products} ({detail.seller.live} live)</b></div>
          <div><small>Orders received</small><b>{detail.seller.orders}</b></div><div><small>Seller earnings</small><b>{taka(detail.seller.sales)}</b></div><div><small>Paid out</small><b>{taka(detail.seller.paidOut)}</b></div>
        </div>
        <Table pageSize={5} headers={['Order', 'Total', 'Status', 'Placed']} empty="No orders yet." rows={detail.recentOrders.map((o) => ({ key: o.id, cells: [<b>{o.orderNumber}</b>, taka(o.total), <StatusBadge status={o.status} />, dateText(o.createdAt)] }))} />
      </>}
    </Modal>}
  </PortalShell>;
}
