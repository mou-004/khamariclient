import { useEffect, useState } from 'react';
import { Clock3, Eye, Gavel, Heart } from 'lucide-react';
import { assetUrl } from '../api.js';
import { taka } from '../utils/portal.js';

export const useNow = (ms = 1000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), ms); return () => window.clearInterval(t); }, [ms]);
  return now;
};

export const msLeft = (iso, now) => Date.parse(iso) - now;
export function timeLeft(iso, now, long = false) {
  const ms = msLeft(iso, now);
  if (ms <= 0) return 'Ended';
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  if (d) return long ? `${d}d ${h}h ${m}m` : `${d}d ${h}h`;
  if (h) return long ? `${h}h ${m}m ${String(s).padStart(2, '0')}s` : `${h}h ${m}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}
export const isUrgent = (iso, now) => msLeft(iso, now) > 0 && msLeft(iso, now) < 3600000;
export const hashId = () => new URLSearchParams((window.location.hash.split('?')[1]) || '').get('id') || '';
export const endsOn = (iso) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const STATE_LABEL = { winning: ['Winning', 'live'], outbid: ['Outbid', 'end'], won: ['Won – payment due', 'hot'], won_paid: ['Won & paid', 'live'], unpaid: ['Payment missed', 'end'], lost: ['Did not win', 'blue'], no_sale: ['Ended – no sale', 'blue'], cancelled: ['Cancelled', 'end'] };

export function AuctionCard({ a, now, onOpen, onWatch, watching, showWatch }) {
  const urgent = isUrgent(a.endsAt, now);
  return <article className="cm-card" onClick={() => onOpen(a)} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(a)}>
    <div className="cm-photo" style={{ backgroundImage: `url(${assetUrl(a.image)})` }}>
      <div className="cm-badges">
        {a.isEnded ? <span className="cm-chip cm-chip-end">{a.status === 'sold' || a.status === 'unpaid' ? 'Sold' : a.status === 'cancelled' ? 'Cancelled' : 'Ended'}</span> : <span className="cm-chip cm-chip-live">● LIVE</span>}
        {!a.isEnded && a.buyNowAvailable && <span className="cm-chip cm-chip-blue">Buy It Now</span>}
        {!a.isEnded && a.hasReserve && a.reserveMet && <span className="cm-chip cm-chip-hot">Reserve met</span>}
      </div>
      {showWatch && <button type="button" className={`cm-watch ${watching ? 'on' : ''}`} aria-label={watching ? 'Remove from watchlist' : 'Add to watchlist'} onClick={(e) => { e.stopPropagation(); onWatch(a); }}><Heart size={18} fill={watching ? 'currentColor' : 'none'} /></button>}
    </div>
    <div className="cm-body">
      <small>{a.category} · {a.sellerName}</small>
      <h3>{a.title}</h3>
      <div className="cm-price">{taka(a.isEnded && a.finalPrice ? a.finalPrice : a.currentBid)}</div>
      <div className="cm-row"><span><Gavel size={13} style={{ verticalAlign: '-2px' }} /> {a.bidCount} bid{a.bidCount === 1 ? '' : 's'}{a.hasReserve && !a.reserveMet && !a.isEnded ? ' · Reserve not met' : ''}</span>{a.watchers > 0 && <span><Eye size={13} style={{ verticalAlign: '-2px' }} /> {a.watchers}</span>}</div>
      <div className="cm-row"><span className={`cm-time ${urgent ? 'urgent' : ''}`}><Clock3 size={14} /> {a.isEnded ? 'Ended' : timeLeft(a.endsAt, now)}</span>{a.isLeading && <span className="cm-chip cm-chip-live">You lead</span>}</div>
    </div>
  </article>;
}