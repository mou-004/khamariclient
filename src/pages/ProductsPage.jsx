
import { useEffect, useRef, useState } from 'react';
import {
  Search, X, SlidersHorizontal, ChevronDown, ChevronRight,
  Grid2X2, Sprout, Apple, Wheat, Milk, Fish, Beef,
  PawPrint, Package, Tractor, ShoppingBasket, RotateCcw
} from 'lucide-react';

import { api } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import { categories as shopCategories } from '../data.js';

const PAGE_SIZE = 12;

const categoryIcons = {
  'All products': Grid2X2,
  Vegetables: Sprout,
  Fruits: Apple,
  'Rice & Grains': Wheat,
  'Dairy & Eggs': Milk,
  'Fish & Meat': Fish,
  Livestock: Beef,
  Pets: PawPrint,
  'Animal Feed & Care': Package,
  'Seeds & Fertilizer': Sprout,
  'Farm Equipment': Tractor,
  Pantry: ShoppingBasket
};

const readParams = () => {
  const params = new URLSearchParams(
    window.location.hash.split('?')[1] || ''
  );

  return {
    q: params.get('q') || '',
    category: params.get('category') || 'All products',
    subcategory: params.get('subcategory') || 'All',
    sort: params.get('sort') || 'featured',
    min: params.get('min') || '',
    max: params.get('max') || ''
  };
};

