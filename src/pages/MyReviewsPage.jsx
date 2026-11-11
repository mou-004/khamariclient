import { Star, MessageSquare, ExternalLink } from 'lucide-react';
import { useApi, dateText } from '../api.js';
import { PortalShell, PageCard, Loading, ErrorBox } from '../components/PortalUI.jsx';

export default function MyReviewsPage({ shell, navigate }) {
  const { data, loading, error, reload } = useApi('/reviews/mine');
  const items = data?.items || [];
  return <PortalShell {...shell}>
    {loading && <Loading />}
    {error && <ErrorBox message={error} onRetry={reload} />}
    {data && <PageCard title="My product reviews" subtitle="Reviews you have submitted. Open a product to read or update your review.">
      {!items.length ? <div style={{padding:24,textAlign:'center'}}>
        <MessageSquare size={30}/>
        <h3>No reviews yet</h3>
        <p className="portal-muted">After you confirm receipt of an order, open its product page to leave a verified review.</p>
        <button className="portal-primary" onClick={() => navigate('orders')}>View my orders</button>
      </div> : <div style={{display:'grid',gap:14}}>
        {items.map(r => <article key={r.id} style={{display:'grid',gridTemplateColumns:'76px 1fr auto',gap:16,alignItems:'center',padding:14,border:'1px solid var(--border,#B3CFE5)',borderRadius:14}}>
          <img src={r.product?.image || ''} alt="" style={{width:76,height:76,objectFit:'cover',borderRadius:10,background:'#F6FAFD'}}/>
          <div>
            <b>{r.product?.name || 'Product no longer available'}</b>
            <div className="stars" style={{display:'flex',gap:2,margin:'5px 0'}}>{[1,2,3,4,5].map(n=><Star key={n} size={14} fill={n<=r.rating?'currentColor':'none'}/>)}</div>
            <p style={{margin:'4px 0'}}>{r.comment || 'No written comment.'}</p>
            <small className="portal-sub">{r.verified ? 'Verified purchase · ' : ''}{dateText(r.createdAt)}</small>
          </div>
          {r.product && <button className="portal-row-action" onClick={()=>navigate(`product-detail?id=${encodeURIComponent(r.productId)}`)} title="Open product to edit review"><ExternalLink size={16}/> Edit</button>}
        </article>)}
      </div>}
    </PageCard>}
  </PortalShell>;
}
