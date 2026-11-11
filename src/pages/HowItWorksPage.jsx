import { ArrowRight, Search, ShoppingBasket, ShieldCheck, Truck, Sprout, CreditCard, ClipboardList, PackageCheck, MessageCircle } from 'lucide-react';

const steps = [
  { n: '01', icon: Search, title: 'Find what you need', body: 'Browse products, farm produce, livestock, pet essentials and agricultural supplies.' },
  { n: '02', icon: ShoppingBasket, title: 'Add to your basket', body: 'Choose your products, check quantities and review your basket before checkout.' },
  { n: '03', icon: CreditCard, title: 'Place your order', body: 'Provide delivery details and select an available payment method.' },
  { n: '04', icon: ClipboardList, title: 'Seller accepts and prepares', body: 'The seller reviews the order, accepts it and prepares the items for dispatch.' },
  { n: '05', icon: Truck, title: 'Order goes out for delivery', body: 'The seller adds the delivery method, courier or tracking details, and an estimated arrival date.' },
  { n: '06', icon: PackageCheck, title: 'Confirm receipt and review', body: 'After the seller marks the order delivered, confirm that it arrived. You can then review the products.' }
];

export default function HowItWorksPage({ navigate }) {
  return <main className="page-container" style={{ paddingTop: 48, paddingBottom: 76 }}>
    <section style={{ maxWidth: 820, margin: '0 auto 42px', textAlign: 'center' }}>
      <span className="section-kicker">SIMPLE. LOCAL. CONVENIENT.</span>
      <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 4.2rem)', lineHeight: 1.06, margin: '14px 0' }}>How <em>Khamari</em> works</h1>
      <p style={{ fontSize: 17, lineHeight: 1.8, color: 'var(--muted, #718195)' }}>Khamari connects customers with local farmers and sellers. Discover products, place an order and follow its journey from seller to your door.</p>
      <button className="primary-btn" onClick={() => navigate('products')}>Explore products <ArrowRight size={16}/></button>
    </section>

    <section aria-label="How ordering works" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 245px), 1fr))', gap: 18 }}>
      {steps.map(({n,icon:Icon,title,body}) => <article key={n} style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #B3CFE5)', borderRadius: 18, padding: 24, minHeight: 220 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <span style={{ fontWeight:700, color:'var(--muted, #718195)' }}>{n}</span>
          <span style={{ width:44,height:44,borderRadius:14,display:'grid',placeItems:'center',background:'var(--soft, #F6FAFD)' }}><Icon size={22}/></span>
        </div>
        <h2 style={{ fontSize:20, margin:'0 0 10px' }}>{title}</h2>
        <p style={{ lineHeight:1.7, color:'var(--muted, #718195)', margin:0 }}>{body}</p>
      </article>)}
    </section>

    <section style={{ marginTop:48, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap:20 }}>
      <article style={{ borderRadius:20, padding:28, background:'var(--soft, #F6FAFD)' }}>
        <Sprout size={26}/><h2>For farmers and sellers</h2>
        <p style={{ lineHeight:1.7 }}>Create a seller account, list your products and manage incoming orders through your seller dashboard. Keep product details, stock and order status up to date.</p>
        <button className="text-link" onClick={()=>navigate('register-seller')}>Start selling <ArrowRight size={15}/></button>
      </article>
      <article style={{ borderRadius:20, padding:28, background:'var(--soft, #F6FAFD)' }}>
        <ShieldCheck size={26}/><h2>Shop with confidence</h2>
        <p style={{ lineHeight:1.7 }}>Review product information before ordering. Use your dashboard to check order history, delivery progress, notifications and support options.</p>
        <button className="text-link" onClick={()=>navigate('products')}>Browse marketplace <ArrowRight size={15}/></button>
      </article>
    </section>

    <section style={{ marginTop:38, textAlign:'center', padding:28, border:'1px solid var(--border, #B3CFE5)', borderRadius:20 }}>
      <MessageCircle size={25}/><h2>Need help?</h2><p style={{color:'var(--muted, #718195)'}}>Visit Khamari support for help with products, orders, delivery or your account.</p>
      <button className="primary-btn" onClick={()=>navigate('support')}>Help & support <ArrowRight size={16}/></button>
    </section>
  </main>;
}
