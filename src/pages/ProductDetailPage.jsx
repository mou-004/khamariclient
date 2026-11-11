
import { useEffect, useState } from 'react';

import {
  ShoppingCart,
  Heart,
  Star,
  Package,
  ShieldCheck,
  Truck,
  CheckCircle2
} from 'lucide-react';

import { api } from '../api.js';
import { taka } from '../utils/money.js';

import './ProductDetailPage.css';

export default function ProductDetailPage({
  navigate,
  addToCart
}) {

  const getProductId = () => {
    return new URLSearchParams(
      window.location.hash.split('?')[1] || ''
    ).get('id');
  };

  const [productId, setProductId] = useState(getProductId);
  const [product, setProduct] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [quantity, setQuantity] = useState(1);
  const [saved, setSaved] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewNotice, setReviewNotice] = useState('');
  const [reviewError, setReviewError] = useState('');

  // Detect URL changes
  useEffect(() => {
    const update = () => setProductId(getProductId());

    window.addEventListener('hashchange', update);

    return () => {
      window.removeEventListener('hashchange', update);
    };
  }, []);

  // Load product dynamically
  useEffect(() => {

    if (!productId) {
      setError('Product ID is missing.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchProduct() {

      try {

        setLoading(true);
        setError('');
        setProduct(null);
        setQuantity(1);

        const result = await api(
          `/products/${encodeURIComponent(productId)}`,
          { signedIn: 'auto' }
        );

        if (!result.item) {
          throw new Error('Product not found.');
        }

        if (!cancelled) {
          setProduct(result.item);
        }

      } catch (err) {

        if (!cancelled) {
          setError(
            err.message || 'Unable to load product.'
          );
        }

      } finally {

        if (!cancelled) {
          setLoading(false);
        }

      }

    }

    fetchProduct();

    return () => {
      cancelled = true;
    };

  }, [productId]);

  const loadReviews = async () => {
    try {
      const result = await api(`/products/${encodeURIComponent(productId)}/reviews`, { signedIn: 'auto' });
      setReviewData(result);
      if (result.myReview) {
        setReviewRating(result.myReview.rating);
        setReviewComment(result.myReview.comment || '');
      }
    } catch (err) { setReviewError(err.message); }
  };

  useEffect(() => {
    if (productId) loadReviews();
  }, [productId]);

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      setReviewBusy(true); setReviewNotice(''); setReviewError('');
      const result = await api(`/products/${encodeURIComponent(productId)}/reviews`, { method: 'POST', body: { rating: reviewRating, comment: reviewComment } });
      setReviewNotice(result.message);
      await loadReviews();
    } catch (err) { setReviewError(err.message); }
    finally { setReviewBusy(false); }
  };

  // Loading screen
  if (loading) {
    return (
      <div className="pd-page">
        <div className="pd-loading">
          <div className="pd-spinner" />
          <h3>Loading product...</h3>
          <p>Please wait.</p>
        </div>
      </div>
    );
  }

  // Error screen
  if (error || !product) {
    return (
      <div className="pd-page">
        <div className="pd-error">
          <Package size={50} />
          <h2>Product Not Found</h2>
          <p>{error || 'This product is unavailable.'}</p>
          <button onClick={() => navigate('products')}>
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  // Product data
  const stock = Number(product.stock || 0);
  const price = Number(product.price || 0);

  const isPreorder = product.listingType === 'preorder';
  const preorderDetails = product.preOrderDetails || {};
  const unavailable =
    product.status !== 'active' || stock <= 0 ||
    (isPreorder && preorderDetails.preorderDeadline && preorderDetails.preorderDeadline < new Date().toISOString().slice(0, 10));

  const total = price * quantity;

  // Single product image
  const productImage =
    product.image ||
    (Array.isArray(product.images) ? product.images[0] : '') ||
    '';

  // Add to cart
  const handleAddToCart = () => {

    if (unavailable || !addToCart) return;

    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }

  };

  // Buy now
  const handleBuyNow = () => {

    if (unavailable) return;

    handleAddToCart();
    navigate('checkout');

  };

  return (

    <main className="pd-page">

      <div className="pd-container">

        {/* LEFT: SINGLE PRODUCT IMAGE */}

        <section className="pd-gallery">

          <div className="pd-gallery-label">
            <span>{isPreorder ? "PRE-ORDER" : "PRODUCT"}</span>
            <span>KHAMARI COLLECTION</span>
          </div>

          <div className="pd-main-image">

            {productImage ? (

              <img
                src={productImage}
                alt={product.name}
              />

            ) : (

              <div className="pd-no-image">
                <Package size={65} />
                <p>Product image unavailable</p>
              </div>

            )}

            {product.badge && (
              <span className="pd-product-badge">
                {product.badge}
              </span>
            )}

          </div>

          <div className="pd-image-caption">
            <CheckCircle2 size={16} />
            <span>Product image provided by seller</span>
          </div>

        </section>

        {/* RIGHT: PRODUCT INFORMATION */}

        <section className="pd-information">

          <span className="pd-category">
            {product.category || 'General'}
          </span>

          <h1>{product.name}</h1>

          {/* Rating */}

          <div className="pd-rating">

            <Star
              size={17}
              fill="#e7a82e"
              color="#e7a82e"
            />

            <strong>
              {Number(product.rating || 0).toFixed(1)}
            </strong>

            <span>
              ({product.reviews || 0} reviews)
            </span>

          </div>

          {/* Price */}

          <div className="pd-price">
            <strong>{taka(price)}</strong>
            <span>/ {product.unit || 'unit'}</span>
          </div>

          {Number(product.oldPrice) > price && (
            <div className="pd-old-price">
              <del>{taka(product.oldPrice)}</del>
              <span>
                Save {Math.round(
                  (1 - price / Number(product.oldPrice)) * 100
                )}%
              </span>
            </div>
          )}

          <div className="pd-divider" />

          {/* Description */}

          {isPreorder && <div className="pd-description-section">
            <h3>Pre-order schedule</h3>
            <p><strong>Expected availability:</strong> {preorderDetails.harvestDate || 'To be confirmed'}</p>
            <p><strong>Pre-order closes:</strong> {preorderDetails.preorderDeadline || 'To be confirmed'}</p>
            {preorderDetails.note && <p>{preorderDetails.note}</p>}
          </div>}

          <div className="pd-description-section">
            <h3>Product Description</h3>

            <p>
              {product.description ||
                'No product description available.'}
            </p>
          </div>

          {/* Seller */}

          <div className="pd-seller">

            <div className="pd-seller-icon">
              <Package size={22} />
            </div>

            <div>
              <small>Sold by</small>
              <strong>
                {product.sellerName || 'Khamari Store'}
              </strong>
              <span>
                {product.sellerLocation || 'Verified marketplace seller'}
              </span>
            </div>

            <ShieldCheck
              className="pd-verified"
              size={21}
            />

          </div>

          {/* Availability */}

          <div className={`pd-stock ${
            unavailable ? 'out' : ''
          }`}>

            <span className="pd-stock-dot" />

            <div>
              <strong>
                {unavailable ? 'Currently unavailable' : isPreorder ? 'Available for pre-order' : 'Available for order'}
              </strong>

              <small>
                {unavailable ? (isPreorder ? 'The pre-order window is closed or quantity is unavailable.' : 'This product is currently out of stock.') : isPreorder ? `${stock} pre-order slots available` : `${stock} units available`}
              </small>
            </div>

          </div>

          {/* Specifications */}

          <div className="pd-specifications">

            <h3>Product Information</h3>

            <div>
              <span>Category</span>
              <strong>{product.category || 'N/A'}</strong>
            </div>

            <div>
              <span>Subcategory</span>
              <strong>{product.subcategory || 'N/A'}</strong>
            </div>

            <div>
              <span>Unit</span>
              <strong>{product.unit || 'N/A'}</strong>
            </div>

            <div>
              <span>Seller</span>
              <strong>{product.sellerName || 'Khamari Store'}</strong>
            </div>

          </div>

          {/* Quantity */}

          <div className="pd-quantity">

            <span>{isPreorder ? 'Pre-order quantity' : 'Quantity'}</span>

            <div className="pd-qty-control">

              <button
                disabled={quantity <= 1}
                onClick={() =>
                  setQuantity(q => Math.max(1, q - 1))
                }
              >
                −
              </button>

              <strong>{quantity}</strong>

              <button
                disabled={quantity >= stock}
                onClick={() =>
                  setQuantity(q => Math.min(stock, q + 1))
                }
              >
                +
              </button>

            </div>

          </div>

          {/* Total */}

          <div className="pd-total">

            <span>Total Amount</span>

            <strong>{taka(total)}</strong>

          </div>

          {/* Buttons */}

          <div className="pd-buttons">

            <button
              className="pd-cart-button"
              disabled={unavailable}
              onClick={handleAddToCart}
            >
              <ShoppingCart size={19} />
              {isPreorder ? 'Reserve pre-order' : 'Add to Basket'}
            </button>

            <button
              className={`pd-wishlist-button ${
                saved ? 'saved' : ''
              }`}
              onClick={() => setSaved(!saved)}
              title="Save product"
            >
              <Heart
                size={21}
                fill={saved ? 'currentColor' : 'none'}
              />
            </button>

          </div>

          <button
            className="pd-buy-button"
            disabled={unavailable}
            onClick={handleBuyNow}
          >
            {isPreorder ? 'Reserve now' : 'Buy Now'}
          </button>

          {/* Trust information */}

          <div className="pd-trust">

            <div>
              <ShieldCheck size={21} />
              <span>
                <strong>Trusted Marketplace</strong>
                <small>Shop with confidence</small>
              </span>
            </div>

            <div>
              <Truck size={21} />
              <span>
                <strong>Farm to Home</strong>
                <small>Delivery available</small>
              </span>
            </div>

          </div>

        </section>

      </div>

      <section className="pd-reviews" style={{maxWidth:1180,margin:'48px auto 0',padding:'28px 20px',borderTop:'1px solid #B3CFE5'}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
          <div><h2 style={{margin:'0 0 8px'}}>Customer reviews</h2><p style={{margin:0,color:'#718195'}}>Customers can review after confirming that their order was received.</p></div>
          <div style={{fontSize:18,fontWeight:700}}><Star size={18} fill="#e7a82e" color="#e7a82e" style={{verticalAlign:'-3px'}}/> {reviewData?.summary?.avg?.toFixed?.(1) || '0.0'} / 5 <small>({reviewData?.summary?.count || 0} reviews)</small></div>
        </div>
        {reviewNotice&&<p role="status" className="portal-alert">{reviewNotice}</p>}
        {reviewError&&<p role="alert" className="portal-alert">{reviewError}</p>}
        {reviewData?.canReview&&<form onSubmit={submitReview} className="portal-form" style={{maxWidth:680,margin:'22px 0',padding:18,border:'1px solid #B3CFE5',borderRadius:14}}>
          <h3 style={{marginTop:0}}>{reviewData.myReview?'Update your review':'Write a review'}</h3>
          <label>Rating <span className="stars">{[1,2,3,4,5].map(n=><button key={n} type="button" onClick={()=>setReviewRating(n)} aria-label={`${n} stars`} style={{border:0,background:'transparent',padding:3,cursor:'pointer'}}><Star size={22} fill={n<=reviewRating?'currentColor':'none'}/></button>)}</span></label>
          <label>Your feedback<textarea value={reviewComment} maxLength={600} onChange={e=>setReviewComment(e.target.value)} placeholder="Share your experience with this product."/></label>
          <button className="portal-primary" disabled={reviewBusy}>{reviewBusy?'Submitting…':'Submit review'}</button>
        </form>}
        {reviewData&&!reviewData.canReview&&!reviewData.signedIn&&<p>Sign in with your customer account and receive this product to leave a verified review.</p>}
        {reviewData&&!reviewData.canReview&&reviewData.signedIn&&<p className="portal-muted">A review becomes available after you confirm receipt of an order containing this product. Seller and admin accounts cannot submit reviews.</p>}
        {reviewData?.items?.length ? <div style={{display:'grid',gap:14,marginTop:20}}>{reviewData.items.map(r=><article key={r.id} style={{padding:'16px 0',borderTop:'1px solid #B3CFE5'}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><b>{r.userName||'Customer'}</b><span className="stars">{[1,2,3,4,5].map(n=><Star key={n} size={13} fill={n<=r.rating?'currentColor':'none'}/>)}</span></div>
          {r.verified&&<small className="portal-sub">Verified purchase</small>}<p style={{whiteSpace:'pre-wrap',marginBottom:4}}>{r.comment||'Rated this product.'}</p>
        </article>)}</div>:<p className="portal-muted">No reviews yet. Be the first eligible customer to review this product.</p>}
      </section>

    </main>

  );

}
