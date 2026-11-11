import { useState } from 'react';
import { ArrowRight, CreditCard, Store, Truck, Gavel, RotateCcw, Send, MessageCircle, RefreshCw } from 'lucide-react';
import { api, useApi, dateTimeText } from '../api.js';
import { PortalShell, PageCard, Loading, ErrorBox, StatusBadge } from '../components/PortalUI.jsx';

export default function SupportPage({ navigate, user, onLogout, toast, setToast, notify, title, subtitle }) {
  const { data, loading, error, reload } = useApi(user ? '/support/tickets/mine' : null);
  const [form, setForm] = useState({ topic: 'Order or delivery', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState({});
  const send = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      const result = await api('/support/tickets', { method: 'POST', body: form });
      notify(result.message);
      setForm({ topic: 'Order or delivery', subject: '', message: '' });
      reload();
    } catch (err) { notify(err.message); } finally { setBusy(false); }
  };
  return <PortalShell user={user} navigate={navigate} onLogout={onLogout} toast={toast} onDismissToast={() => setToast('')} title={title} subtitle={subtitle}>
    <div className="portal-support-grid">{[['Orders & delivery','Track your order and delivery updates.','orders',Truck],['Buying & payments','Review your basket and checkout options.','checkout',CreditCard],['Selling on Khamari','Manage your products and orders.','seller-products',Store],['Auctions & bids','Review auctions and your bids.','my-bids',Gavel],['Returns & refunds','Request a refund and track its progress.','refund-policy',RotateCcw]].map(([h,p,r,I])=><button key={h} onClick={()=>navigate(r)}><span><I size={20}/></span><b>{h}</b><p>{p}</p><ArrowRight size={15}/></button>)}</div>
    <PageCard title="Contact Khamari support" subtitle="Send a real support request. Our admin team can view it and reply from the admin dashboard.">
      <form className="portal-form" onSubmit={send}>
        <label>Topic<select value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})}>{['Order or delivery','Seller account','Product','Auction','Payment','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Subject<input value={form.subject} maxLength={120} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Briefly describe the issue"/></label>
        <label>Message<textarea value={form.message} minLength={10} maxLength={3000} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Explain your problem and include an order number if relevant." required/></label>
        <button className="portal-primary" type="submit" disabled={busy}>{busy?'Sending…':'Submit support request'} <Send size={16}/></button>
      </form>
    </PageCard>
    <PageCard title="Your support requests" subtitle="View your requests and replies from Khamari support.">
      {loading&&<Loading/>}{error&&<ErrorBox message={error} onRetry={reload}/>}
      {data && (!data.items.length ? <p className="portal-muted">You have not submitted any support requests yet.</p> : <div style={{display:'grid',gap:16}}>{data.items.map(ticket=><article key={ticket.id} style={{border:'1px solid var(--border,#B3CFE5)',borderRadius:14,padding:18}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><b>{ticket.ticketNumber} · {ticket.subject}</b><p className="portal-muted">{ticket.topic} · {dateTimeText(ticket.createdAt)}</p></div><StatusBadge status={ticket.status}/></div>
        <div style={{display:'grid',gap:10,marginTop:12}}>{(ticket.messages||[]).map((m,i)=><div key={m.id||i} style={{padding:12,borderRadius:10,background:m.senderRole==='admin'?'var(--soft,#F6FAFD)':'var(--surface,#fff)',border:'1px solid var(--border,#B3CFE5)'}}><b>{m.senderRole==='admin'?'Khamari Support':m.senderName}</b><small style={{marginLeft:8}}>{dateTimeText(m.createdAt)}</small><p style={{marginBottom:0,whiteSpace:'pre-wrap'}}>{m.body}</p></div>)}</div>
      </article>)}</div>)}
    </PageCard>
  </PortalShell>;
}
