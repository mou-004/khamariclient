import { useState } from 'react';
import NotificationBell from '../components/NotificationBell.jsx';
import UserMenu from '../components/UserMenu.jsx';
import { ArrowDownRight, ArrowRight, BadgeCheck, Bell, Check, ChevronDown, Clock3, Heart, Menu, Minus, Plus, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Star, Truck, X, Sprout, CircleHelp } from "lucide-react";
import { categories as defaultCategories } from '../data';
import { taka } from '../utils/money.js';
import Brand from '../components/Brand.jsx';
import ProductCard from '../components/ProductCard.jsx';
import FeaturedAuctionPanel from '../components/FeaturedAuctionPanel.jsx';

export default function HomePage({ onLogout, categories = defaultCategories, activeCategory, activeSubcategory, query, setQuery, showFilters, setShowFilters, sort, setSort, cart, cartOpen, setCartOpen, mobileMenu, setMobileMenu, notice, setNotice, detail, setDetail, currentUser, navigate, selectCategory, filteredProducts, catalogProducts, catalogSource, cartCount, cartTotal, addToCart, updateQuantity }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true); // comes back on every page load
  const [expandedDepartments, setExpandedDepartments] = useState({});
  const today = new Date().toISOString().slice(0, 10);
  const featuredPreorder = catalogProducts.find(product => product.listingType === 'preorder' && product.status === 'active' && (!product.preOrderDetails?.preorderDeadline || product.preOrderDetails.preorderDeadline >= today));
  const toggleDepartment = (name) => setExpandedDepartments(old => ({...old, [name]: !(old[name] ?? (activeCategory === name))}));
  return <div className="site-shell" id="home">
    {showAnnouncement && <div className="announcement"><span><Truck size={14} /> Farm-fresh delivery across selected areas</span><div className="announcement-end"><span className="announcement-right">A better way to buy local</span><button type="button" className="announcement-close" aria-label="Dismiss announcement" onClick={() => setShowAnnouncement(false)}><X size={14} /></button></div></div>}
    <header className="main-header">
      <div className="header-inner">
        <button className="mobile-menu-btn icon-btn" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu"><Menu size={22} /></button>
        <Brand />
        <nav className={`main-nav ${mobileMenu ? 'nav-open' : ''}`}>
          <a className="nav-active" href="#shop" onClick={() => setMobileMenu(false)}>Shop</a><a href="#products" onClick={() => setMobileMenu(false)}>Products</a><a href="#preorder" onClick={(e) => { e.preventDefault(); setMobileMenu(false); navigate('preorder'); }}>Pre-order</a><a href="#how-it-works" onClick={(e) => { e.preventDefault(); setMobileMenu(false); navigate('how-it-works'); }}>How it works</a><a href="#auction" onClick={() => setMobileMenu(false)}>Live auction <span className="live-dot" /></a>
        </nav>
        <div className="header-actions"><NotificationBell navigate={navigate} /><UserMenu user={currentUser} navigate={navigate} onLogout={onLogout} /><button className="basket-btn" onClick={() => setCartOpen(true)}><ShoppingBag size={18} /><span>Basket</span><b>{cartCount}</b></button></div>
      </div>
    </header>

    <main>
      <section className="hero-section page-container">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-icon"><Sprout size={15} /></span> A fresher way to shop local</div>
          <h1>Good food starts<br />with <em>good roots.</em></h1>
          <p className="hero-description">Meet the people who grow your food. Shop honest, seasonal produce from trusted local farms — delivered fresh to your door.</p>
          <div className="hero-actions"><a href="#shop" className="primary-btn explore-products-btn">Explore products <ArrowRight size={17} /></a><a href="#how-it-works" className="text-link" onClick={(e) => { e.preventDefault(); navigate('how-it-works'); }}>How Khamari works <ArrowDownRight size={16} /></a></div>
          <div className="hero-trust"><div className="avatar-stack"><span>F</span><span>R</span><span>A</span><span>+</span></div><div><div className="trust-stars"><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><b>4.9/5</b></div><p>Loved by local households</p></div></div>
        </div>
        <div className="hero-visual">
          <div className="hero-image-main"><img src="https://images.unsplash.com/photo-1558289282-647de9fdf608?auto=format&fit=crop&w=1600&q=90" alt="Farmer working in a green paddy field" /><div className="image-shade" /></div>
          <div className="hero-floating-card"><div className="floating-icon"><BadgeCheck size={19} /></div><div><strong>Picked with care</strong><span>From farms we trust</span></div><Check size={17} className="floating-check" /></div>
        </div>
      </section>

      <section className="benefits-strip page-container" id="how-it-works">
        <div className="benefit"><span className="benefit-icon"><Sprout size={20} /></span><div><b>From local farms</b><span>Know where it grows</span></div></div>
        <div className="benefit"><span className="benefit-icon"><ShieldCheck size={20} /></span><div><b>Quality you can trust</b><span>Carefully selected produce</span></div></div>
        <div className="benefit"><span className="benefit-icon"><Truck size={20} /></span><div><b>Fresh at your door</b><span>Reliable delivery updates</span></div></div>
        <div className="benefit"><span className="benefit-icon"><Heart size={20} /></span><div><b>Support local growers</b><span>Fairer farm-to-home trade</span></div></div>
      </section>

      <section className="shop-section page-container" id="shop">
        <div className="section-heading marketplace-section-heading"><div><div className="section-kicker">THE KHAMARI MARKETPLACE</div><h2 className="marketplace-title">Products for every <em>farm & home.</em></h2><p>Browse fresh produce, farm animals, pets, animal feed and farming supplies from local sellers.</p></div><a className="view-all-link" href="#shop" onClick={() => { selectCategory('All products', 'All'); setQuery(''); }}>View all products <ArrowRight size={16} /></a></div>
        <div className="shop-toolbar marketplace-toolbar">
          <label className="search-box marketplace-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search vegetables, cows, cats, feed..." aria-label="Search products, animals and farm supplies" />{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}</label>
          <label className="sort-label"><span>Sort:</span><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="rating">Top rated</option></select></label>
        </div>
        <button className="category-drawer-trigger" type="button" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={18}/> Browse departments <ChevronDown size={16}/></button>
        <div className="marketplace-catalog-layout">
          <aside className={`category-sidebar ${sidebarOpen ? 'sidebar-mobile-open' : ''}`} aria-label="Product departments">
            <div className="category-sidebar-heading"><span>Shop by category</span><small>Browse products and subcategories</small></div>
            {categories.map((cat, categoryIndex) => {
              const active = activeCategory === cat.name;
              const expanded = expandedDepartments[cat.name] ?? active;
              const count = cat.name === 'All products' ? catalogProducts.length : catalogProducts.filter(product => product.category === cat.name).length;
              return <div className="category-group" key={`${cat.id || cat.name}-${categoryIndex}`}>
                <div className={`category-side-link ${active ? 'active' : ''}`}>
                  <button type="button" className="category-name-button" onClick={() => {selectCategory(cat.name); setSidebarOpen(false);}}>{cat.name}<span className="category-item-count">{count}</span></button>
                  {cat.subcategories?.length > 0 && <button className="category-expand" type="button" aria-label={`Toggle ${cat.name} subcategories`} aria-expanded={expanded} onClick={() => toggleDepartment(cat.name)}><ChevronDown size={16} className={expanded ? 'expanded-arrow' : ''}/></button>}
                </div>
                {expanded && cat.subcategories?.length > 0 && <div className="category-sub-list">{cat.subcategories.map(sub => <button key={sub} type="button" className={active && activeSubcategory === sub ? 'selected' : ''} onClick={() => {selectCategory(cat.name, sub); setSidebarOpen(false);}}>{sub}<span>{catalogProducts.filter(product => product.category === cat.name && product.subcategory === sub).length}</span></button>)}</div>}
              </div>;
            })}
            <div className="sidebar-seller-note"><b>Have products to sell?</b><small>List your farm products and manage your inventory from the seller dashboard.</small><button type="button" onClick={() => navigate(currentUser ? 'seller-products' : 'register-seller')}>Start selling <ArrowRight size={14}/></button></div>
          </aside>
          <div className="marketplace-catalog">
            <div className="catalog-title-row"><div><span className="catalog-eyebrow">{activeCategory === 'All products' ? 'ALL DEPARTMENTS' : activeCategory.toUpperCase()}</span><h3>{activeSubcategory !== 'All' ? activeSubcategory : activeCategory === 'All products' ? 'Explore all products' : activeCategory}</h3><p>Compare options from local farms and verified sellers.</p></div><span className="catalog-count"><b>{filteredProducts.length}</b> products</span></div>
            {activeCategory !== 'All products' && categories.find((cat) => cat.name === activeCategory)?.subcategories?.length > 0 && <div className="subcategory-chips"><button className={activeSubcategory === 'All' ? 'active' : ''} onClick={() => selectCategory(activeCategory, 'All')}>All {activeCategory}</button>{categories.find((cat) => cat.name === activeCategory).subcategories.map((sub) => <button key={sub} className={activeSubcategory === sub ? 'active' : ''} onClick={() => selectCategory(activeCategory, sub)}>{sub}</button>)}</div>}
            <div className="results-line"><span><b>{filteredProducts.length}</b> products</span><span className="stock-note"><span className="stock-dot" /> Local sellers · Bangladesh</span></div>
            {filteredProducts.length ? <div className="product-grid">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} onOpen={(p) => navigate(`product-detail?id=${encodeURIComponent(p.id)}`)} />)}</div> : <div className="empty-state"><Search size={26} /><h3>No products found</h3><p>Try a different search or subcategory.</p><button className="primary-btn" onClick={() => { setQuery(''); selectCategory('All products', 'All'); }}>Clear filters</button></div>}
            <div className="shop-bottom"><span>Showing {filteredProducts.length} of {catalogProducts.length} products</span><span>More farm and pet products are added regularly <ArrowRight size={14} /></span></div>
          </div>
        </div>
      </section>
      <section className="feature-panels page-container">
        <FeaturedAuctionPanel navigate={navigate} />
        <article className="preorder-panel" id="preorder">
          {featuredPreorder ? <>
            <div className="preorder-image"><img src={featuredPreorder.image || featuredPreorder.images?.[0] || ''} alt={featuredPreorder.name}/><span className="preorder-badge"><Clock3 size={13}/> PRE-ORDER AVAILABLE</span></div>
            <div className="preorder-copy"><div className="section-kicker">PLAN AHEAD, EAT FRESH</div><h2>Reserve your<br/><em>next harvest.</em></h2><p>{featuredPreorder.description || 'Reserve this seller-listed product before its expected availability date.'}</p><div className="harvest-date"><span className="date-icon"><Sprout size={17}/></span><span><b>{featuredPreorder.preOrderDetails?.harvestDate || 'Availability date set by seller'}</b><small>{featuredPreorder.farm || featuredPreorder.sellerName || 'Local seller'}</small></span></div><div className="preorder-bottom"><div><strong>{taka(featuredPreorder.price)}</strong><span> / {featuredPreorder.unit}</span></div><button className="primary-btn" onClick={() => navigate(`product-detail?id=${encodeURIComponent(featuredPreorder.id)}`)}>View pre-order <ArrowRight size={15}/></button></div><button className="text-link preorder-view-all" onClick={() => navigate('preorder')}>Browse all available pre-orders <ArrowRight size={14}/></button></div>
          </> : <div className="preorder-copy preorder-empty"><div className="section-kicker">PLAN AHEAD, EAT FRESH</div><h2>Reserve your<br/><em>next harvest.</em></h2><p>There are no active seller-listed pre-orders at the moment. Check back when farmers publish their upcoming harvests.</p><button className="primary-btn" onClick={() => navigate('preorder')}>Explore pre-orders <ArrowRight size={15}/></button></div>}
        </article>
      </section>

      <section className="grower-cta page-container"><div className="grower-icon"><Sprout size={26} /></div><div><div className="section-kicker">GROW WITH KHAMARI</div><h2>Are you a farmer or local producer?</h2><p>Bring your harvest to more homes. Join a marketplace built to help local growers thrive.</p></div><button className="outline-btn" onClick={() => navigate('register-seller')}>Become a seller <ArrowRight size={16} /></button></section>
    </main>

    <footer className="site-footer"><div className="footer-main page-container"><div className="footer-brand-col"><Brand /><p>Good food, fair connections, stronger local farms. From our growers to your table.</p><div className="footer-socials"><a href="#home" aria-label="Facebook">f</a><a href="#home" aria-label="Instagram">ig</a><a href="#home" aria-label="YouTube">▶</a></div></div><div className="footer-col"><b>Explore</b><a href="#shop">Shop products</a><a href="#preorder" onClick={(e) => { e.preventDefault(); navigate("preorder"); }}>Pre-order harvests</a><a href="#auction">Live auctions</a><a href="#how-it-works" onClick={(e) => { e.preventDefault(); navigate('how-it-works'); }}>How it works</a></div><div className="footer-col"><b>Help & support</b><a href="#home">Delivery information</a><a href="#refund-policy">Returns & refunds</a><a href="#support">Contact support</a><a href="#home">Frequently asked questions</a></div><div className="footer-newsletter"><b>Get the good stuff.</b><p>Seasonal picks, farm stories, and member-only offers.</p><form onSubmit={(e) => { e.preventDefault(); setNotice('Thanks for your interest! Newsletter signup will be connected soon.'); }}><input type="email" placeholder="Your email address" required aria-label="Email address" /><button type="submit" aria-label="Subscribe"><ArrowRight size={17} /></button></form><small>No spam. Just fresh updates.</small></div></div><div className="footer-bottom page-container"><span>© 2026 Khamari. Made for a fresher Bangladesh.</span><div><a href="#home">Privacy</a><a href="#home">Terms</a><span>বাংলা / English <ChevronDown size={12} /></span></div></div></footer>

    {notice && <div className="toast" role="status"><span><Check size={16} /></span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={15} /></button></div>}

    {cartOpen && <div className="drawer-backdrop" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={(e) => e.stopPropagation()}><div className="drawer-head"><div><span className="section-kicker">YOUR ORDER</span><h2>Your basket <span>({cartCount})</span></h2></div><button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Close basket"><X size={20} /></button></div>{cart.length ? <><div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><img src={item.image} alt={item.name} /><div className="cart-item-info"><b>{item.name}</b><span>{item.unit}</span><strong>{taka(item.price * item.quantity)}</strong><div className="quantity-control"><button onClick={() => updateQuantity(item.id, -1)} aria-label="Decrease quantity"><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} aria-label="Increase quantity"><Plus size={13} /></button></div></div></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><strong>{taka(cartTotal)}</strong></div><p>Delivery fees are calculated at checkout.</p><button className="primary-btn checkout-btn" onClick={() => navigate('checkout')}>Continue to checkout <ArrowRight size={16} /></button><button className="continue-shopping" onClick={() => setCartOpen(false)}>Continue shopping</button></div></> : <div className="cart-empty"><span><ShoppingBag size={26} /></span><h3>Your basket is waiting</h3><p>Add a few fresh finds from the farm shop.</p><button className="primary-btn" onClick={() => { setCartOpen(false); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }}>Explore products <ArrowRight size={15} /></button></div>}</aside></div>}

    {detail && <div className="drawer-backdrop detail-backdrop" onClick={() => setDetail(null)}><section className="product-detail-modal" onClick={(e) => e.stopPropagation()}><button className="detail-close icon-btn" onClick={() => setDetail(null)} aria-label="Close product details"><X size={20} /></button><div className="detail-image"><img src={detail.image} alt={detail.name} /><span className="detail-category-tag">{detail.subcategory || detail.category}</span></div><div className="detail-copy"><div className="section-kicker">{(detail.subcategory || detail.category).toUpperCase()}</div><h2>{detail.name}</h2><div className="detail-rating"><Star size={15} fill="currentColor" /> <b>{detail.rating}</b> <span>({detail.reviews} reviews)</span></div><p>{detail.description}</p>{detail.animalDetails && <div className="animal-detail-grid"><div><span>Breed</span><b>{detail.animalDetails.breed}</b></div><div><span>Age</span><b>{detail.animalDetails.age}</b></div><div><span>Sex</span><b>{detail.animalDetails.sex}</b></div><div><span>Health</span><b>{detail.animalDetails.health}</b></div><div className="animal-vaccine"><span>Vaccination / care</span><b>{detail.animalDetails.vaccination}</b></div></div>}<div className="detail-farm"><Sprout size={17} /><span><b>From</b><small>{detail.farm}</small></span></div><div className="detail-price"><strong>{taka(detail.price)}</strong><span> / {detail.unit}</span>{detail.oldPrice && <del>{taka(detail.oldPrice)}</del>}</div><button className="primary-btn detail-add" onClick={() => { addToCart(detail); setDetail(null); }}>{detail.listingType === 'animal' ? 'Add to basket' : 'Add to basket'} <ShoppingBag size={17} /></button>{detail.listingType === 'animal' && <div className="animal-care-note">Animal products should be verified in person. Confirm health records, transport and responsible care arrangements with the seller.</div>}<div className="detail-assurance"><ShieldCheck size={15} /> Seller information shown · Local marketplace</div></div></section></div>}

    <button className="help-fab" aria-label="Help and support" onClick={() => setNotice('Need help? Support chat can be connected here.')}><CircleHelp size={21} /></button>
  </div>;
}