import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PortalPages from './PortalPages.jsx';
import { observeAccount, logoutAccount, firebaseConfigured } from './firebaseService';
import { resetWishlist } from './wishlist.js';
import { cartStorageKey, readCart, writeCart } from './cartStorage.js';
import HomePage from './pages/HomePage.jsx';
import { uniqueCatalogProducts, uniqueCatalogCategories } from './catalogUtils.js';
import ShopLayout from './components/ShopLayout.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import AuctionPage from './pages/AuctionPage.jsx';
import AuctionDetailPage from './pages/AuctionDetailPage.jsx';
import RefundPolicyPage from './pages/RefundPolicyPage.jsx';
import PreOrderPage from './pages/PreOrderPage.jsx';
import HowItWorksPage from './pages/HowItWorksPage.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const ROUTES = ['login','register','register-seller','register-admin','forgot-password','customer','seller','admin','admin-pending','auction','checkout','payments','orders','profile','wishlist','seller-products','seller-discounts','seller-orders','seller-earnings','product-new','admin-products','admin-users','admin-categories','admin-coupons','admin-analytics','admin-auctions','admin-orders','admin-payouts','admin-reviews','admin-support','seller-reviews','my-reviews','admin-activity','admin-announcements','notifications','support','product-detail','products','auction-detail','my-bids','seller-auctions','refund-request','refunds','seller-refunds','admin-refunds','refund-policy','preorder','my-preorders','preorders','how-it-works'];
const routeFromHash = () => { const key = (window.location.hash || '').replace(/^#\/?/, '').split('?')[0]; return ROUTES.includes(key) ? key : 'home'; };
const isAdminRole = (role) => ['admin', 'superAdmin', 'super-admin'].includes(role);
const homeFor = (user) => (user.role === 'seller' || user.role === 'seller_pending') ? 'seller' : isAdminRole(user.role) ? 'admin' : 'customer';
const ALL = { name: 'All products', icon: 'grid', subcategories: [] };
function App() {
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogState, setCatalogState] = useState('loading'); // loading | ready | error
  const [categoryList, setCategoryList] = useState([ALL]);

  // Products and departments always come from the backend (Firestore). There is no built-in sample data any more.
  const loadCatalog = useCallback(async (signal) => {
    try {
      const response = await fetch(`${API_BASE}/products?limit=200`, { signal });
      if (!response.ok) throw new Error(`Products API returned ${response.status}`);
      const payload = await response.json();
      setCatalogProducts(uniqueCatalogProducts(payload.items || []).map((item) => ({ ...item, price: Number(item.price) || 0, stock: Number(item.stock ?? 0), rating: Number(item.rating) || 0, reviews: Number(item.reviews) || 0, badge: item.badge || '' })));
      setCatalogState('ready');
    } catch (error) {
      if (error.name !== 'AbortError') setCatalogState('error');
    }
  }, []);
  const loadCategories = useCallback(async (signal) => {
    try {
      const response = await fetch(`${API_BASE}/categories`, { signal });
      const payload = await response.json();
      if (response.ok) setCategoryList([ALL, ...uniqueCatalogCategories(payload.items || [])]);
    } catch { /* keep the current list */ }
  }, []);
  useEffect(() => { const c = new AbortController(); loadCatalog(c.signal); loadCategories(c.signal); return () => c.abort(); }, [loadCatalog, loadCategories]);

  const [activeCategory, setActiveCategory] = useState('All products');
  const [activeSubcategory, setActiveSubcategory] = useState('All');
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('featured');
  const [cart, setCart] = useState(() => readCart(cartStorageKey(null)));
  const [cartOwnerKey, setCartOwnerKey] = useState(() => cartStorageKey(null));
  const [cartReady, setCartReady] = useState(false);
  const cartRef = useRef(cart);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState('');
  const [detail, setDetail] = useState(null);
  const [route, setRoute] = useState(routeFromHash);
  const lastRouteRef = useRef(route);
  useEffect(() => {
    const previousRoute = lastRouteRef.current;
    lastRouteRef.current = route;
    if (previousRoute === route || !['home', 'preorder', 'products'].includes(route)) return undefined;
    const controller = new AbortController();
    loadCatalog(controller.signal);
    return () => controller.abort();
  }, [route, loadCatalog]);
  useEffect(() => {
    if (!['home', 'preorder'].includes(route)) return undefined;
    const timer = window.setInterval(() => loadCatalog(), 30000);
    return () => window.clearInterval(timer);
  }, [route, loadCatalog]);

  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) return undefined;
    return observeAccount((account) => {
      setCurrentUser(account);
      if (account) window.localStorage.setItem('khamari-user-session', JSON.stringify(account));
      else window.localStorage.removeItem('khamari-user-session');
      setAuthReady(true);
    });
  }, []);
  useEffect(() => {
    const syncRoute = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  const navigate = (path) => { window.location.hash = path; window.scrollTo({ top: 0, behavior: 'smooth' }); };
  useEffect(() => { if (currentUser && isAdminRole(currentUser.role) && route === 'admin-pending') navigate('admin'); }, [currentUser, route]);
  const handleLogin = (user) => { setCurrentUser(user); window.localStorage.setItem('khamari-user-session', JSON.stringify(user)); navigate(homeFor(user)); };
  const handleRegister = (user) => {
    setCurrentUser(user);
    window.localStorage.setItem('khamari-user-session', JSON.stringify(user));
    // Admin registration is activated immediately by the backend after Admin Code validation.
    window.localStorage.removeItem('khamari-pending-admin');
    navigate(homeFor(user));
  };
  const handleLogout = async () => {
    resetWishlist();
    try {
      await logoutAccount();
    } catch (error) {
      console.error('Firebase sign-out failed:', error);
      setNotice('Sign out could not be completed. Please try again.');
      return;
    }
    // Clear the application session only after Firebase confirms sign-out.
    setCurrentUser(null);
    window.localStorage.removeItem('khamari-user-session');
    navigate('home');
  };
  const handleUserUpdate = (profile) => setCurrentUser((u) => { const next = { ...u, ...profile }; window.localStorage.setItem('khamari-user-session', JSON.stringify(next)); return next; });

  const selectCategory = (category, subcategory = 'All') => { setActiveCategory(category); setActiveSubcategory(subcategory); };

  const filteredProducts = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    let list = catalogProducts.filter((p) => {
      const matchesCategory = activeCategory === 'All products' || p.category === activeCategory;
      const matchesSubcategory = activeSubcategory === 'All' || p.subcategory === activeSubcategory;
      const searchable = [p.name, p.category, p.subcategory, p.farm, p.animalDetails?.breed, p.description].filter(Boolean).join(' ').toLowerCase();
      return matchesCategory && matchesSubcategory && (!searchText || searchable.includes(searchText));
    });
    if (sort === 'price-low') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'price-high') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [catalogProducts, activeCategory, activeSubcategory, query, sort]);

  // On login, logout, account switch or role switch, load only that account's basket.
  useEffect(() => {
    const key = cartStorageKey(currentUser);
    const accountCart = readCart(key);
    cartRef.current = accountCart;
    setCart(accountCart);
    setCartOwnerKey(key);
    setCartReady(true);
  }, [currentUser?.uid, currentUser?.id, currentUser?.email, currentUser?.role]);

  // Persist changes only after the correct account basket has been loaded.
  useEffect(() => {
    cartRef.current = cart;
    if (!cartReady) return;
    writeCart(cartOwnerKey, cart);
  }, [cart, cartOwnerKey, cartReady]);

  // Refresh price and stock of everything in the basket from the backend (on load and whenever the basket is opened).
  const syncCart = useCallback(async () => {
    const lines = cartRef.current;
    if (!lines.length) return;
    try {
      const response = await fetch(`${API_BASE}/cart/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: lines.map((l) => ({ productId: l.id, quantity: l.quantity })) }) });
      if (!response.ok) return;
      const { items } = await response.json();
      if (!Array.isArray(items)) return;
      let changed = false;
      const next = lines.flatMap((line) => {
        const fresh = items.find((i) => i.productId === line.id);
        if (!fresh) return [line];
        if (!fresh.available) { changed = true; return []; }
        if (fresh.price !== line.price || fresh.quantity !== line.quantity) changed = true;
        return [{ ...line, name: fresh.name || line.name, image: fresh.image || line.image, unit: fresh.unit || line.unit, price: fresh.price, stock: fresh.stock, sellerId: fresh.sellerId || line.sellerId, quantity: fresh.quantity }];
      });
      setCart(next);
      if (changed) { setNotice('Your basket was updated with the latest prices and stock.'); window.setTimeout(() => setNotice(''), 3200); }
    } catch { /* offline: keep the basket as it is */ }
  }, []);
  useEffect(() => { syncCart(); }, [syncCart]);
  useEffect(() => { if (cartOpen) syncCart(); }, [cartOpen, syncCart]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const addToCart = (product) => {
    const availableStock = Number(product.stock ?? 0);
    if (!Number.isFinite(availableStock) || availableStock <= 0) { setNotice(`${product.name} is out of stock`); window.setTimeout(() => setNotice(''), 2400); return; }
    setCart((prev) => {
      const found = prev.find((item) => item.id === product.id);
      if (found && found.quantity >= availableStock) return prev;
      return found ? prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...prev, { ...product, quantity: 1 }];
    });
    setNotice(product.listingType === 'preorder' ? `${product.name} reserved in your basket` : `${product.name} added to your basket`);
    window.setTimeout(() => setNotice(''), 2400);
  };
  const updateQuantity = (id, amount) => setCart((prev) => prev.map((item) => item.id === id ? { ...item, quantity: item.quantity + amount } : item).filter((item) => item.quantity > 0));

  const STORE_PAGES = { 'how-it-works': HowItWorksPage, preorder: PreOrderPage, products: ProductsPage, 'product-detail': ProductDetailPage, auction: AuctionPage, 'auction-detail': AuctionDetailPage, 'refund-policy': RefundPolicyPage };
  if (STORE_PAGES[route]) {
    const StorePage = STORE_PAGES[route];
    return <ShopLayout {...{ route, currentUser, navigate, onLogout: handleLogout, cart, cartCount, cartTotal, updateQuantity, cartOpen, setCartOpen, mobileMenu, setMobileMenu, notice, setNotice }}>
      <StorePage categories={categoryList} products={catalogProducts} navigate={navigate} addToCart={addToCart} user={currentUser} notify={setNotice} route={route} />
    </ShopLayout>;
  }

  if (route !== 'home') {
    return <PortalPages
      route={route} navigate={navigate} user={currentUser} authReady={authReady}
      onLogin={handleLogin} onRegister={handleRegister} onLogout={handleLogout} onUserUpdate={handleUserUpdate}
      products={catalogProducts} categories={categoryList} onCategoriesChanged={() => loadCategories()}
      cart={cart} cartTotal={cartTotal} onClearCart={() => { setCart([]); loadCatalog(); }} onAddToCart={addToCart} onNotice={setNotice}
    />;
  }

  if (catalogState === 'loading') return <div className="app-splash"><span className="portal-spinner" /> Loading the marketplace…</div>;
  if (catalogState === 'error') return <div className="app-splash app-splash-error"><h2>We can’t reach the Khamari server</h2><p>Make sure the backend is running (<code>npm start</code> in the project folder), then try again.</p><button className="primary-btn" onClick={() => { setCatalogState('loading'); loadCatalog(); loadCategories(); }}>Try again</button></div>;

  return <HomePage {...{ onLogout: handleLogout, categories: categoryList, activeCategory, activeSubcategory, query, setQuery, showFilters, setShowFilters, sort, setSort, cart, cartOpen, setCartOpen, mobileMenu, setMobileMenu, notice, setNotice, detail, setDetail, currentUser, navigate, selectCategory, filteredProducts, catalogProducts, catalogSource: 'firestore', cartCount, cartTotal, addToCart, updateQuantity }} />;
}

export default App;