export default function ProductsPage({ navigate, addToCart }) {
  const first = useRef(readParams()).current;

  const [q, setQ] = useState(first.q);
  const [category, setCategory] = useState(first.category);
  const [subcategory, setSubcategory] = useState(first.subcategory);
  const [expanded, setExpanded] = useState(first.category);
  const [sort, setSort] = useState(first.sort);

  const [minRaw, setMinRaw] = useState(first.min);
  const [maxRaw, setMaxRaw] = useState(first.max);

  const [applied, setApplied] = useState({
    q: first.q,
    min: first.min,
    max: first.max
  });

  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    pages: 1,
    facets: {}
  });

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [promoCodes, setPromoCodes] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api('/coupons/available', { signedIn: 'auto' })
      .then((data) => { if (!cancelled) setPromoCodes(Array.isArray(data.items) ? data.items : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setApplied({ q, min: minRaw, max: maxRaw });
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [q, minRaw, maxRaw]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (applied.q) params.set('q', applied.q);
    if (category !== 'All products') params.set('category', category);
    if (subcategory !== 'All') params.set('subcategory', subcategory);
    if (sort !== 'featured') params.set('sort', sort);
    if (applied.min) params.set('min', applied.min);
    if (applied.max) params.set('max', applied.max);

    window.history.replaceState(
      null,
      '',
      `#products${params.toString() ? `?${params}` : ''}`
    );

    const query = new URLSearchParams({
      limit: PAGE_SIZE,
      page,
      sort
    });

    if (applied.q) query.set('q', applied.q);
    if (category !== 'All products') query.set('category', category);
    if (subcategory !== 'All') query.set('subcategory', subcategory);
    if (applied.min) query.set('minPrice', applied.min);
    if (applied.max) query.set('maxPrice', applied.max);

    let cancelled = false;

    setStatus(page === 1 ? 'loading' : 'more');
    setError('');

    api(`/products?${query}`, { signedIn: false })
      .then((data) => {
        if (cancelled) return;

        setItems(old =>
          page === 1 ? data.items : [...old, ...data.items]
        );

        setMeta({
          total: data.total,
          pages: data.pages,
          facets: data.facets || {}
        });

        setStatus('ready');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applied, category, subcategory, sort, page, retry]);

  const pickCategory = (name) => {
    setCategory(name);
    setSubcategory('All');
    setExpanded(name === 'All products' ? '' : name);
    setPage(1);
  };

  const pickSubcategory = (name) => {
    setSubcategory(name);
    setPage(1);
  };

  const clearFilters = () => {
    setQ('');
    setMinRaw('');
    setMaxRaw('');
    setApplied({ q: '', min: '', max: '' });
    setCategory('All products');
    setSubcategory('All');
    setExpanded('');
    setSort('featured');
    setPage(1);
  };

  const openProduct = (product) => {
    navigate(`product-detail?id=${encodeURIComponent(product.id)}`);
  };

  const allCount = Object.values(meta.facets).reduce(
    (sum, count) => sum + count,
    0
  );

  const filtered = Boolean(
    applied.q ||
    applied.min ||
    applied.max ||
    category !== 'All products' ||
    subcategory !== 'All'
  );

  const departments = shopCategories.filter(
    item => item.name !== 'All products'
  );

  return (
    <div className="products-page page-container khamari-shop">

      {/* HERO */}
      <section className="shop-hero">
        <div>
          <span className="shop-eyebrow">THE KHAMARI MARKETPLACE</span>

          <h1>
            Everything your farm
            <br />
            and home needs.
          </h1>

          <p>
            Fresh produce, healthy livestock, pet essentials
            and trusted farm supplies from local sellers.
          </p>
        </div>

        <div className="shop-hero-decoration">
          <Sprout size={65} strokeWidth={1.2} />
          <span>FRESH FROM LOCAL FARMS</span>
          <strong>Shop local. Grow together.</strong>
        </div>
      </section>

      {promoCodes.length > 0 && (
        <section className="shop-promo-strip page-container" aria-label="Available promo codes">
          <div className="shop-promo-intro">
            <span>KHAMARI SPECIAL OFFERS</span>
            <strong>Save more at checkout</strong>
            <small>Apply an eligible promo code before placing your order.</small>
          </div>
          <div className="shop-promo-list">
            {promoCodes.slice(0, 3).map((offer) => (
              <article className="shop-promo-card" key={offer.code}>
                <div><b>{offer.code}</b><small>{Number(offer.minOrder) > 0 ? `Min. order ${offer.minOrder} BDT` : 'No minimum order'}</small></div>
                <strong>{offer.discount}% OFF</strong>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* SHOP LAYOUT */}
      <div className="shop-layout">

        {/* LEFT SIDEBAR */}
        <aside className="shop-sidebar">

          <div className="sidebar-heading">
            <div>
              <SlidersHorizontal size={18} />
              <strong>Categories</strong>
            </div>

            <button
              onClick={clearFilters}
              title="Reset filters"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* ALL PRODUCTS */}
          <button
            className={`sidebar-all ${
              category === 'All products' ? 'active' : ''
            }`}
            onClick={() => pickCategory('All products')}
          >
            <Grid2X2 size={18} />
            <span>All products</span>
            <small>{allCount}</small>
          </button>

          {/* CATEGORY LIST */}
          <div className="sidebar-categories">

            {departments.map((item, departmentIndex) => {
              const Icon = categoryIcons[item.name] || Package;
              const active = category === item.name;
              const isExpanded = expanded === item.name;

              return (
                <div
                  className={`sidebar-category ${
                    active ? 'active' : ''
                  }`}
                  key={`${item.id || item.slug || item.name}-${departmentIndex}`}
                >

                  <div className="sidebar-category-main">

                    <button
                      className="sidebar-category-select"
                      onClick={() => pickCategory(item.name)}
                    >
                      <span className="category-icon">
                        <Icon size={18} />
                      </span>

                      <span className="category-name">
                        {item.name}
                      </span>

                      <small>
                        {meta.facets[item.name] || 0}
                      </small>
                    </button>

                    <button
                      className="category-expand"
                      onClick={() =>
                        setExpanded(isExpanded ? '' : item.name)
                      }
                      aria-label={`Expand ${item.name}`}
                    >
                      {isExpanded
                        ? <ChevronDown size={16} />
                        : <ChevronRight size={16} />
                      }
                    </button>

                  </div>

                  {/* SUBCATEGORIES */}
                  {isExpanded && (
                    <div className="sidebar-subcategories">

                      <button
                        className={
                          active && subcategory === 'All'
                            ? 'selected'
                            : ''
                        }
                        onClick={() => pickCategory(item.name)}
                      >
                        All {item.name}
                      </button>

                      {(item.subcategories || []).map((sub) => (
                        <button
                          key={sub}
                          className={
                            active && subcategory === sub
                              ? 'selected'
                              : ''
                          }
                          onClick={() => {
                            setCategory(item.name);
                            setSubcategory(sub);
                            setPage(1);
                          }}
                        >
                          {sub}
                        </button>
                      ))}

                    </div>
                  )}

                </div>
              );
            })}

          </div>

          <div className="sidebar-promo">
            <Sprout size={24} />
            <span>KHAMARI PICKS</span>
            <strong>Support your local farmers.</strong>
            <p>
              Discover quality products from farms and
              small businesses around Bangladesh.
            </p>
          </div>

        </aside>

        {/* RIGHT PRODUCTS AREA */}
        <main className="shop-main">

          <div className="shop-main-heading">
            <div>
              <span className="shop-eyebrow">EXPLORE THE MARKET</span>

              <h2>
                {subcategory !== 'All'
                  ? subcategory
                  : category}
              </h2>

              <p>
                Find quality products selected from trusted sellers.
              </p>
            </div>

            <label className="shop-sort">
              <span>Sort by</span>

              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
              >
                <option value="featured">Recommended</option>
                <option value="newest">Newest arrivals</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
            </label>
          </div>

          {/* SEARCH AND PRICE */}
          <div className="shop-filters">

            <label className="shop-search">
              <Search size={19} />

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products, farms or breeds..."
              />

              {q && (
                <button onClick={() => setQ('')}>
                  <X size={16} />
                </button>
              )}
            </label>

            <div className="shop-price-filter">
              <span>৳</span>

              <input
                type="number"
                min="0"
                value={minRaw}
                onChange={(e) => setMinRaw(e.target.value)}
                placeholder="Min price"
              />

              <span>–</span>

              <input
                type="number"
                min="0"
                value={maxRaw}
                onChange={(e) => setMaxRaw(e.target.value)}
                placeholder="Max price"
              />
            </div>

          </div>

          {/* QUICK CATEGORY LINKS */}
          {category === 'All products' && subcategory === 'All' && (
            <div className="shop-quick-categories">
              {departments.slice(0, 6).map((item, departmentIndex) => {
                const Icon = categoryIcons[item.name] || Package;

                return (
                  <button
                    key={`${item.id || item.slug || item.name}-${departmentIndex}`}
                    onClick={() => pickCategory(item.name)}
                  >
                    <Icon size={17} />
                    {item.name}
                    <ChevronRight size={14} />
                  </button>
                );
              })}
            </div>
          )}

          {/* RESULT COUNT */}
          <div className="shop-results-line">
            <span>
              <strong>
                {status === 'loading' ? '...' : meta.total}
              </strong>
              {' '}products found
            </span>

            {filtered && (
              <button onClick={clearFilters}>
                Clear filters <X size={14} />
              </button>
            )}
          </div>

          {/* ERROR */}
          {status === 'error' && (
            <div className="shop-empty">
              <h3>Unable to load products</h3>
              <p>{error}</p>
              <button onClick={() => setRetry(n => n + 1)}>
                Try again
              </button>
            </div>
          )}

          {/* LOADING */}
          {status === 'loading' && (
            <div className="product-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div className="product-skeleton" key={i}>
                  <div />
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          )}

          {/* PRODUCTS */}
          {status !== 'loading' && status !== 'error' && (
            items.length > 0 ? (
              <>
                <div className="product-grid">
                  {items.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAdd={addToCart}
                      onOpen={openProduct}
                    />
                  ))}
                </div>

                <div className="shop-load-more">
                  {page < meta.pages ? (
                    <button
                      disabled={status === 'more'}
                      onClick={() => setPage(n => n + 1)}
                    >
                      {status === 'more'
                        ? 'Loading...'
                        : 'Load more products'}
                    </button>
                  ) : (
                    <span>You've seen all {meta.total} products.</span>
                  )}
                </div>
              </>
            ) : (
              <div className="shop-empty">
                <Search size={32} />
                <h3>No products found</h3>
                <p>
                  Try another category or change your search filters.
                </p>
                <button onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            )
          )}

        </main>
      </div>
    </div>
  );
}
