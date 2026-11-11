import { ArrowRight, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { taka } from '../utils/portal.js';
import { useApi } from '../api.js';
import { toggleSaved } from '../wishlist.js';
import { PortalShell, PageCard, Loading, ErrorBox } from '../components/PortalUI.jsx';

// Saved products come from your account in Firestore, so they follow you to any device.
export default function WishlistPage({ shell, navigate, notify, onAddToCart }) {
  const { data, loading, error, reload } = useApi('/wishlist');
  const remove = async (p) => { try { await toggleSaved(p.id); reload(); } catch (e) { notify(e.message); } };
  const items = data?.items || [];
  return <PortalShell {...shell}>
    {loading && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
    {data && <PageCard title="Saved products and animals" subtitle="Saved to your account">
      <div className="portal-mini-products">{items.map((p) => <article key={p.id}><img src={p.image} alt="" /><div><b>{p.name}</b><small>{p.category} · {p.farm}</small><strong>{taka(p.price)}</strong></div>
        <div className="portal-row-actions"><button className="portal-row-action" title="View product" onClick={() => navigate(`product-detail?id=${p.id}`)}><ArrowRight size={15} /></button><button className="portal-row-action" title="Add to basket" disabled={Number(p.stock) <= 0} onClick={() => onAddToCart(p)}><ShoppingBag size={15} /></button><button className="portal-row-action" title="Remove" onClick={() => remove(p)}><Trash2 size={15} /></button></div></article>)}</div>
      {!items.length && <div className="portal-empty-panel"><Heart size={25} /><h3>No saved products yet</h3><p>Use the heart icon on any product to save it here.</p><button className="portal-primary" onClick={() => navigate('products')}>Browse products <ArrowRight size={16} /></button></div>}
    </PageCard>}
  </PortalShell>;
}