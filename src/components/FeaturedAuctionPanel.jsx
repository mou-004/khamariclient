import { useEffect, useState } from 'react';
import { ArrowRight, Clock3 } from 'lucide-react';
import { api, assetUrl } from '../api.js';
import { taka } from '../utils/money.js';
import { timeLeft, useNow } from './AuctionParts.jsx';

// Home page highlight: the live auction that ends soonest (real data from the API).
export default function FeaturedAuctionPanel({ navigate }) {
  const [a, setA] = useState(undefined);
  const now = useNow(1000);
  useEffect(() => {
    let stop = false;
    const load = () => api('/auctions?status=active&sort=ending&limit=1', { signedIn: false }).then((d) => !stop && setA(d.items[0] || null)).catch(() => !stop && setA(null));
    load();
    const t = window.setInterval(load, 20000);
    return () => { stop = true; window.clearInterval(t); };
  }, []);
  const open = () => navigate(a ? `auction-detail?id=${a.id}` : 'auction');
  return <article className="auction-panel" id="auction"><div className="panel-copy">
    <div className="panel-label"><span className="live-pulse" /> LIVE FARM AUCTION</div>
    <h2>Something special.<br /><em>One winning bid.</em></h2>
    <p>Discover small-batch and limited-harvest goods in a transparent, live bidding experience.</p>
    {a ? <div className="auction-metrics"><div><span>{a.bidCount ? 'Current bid' : 'Starting bid'}</span><strong>{taka(a.currentBid)}</strong></div><div><span>Active bids</span><strong>{a.bidCount} <small>bids</small></strong></div><div><span>Closes in</span><strong className="close-time"><Clock3 size={14} /> {timeLeft(a.endsAt, now)}</strong></div></div>
      : <div className="auction-metrics"><div><span>{a === undefined ? 'Loading…' : 'No lots live right now'}</span><strong>{a === undefined ? '' : 'Check back soon'}</strong></div></div>}
    <button className="light-btn" onClick={open}>{a ? 'Bid on this lot' : 'Explore live auctions'} <ArrowRight size={16} /></button>
    <div className="panel-footnote">Fair rules. Clear deadlines. No hidden fees.</div></div>
    {a && <div className="auction-photo"><img src={assetUrl(a.image)} alt={a.title} /><div className="auction-product-tag"><span>Featured lot</span><b>{a.title}</b><small>By {a.sellerName}</small></div></div>}
  </article>;
}