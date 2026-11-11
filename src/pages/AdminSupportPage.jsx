import { useState } from 'react';
import { Search, Send, RefreshCw } from 'lucide-react';
import { api, useApi, dateTimeText } from '../api.js';
import { PortalShell, PageCard, Loading, ErrorBox, StatusBadge } from '../components/PortalUI.jsx';

const STATES = ['open','in_progress','resolved','closed'];
export default function AdminSupportPage({ shell, notify }) {
  const { data, loading, error, reload } = useApi('/admin/support');
  const [search,setSearch] = useState('');
  const [drafts,setDrafts] = useState({});
  const [busy,setBusy] = useState('');
  const tickets=(data?.items||[]).filter(t=>[t.ticketNumber,t.userName,t.userEmail,t.subject,t.topic,t.messages?.map(m=>m.body).join(' ')].join(' ').toLowerCase().includes(search.toLowerCase()));
  const reply=async ticket=>{
    const message=(drafts[ticket.id]||'').trim(); if(!message) return;
    try { setBusy(ticket.id); const r=await api(`/admin/support/${ticket.id}/reply`,{method:'POST',body:{message}}); notify(r.message); setDrafts(d=>({...d,[ticket.id]:''})); reload(); }
    catch(e){notify(e.message);} finally{setBusy('');}
  };
  const status=async(ticket,value)=>{
    try{setBusy(ticket.id);const r=await api(`/admin/support/${ticket.id}/status`,{method:'PATCH',body:{status:value}});notify(r.message);reload();}
    catch(e){notify(e.message);}finally{setBusy('');}
  };
  return <PortalShell {...shell}>
    <div className="portal-toolbar"><label className="portal-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tickets, customers or messages"/></label></div>
    {loading&&<Loading/>}{error&&<ErrorBox message={error} onRetry={reload}/>}
    {data&&<PageCard title="Customer support inbox" subtitle={`${tickets.length} support request(s). Read the problem, reply to the customer and update its status.`}>
      {!tickets.length?<p className="portal-muted">No support requests found.</p>:<div style={{display:'grid',gap:18}}>{tickets.map(ticket=><article key={ticket.id} style={{border:'1px solid var(--border,#B3CFE5)',borderRadius:16,padding:18}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><b>{ticket.ticketNumber} · {ticket.subject}</b><p className="portal-muted">{ticket.userName} · {ticket.userEmail} · {ticket.userRole} · {ticket.topic}</p><small>{dateTimeText(ticket.createdAt)}</small></div><select className="portal-select" value={ticket.status} disabled={busy===ticket.id} onChange={e=>status(ticket,e.target.value)}>{STATES.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>
        <div style={{display:'grid',gap:10,margin:'16px 0'}}>{(ticket.messages||[]).map((m,i)=><div key={m.id||i} style={{padding:12,borderRadius:10,background:m.senderRole==='admin'?'var(--soft,#F6FAFD)':'var(--surface,#fff)',border:'1px solid var(--border,#B3CFE5)'}}><b>{m.senderRole==='admin'?`Admin · ${m.senderName}`:`${m.senderName} · ${m.senderRole}`}</b><small style={{marginLeft:8}}>{dateTimeText(m.createdAt)}</small><p style={{marginBottom:0,whiteSpace:'pre-wrap'}}>{m.body}</p></div>)}</div>
        {!['resolved','closed'].includes(ticket.status)&&<div style={{display:'flex',gap:10,alignItems:'end',flexWrap:'wrap'}}><label style={{flex:'1 1 280px'}}>Reply to customer<textarea value={drafts[ticket.id]||''} onChange={e=>setDrafts(d=>({...d,[ticket.id]:e.target.value}))} placeholder="Write a helpful reply…" maxLength={3000}/></label><button className="portal-primary" disabled={busy===ticket.id||!(drafts[ticket.id]||'').trim()} onClick={()=>reply(ticket)}>{busy===ticket.id?'Sending…':'Send reply'} <Send size={15}/></button></div>}
      </article>)}</div>}
    </PageCard>}
  </PortalShell>;
}
