import { useMemo, useState } from 'react';
import { Search, Star, Trash2 } from 'lucide-react';
import { api, useApi, dateText } from '../api.js';
import { PortalShell, Table, PageCard, Loading, ErrorBox, Tabs } from '../components/PortalUI.jsx';

export default function AdminReviewsPage({ shell, notify }) {
  const { data, loading, error, reload } = useApi('/admin/reviews');
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const items = data?.items || [];
  const list = useMemo(() => items.filter((r) => (tab === 'all' || (tab === 'low' ? r.rating <= 2 : r.rating >= 4)) && [r.productName, r.userName, r.comment].join(' ').toLowerCase().includes(search.toLowerCase())), [items, tab, search]);
  const remove = async (r) => {
    if (!window.confirm(`Delete ${r.userName}'s review of “${r.productName}”? The product rating will be recalculated.`)) return;
    try { const res = await api(`/admin/reviews/${r.id}`, { method: 'DELETE' }); notify(res.message); reload(); } catch (e) { notify(e.message); }
  };
  return <PortalShell {...shell}>
    <div className="portal-toolbar"><label className="portal-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reviews, products or customers" /></label></div>
    {loading && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
    {data && <PageCard title="Customer reviews" subtitle="Only verified buyers can review. Remove anything abusive or untrue.">
      <Tabs value={tab} onChange={setTab} tabs={[['all', 'All', items.length], ['low', 'Low (1–2★)', items.filter((r) => r.rating <= 2).length], ['high', 'Positive (4–5★)', items.filter((r) => r.rating >= 4).length]]} />
      <Table headers={['Product', 'Customer', 'Rating', 'Review', 'Date', '']} empty="No reviews yet. They appear after customers receive their orders." rows={list.map((r) => ({ key: r.id, cells: [<b>{r.productName}</b>, r.userName, <span className="stars">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} fill={n <= r.rating ? 'currentColor' : 'none'} />)}</span>, r.comment || <small className="portal-sub">No comment</small>, dateText(r.createdAt), <button className="portal-row-action" title="Delete review" onClick={() => remove(r)}><Trash2 size={15} /></button>] }))} />
    </PageCard>}
  </PortalShell>;
}