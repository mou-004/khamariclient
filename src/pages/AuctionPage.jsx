import { useMemo, useState } from 'react';
import { Gavel, Search } from 'lucide-react';
import { api, useApi } from '../api.js';
import { AuctionCard, useNow } from '../components/AuctionParts.jsx';

// Public auction browse page (storefront layout): search, filter, sort, watch.
export default function AuctionPage({ user, navigate, notify }) {
  const [status, setStatus] = useState('active');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('ending');
  const path = useMemo(() => `/auctions?status=${status}&sort=${status === 'ended' ? 'newest' : sort}${category ? `&category=${encodeURIComponent(category)}` : ''}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`, [status, sort, category, q]);
  const { data, loading, error, reload } = useApi(path, { auto: true, poll: 15000 });
  const mine = useApi(user ? '/me/bids' : '', {});
  const now = useNow(1000);
  const watching = new Set((mine.data?.watching || []).map((a) => a.id));
  const toggleWatch = async (a) => {
    if (!user) { notify('Sign in to watch auctions.'); navigate('login'); return; }
    try { const r = await api(`/auctions/${a.id}/watch`, { method: 'POST', body: { watch: !watching.has(a.id) } }); notify(r.message); mine.reload(); reload(); } catch (e) { notify(e.message); }
  };
  const items = data?.items || [];
  return <div className="cm-wrap">
    <div className="cm-head">
      <div><h1>Live farm auctions</h1><p>Bid on limited farm lots. Enter the most you would pay and Khamari bids for you, one step at a time, so you never overpay. Every bid is binding.</p></div>
      {user && <button className="cm-btn" onClick={() => navigate('my-bids')}><Gavel size={16} /> My bids</button>}
    </div>
    <div className="cm-toolbar">
      <label className="cm-search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search auctions" aria-label="Search auctions" /></label>
      <select className="cm-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category"><option value="">All categories</option>{(data?.categories || []).map((c) => <option key={c}>{c}</option>)}</select>
      {status === 'active' && <select className="cm-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort"><option value="ending">Ending soonest</option><option value="newest">Newly listed</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="bids">Most bids</option></select>}
      <div className="cm-seg"><button className={status === 'active' ? 'on' : ''} onClick={() => setStatus('active')}>Live</button><button className={status === 'ended' ? 'on' : ''} onClick={() => setStatus('ended')}>Ended</button></div>
    </div>
    {loading && !data && <div className="cm-empty"><span className="portal-spinner" /> Loading auctions…</div>}
    {error && <div className="cm-note cm-note-bad"><span><b>We couldn’t load the auctions</b>{error} <button className="cm-btn cm-btn-sm" onClick={reload}>Try again</button></span></div>}
    {data && (items.length
      ? <div className="cm-grid">{items.map((a) => <AuctionCard key={a.id} a={a} now={now} showWatch={!a.isEnded && !a.isSeller} watching={watching.has(a.id)} onWatch={toggleWatch} onOpen={() => navigate(`auction-detail?id=${a.id}`)} />)}</div>
      : <div className="cm-empty"><Gavel size={30} /><b>{status === 'active' ? 'No live auctions match' : 'No ended auctions yet'}</b>Try a different search, or check back soon. Sellers add new lots every week.</div>)}
  </div>;
}