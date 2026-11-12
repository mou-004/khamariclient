
import {
  ArrowRight,
  Bell,
  Check,
  Menu,
  Minus,
  Plus,
  ShoppingBag,
  X,
  LayoutDashboard,
  LogIn
} from 'lucide-react';

import Brand from './Brand.jsx';
import NotificationBell from './NotificationBell.jsx';
import UserMenu from './UserMenu.jsx';
import { taka } from '../utils/money.js';

// Shared header, basket drawer and toast for marketplace pages.
export default function ShopLayout({
  route,
  children,
  currentUser,
  navigate,
  onLogout,
  cart,
  cartCount,
  cartTotal,
  updateQuantity,
  cartOpen,
  setCartOpen,
  mobileMenu,
  setMobileMenu,
  notice,
  setNotice
}) {

  const closeMobileMenu = () => setMobileMenu(false);

  const goTo = (page) => {
    closeMobileMenu();
    navigate(page);
  };

  return (
    <div className="site-shell">

      <header className="main-header">
        <div className="header-inner">

          {/* Mobile hamburger button */}
          <button
            className="mobile-menu-btn icon-btn"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenu}
          >
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Brand />

          {/* Main navigation and mobile menu */}
          <nav className={`main-nav ${mobileMenu ? 'nav-open' : ''}`}>

            <a
              href="#home"
              onClick={closeMobileMenu}
            >
              Home
            </a>

            <a
              className={
                route === 'products' || route === 'product-detail'
                  ? 'nav-active'
                  : ''
              }
              href="#products"
              onClick={closeMobileMenu}
            >
              Products
            </a>

            <a
              className={route === 'preorder' ? 'nav-active' : ''}
              href="#preorder"
              onClick={(e) => {
                e.preventDefault();
                goTo('preorder');
              }}
            >
              Pre-order
            </a>

            <a
              href="#auction"
              onClick={closeMobileMenu}
            >
              Live auction <span className="live-dot" />
            </a>

            <a
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault();
                goTo('how-it-works');
              }}
            >
              How it works
            </a>

            {/* Dashboard for signed-in users */}
            {currentUser && (
              <a
                href="#dashboard"
                onClick={(e) => {
                  e.preventDefault();
                  goTo('dashboard');
                }}
                className="mobile-account-link"
              >
                <LayoutDashboard size={17} />
                Dashboard
              </a>
            )}

            {/* Sign In for visitors */}
            {!currentUser && (
              <a
                href="#login"
                onClick={(e) => {
                  e.preventDefault();
                  goTo('login');
                }}
                className="mobile-account-link"
              >
                <LogIn size={17} />
                Sign In
              </a>
            )}

          </nav>

          {/* Desktop header actions */}
          <div className="header-actions">

            <NotificationBell navigate={navigate} />

            <UserMenu
              user={currentUser}
              navigate={navigate}
              onLogout={onLogout}
            />

            <button
              className="basket-btn"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={18} />
              <span>Basket</span>
              <b>{cartCount}</b>
            </button>

          </div>
        </div>
      </header>

      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-bottom page-container">
          <span>
            © 2026 Khamari. Made for a fresher Bangladesh.
          </span>

          <div>
            <a href="#auction">Live auctions</a>
            <a href="#refund-policy">Returns &amp; refunds</a>
            <a href="#support">Support</a>
          </div>
        </div>
      </footer>

      {/* Notification toast */}
      {notice && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>

          {notice}

          <button
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Basket drawer */}
      {cartOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setCartOpen(false)}
        >
          <aside
            className="cart-drawer"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="drawer-head">
              <div>
                <span className="section-kicker">YOUR ORDER</span>
                <h2>
                  Your basket <span>({cartCount})</span>
                </h2>
              </div>

              <button
                className="icon-btn"
                onClick={() => setCartOpen(false)}
                aria-label="Close basket"
              >
                <X size={20} />
              </button>
            </div>

            {cart.length ? (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.id}>

                      <img
                        src={item.image}
                        alt={item.name}
                      />

                      <div className="cart-item-info">
                        <b>{item.name}</b>
                        <span>{item.unit}</span>
                        <strong>
                          {taka(item.price * item.quantity)}
                        </strong>

                        <div className="quantity-control">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <div>
                    <span>Subtotal</span>
                    <strong>{taka(cartTotal)}</strong>
                  </div>

                  <p>
                    Delivery fees are calculated at checkout.
                  </p>

                  <button
                    className="primary-btn checkout-btn"
                    onClick={() => {
                      setCartOpen(false);
                      navigate('checkout');
                    }}
                  >
                    Continue to checkout
                    <ArrowRight size={16} />
                  </button>

                  <button
                    className="continue-shopping"
                    onClick={() => setCartOpen(false)}
                  >
                    Continue shopping
                  </button>
                </div>
              </>
            ) : (
              <div className="cart-empty">
                <span>
                  <ShoppingBag size={26} />
                </span>

                <h3>Your basket is waiting</h3>
                <p>
                  Add a few fresh finds from the farm shop.
                </p>

                <button
                  className="primary-btn"
                  onClick={() => setCartOpen(false)}
                >
                  Keep browsing
                  <ArrowRight size={15} />
                </button>
              </div>
            )}

          </aside>
        </div>
      )}

    </div>
  );
}
