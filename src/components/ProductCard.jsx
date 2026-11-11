import { CalendarDays, Heart, Plus, Star } from "lucide-react";
import { taka } from '../utils/money.js';
import { toggleSaved, useWishlist } from '../wishlist.js';

export default function ProductCard({ product, onAdd, onOpen }) {
  const { has } = useWishlist();
  const saved = has(product.id);
  // Stock is required for a safe public product. Missing or zero stock is sold out.
  const stock = Number(product.stock ?? 0);
  const soldOut = !Number.isFinite(stock) || stock <= 0;
  const preorderDeadline = product.preOrderDetails?.preorderDeadline || '';
  const preorderClosed = product.listingType === 'preorder' && Boolean(preorderDeadline) && preorderDeadline < new Date().toISOString().slice(0, 10);
  const unavailable = soldOut || preorderClosed;
  const unavailableLabel = preorderClosed ? 'Pre-order closed' : 'Sold out';

  const save = async (e) => {
    e.stopPropagation();
    try {
      await toggleSaved(product.id);
    } catch (error) {
      if (error.status === 401) window.location.hash = 'login';
    }
  };

  return (
    <article className="product-card">
      <div
        className={`product-photo ${unavailable ? "is-sold-out" : ""}`}
        onClick={() => onOpen(product)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpen(product)}
        aria-label={`View ${product.name}`}
      >
        <img src={product.image} alt={product.name} loading="lazy" />
        {product.badge ? <span className="product-badge">{product.badge}</span> : null}
        <button
          className={`save-btn ${saved ? 'saved' : ''}`}
          aria-label={saved ? 'Remove from saved items' : 'Save product'}
          onClick={save}
        >
          <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
        {product.oldPrice && (
          <span className="discount-pill">
            Save {Math.round((1 - product.price / product.oldPrice) * 100)}%
          </span>
        )}
        {unavailable && <span className="soldout-pill">{unavailableLabel}</span>}
      </div>

      <div className="product-info">
        <div className="product-category">
          {product.subcategory || product.category}
        </div>

        <button className="product-title" onClick={() => onOpen(product)}>
          {product.name}
        </button>

        {product.animalDetails && (
          <div className="animal-card-meta">
            <span>{product.animalDetails.breed}</span>
            <span>{product.animalDetails.age}</span>
          </div>
        )}

        {product.listingType === 'preorder' && product.preOrderDetails?.harvestDate && (
          <div className="product-preorder-meta">
            <CalendarDays size={13} />
            <span>Expected {new Date(`${product.preOrderDetails.harvestDate}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        )}

        {typeof product.description === 'string' && product.description.trim() && (
          <p className="product-description-preview">{product.description.trim()}</p>
        )}

        <div className="rating-line">
          {product.reviews > 0 ? (
            <>
              <Star size={13} fill="currentColor" />
              <b>{product.rating}</b>
              <span>({product.reviews} {product.reviews === 1 ? 'review' : 'reviews'})</span>
            </>
          ) : (
            <span className="rating-new">New · no reviews yet</span>
          )}
        </div>

        <div className="product-bottom">
          <div>
            <strong>{taka(product.price)}</strong>
            <span className="product-unit"> / {product.unit}</span>
            {product.oldPrice && <del>{taka(product.oldPrice)}</del>}
          </div>
          <button
            type="button"
            className={`add-btn ${product.listingType === 'preorder' ? 'preorder-add-btn' : ''}`}
            disabled={unavailable}
            onClick={() => onAdd(product)}
            aria-label={unavailable ? `${product.name}: ${unavailableLabel}` : (product.listingType === 'preorder' ? `Reserve ${product.name}` : `Add ${product.name} to basket`)}
            title={unavailable ? unavailableLabel : (product.listingType === 'preorder' ? 'Reserve pre-order' : 'Add to basket')}
          >
            {unavailable ? <span className="add-btn-sold-out">{unavailableLabel}</span> : <>{product.listingType === 'preorder' ? <span className="add-btn-reserve">Reserve</span> : null}<Plus size={18} /></>}
          </button>
        </div>
      </div>
    </article>
  );
}
