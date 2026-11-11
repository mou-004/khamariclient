import { useMemo, useState } from 'react';
import { Search, Star } from 'lucide-react';
import { useApi, dateText } from '../api.js';
import { PortalShell, PageCard, Loading, ErrorBox, Table } from '../components/PortalUI.jsx';

export default function SellerReviewsPage({ shell }) {
  const {data,loading,error,reload}=useApi('/seller/reviews');
  const [search,setSearch]=useState('');
  const items=data?.items||[];
  const list=useMemo(()=>items.filter(r=>[r.productName,r.userName,r.comment].join(' ').toLowerCase().includes(search.toLowerCase())),[items,search]);
  return <PortalShell {...shell}>
    <div className="portal-toolbar"><label className="portal-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your product reviews"/></label></div>
    {loading&&<Loading/>}{error&&<ErrorBox message={error} onRetry={reload}/>}
    {data&&<PageCard title="Customer product reviews" subtitle="Read-only feedback from customers about your products. Sellers cannot edit or delete customer reviews.">
      <Table headers={['Product','Customer','Rating','Customer feedback','Date']} empty="No customer reviews for your products yet." rows={list.map(r=>({key:r.id,cells:[<b>{r.productName}</b>,r.userName,<span className="stars">{[1,2,3,4,5].map(n=><Star key={n} size={13} fill={n<=r.rating?'currentColor':'none'}/>)}</span>,r.comment||<small className="portal-sub">No written comment</small>,dateText(r.createdAt)]}))}/>
    </PageCard>}
  </PortalShell>;
}
