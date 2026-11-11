import { useState } from 'react';
import { AuthLayout, Loading } from './components/PortalUI.jsx';

import PaymentsPage from './pages/PaymentsPage.jsx';
import MyBidsPage from './pages/MyBidsPage.jsx';
import SellerAuctionsPage from './pages/SellerAuctionsPage.jsx';
import RefundRequestPage from './pages/RefundRequestPage.jsx';
import RefundsPage from './pages/RefundsPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import ProductNewPage from './pages/ProductNewPage.jsx';
import SellerProductsPage from './pages/SellerProductsPage.jsx';
import SellerDiscountsPage from './pages/SellerDiscountsPage.jsx';
import SellerEarningsPage from './pages/SellerEarningsPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import AdminCouponsPage from './pages/AdminCouponsPage.jsx';
import AdminCategoriesPage from './pages/AdminCategoriesPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import AdminProductsPage from './pages/AdminProductsPage.jsx';
import AdminAuctionsPage from './pages/AdminAuctionsPage.jsx';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage.jsx';
import AdminPayoutsPage from './pages/AdminPayoutsPage.jsx';
import AdminReviewsPage from './pages/AdminReviewsPage.jsx';
import AdminSupportPage from './pages/AdminSupportPage.jsx';
import SellerReviewsPage from './pages/SellerReviewsPage.jsx';
import MyReviewsPage from './pages/MyReviewsPage.jsx';
import AdminActivityPage from './pages/AdminActivityPage.jsx';
import AdminAnnouncementsPage from './pages/AdminAnnouncementsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import WishlistPage from './pages/WishlistPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import SupportPage from './pages/SupportPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import SellerDashboardPage from './pages/SellerDashboardPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import RegisterSellerPage from './pages/RegisterSellerPage.jsx';
import RegisterAdminPage from './pages/RegisterAdminPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import PreOrderPage from './pages/PreOrderPage.jsx';

const routeTitle = {
  customer: ['Customer dashboard', 'Keep track of your orders, saved products and bids.'],
  seller: ['Seller dashboard', 'Your store at a glance: sales, orders and stock.'],
  admin: ['Admin dashboard', 'Monitor the marketplace and handle what needs attention.'],
  payments: ['My payments', 'Payment instructions, references and confirmation status.'],
  'seller-products': ['My products', 'Create and manage products, animals and farm supplies.'],
  'seller-discounts': ['Manage discounts', 'Create and manage discounts on your approved products.'],
  'seller-orders': ['Orders & fulfilment', 'Confirm, pack and ship customer orders.'],
  'seller-earnings': ['Earnings & payouts', 'Track what you have earned and request a payout.'],
  'product-new': ['Product', 'Add farm produce, livestock, pets or agricultural supplies.'],
  'admin-products': ['Products', 'Review new products and manage marketplace inventory.'],
  'admin-users': ['Users & approvals', 'Approve sellers and manage accounts.'],
  'admin-categories': ['Departments', 'Maintain the marketplace department tree.'],
  'admin-coupons': ['Coupons & offers', 'Create discount codes that work at checkout.'],
  'admin-analytics': ['Marketplace analytics', 'Revenue, orders, sellers and products across Khamari.'],
  'admin-auctions': ['Auction management', 'Review live lots, bids and deadlines.'],
  'admin-orders': ['All orders', 'Monitor and manage orders across the marketplace.'],
  'admin-payouts': ['Payouts & fees', 'Pay sellers and set marketplace fees.'],
  'admin-reviews': ['Reviews', 'View customer feedback and remove inappropriate reviews.'],
  'admin-support': ['Support inbox', 'Review customer problems and reply to support requests.'],
  'seller-reviews': ['Product reviews', 'Read customer feedback on your products.'],
  'my-reviews': ['My reviews', 'View and update the product reviews you have written.'],
  'admin-activity': ['Activity log', 'What administrators have done recently.'],
  'admin-announcements': ['Announcements', 'Send a message to your customers and sellers.'],
  preorders: ['Pre-order management', 'Review customer orders containing seller-added pre-order products.'],
  'my-preorders': ['My pre-orders', 'Track your seasonal harvest reservations.'],
  orders: ['My orders', 'Track orders and delivery progress.'],
  profile: ['My profile', 'Manage your account and contact details.'],
  wishlist: ['Saved products', 'Products and animals you want to revisit.'],
  'my-bids': ['My bids', 'Auctions you are bidding on, have won or are watching.'],
  'seller-auctions': ['My auctions', 'Live lots, bids, reserves and results.'],
  refunds: ['Refunds & returns', 'Track your refund requests and returns.'],
  'refund-request': ['Request a refund', 'Tell us what went wrong and we will make it right.'],
  'seller-refunds': ['Returns & refunds', 'Respond to refund requests from your customers.'],
  'admin-refunds': ['Refunds & disputes', 'Decide escalated cases and pay out approved refunds.'],
  checkout: ['Checkout', 'Confirm your delivery details and review your order.'],
  notifications: ['Notifications', 'Updates about your orders, approvals and payouts.'],
  support: ['Help & support', 'Find help with orders, products, auctions and your account.'],
};
const sellerOnly = ['seller-reviews', 'seller', 'seller-products', 'seller-discounts', 'seller-orders', 'seller-earnings', 'seller-auctions', 'seller-refunds'];
const needLogin = ['support', 'my-reviews', 'my-preorders', 'my-bids', 'refunds', 'refund-request', 'payments', 'customer', 'orders', 'profile', 'wishlist', 'checkout', 'notifications', 'product-new', ...sellerOnly];

export default function PortalPages({ route, navigate, user, authReady, onLogin, onRegister, onLogout, onUserUpdate, products, categories, onCategoriesChanged, cart, cartTotal, onClearCart, onAddToCart, onNotice }) {
  const [toast, setToast] = useState('');
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 3200); };
  const [title, subtitle] = routeTitle[route] || routeTitle.customer;
  const shell = { user, navigate, onLogout, toast, onDismissToast: () => setToast(''), title: route === 'product-new' ? (window.location.hash.includes('id=') ? 'Edit product' : 'Add a product') : title, subtitle };

  // ---- access control (the server enforces the same rules; this just shows a friendly screen)
  const role = user?.role || '';
  const isAdmin = ['admin', 'superAdmin', 'super-admin'].includes(role);
  const isSeller = role === 'seller' || role === 'seller_pending';
  const adminRoute = route === 'admin' || route === 'admin-support' || route === 'preorders' || (route.startsWith('admin-') && route !== 'admin-pending');
  const blocked = (message, action, label) => <AuthLayout navigate={navigate} heading="Access restricted" subheading={message}><button className="auth-submit" onClick={action}>{label}</button></AuthLayout>;
  if ((adminRoute || needLogin.includes(route)) && !authReady) return <div className="portal-fullpage"><Loading label="Opening your workspace…" /></div>;
  if ((adminRoute || needLogin.includes(route)) && !user) return blocked('Please sign in to continue.', () => navigate('login'), 'Go to sign in');
  if (adminRoute && !isAdmin) return blocked('This area is only for Khamari administrators.', () => navigate(isSeller ? 'seller' : 'customer'), 'Back to my dashboard');
  if (sellerOnly.includes(route) && !isSeller && !isAdmin) return blocked('This area is only for sellers. You can apply from the “Sell on Khamari” page.', () => navigate(isAdmin ? 'admin' : 'customer'), 'Back to my dashboard');
  if (route === 'product-new' && !isSeller && !isAdmin) return blocked('Only sellers can add products.', () => navigate('customer'), 'Back to my dashboard');

  const pageProps = { route, shell, navigate, user, notify, products, categories, cart, cartTotal, onClearCart, onAddToCart, addToCart: onAddToCart, onUserUpdate, onCategoriesChanged,
    onLogin, onRegister, onLogout, toast, setToast, title, subtitle };
  const pages = {
    'admin-pending': <AuthLayout navigate={navigate} heading="Administrator sign in" subheading="Use the configured administrator account. No approval is required."><button className="auth-submit" onClick={() => navigate(isAdmin ? 'admin' : 'login')}>Continue</button></AuthLayout>,
    preorders: <PreOrderPage {...pageProps} />,
    'my-preorders': <PreOrderPage {...pageProps} />,
    payments: <PaymentsPage {...pageProps} />,
    'my-bids': <MyBidsPage {...pageProps} />,
    'seller-auctions': <SellerAuctionsPage {...pageProps} />,
    'refund-request': <RefundRequestPage {...pageProps} />,
    refunds: <RefundsPage {...pageProps} />,
    'seller-refunds': <RefundsPage {...pageProps} />,
    'admin-refunds': <RefundsPage {...pageProps} />,
    checkout: <CheckoutPage {...pageProps} />,
    'product-new': <ProductNewPage {...pageProps} />,
    'seller-products': <SellerProductsPage {...pageProps} />,
    'seller-discounts': <SellerDiscountsPage {...pageProps} />,
    'seller-earnings': <SellerEarningsPage {...pageProps} />,
    orders: <OrdersPage {...pageProps} />,
    'seller-orders': <OrdersPage {...pageProps} />,
    'admin-orders': <OrdersPage {...pageProps} />,
    'admin-coupons': <AdminCouponsPage {...pageProps} />,
    'admin-categories': <AdminCategoriesPage {...pageProps} />,
    'admin-users': <AdminUsersPage {...pageProps} />,
    'admin-products': <AdminProductsPage {...pageProps} />,
    'admin-auctions': <AdminAuctionsPage {...pageProps} />,
    'admin-analytics': <AdminAnalyticsPage {...pageProps} />,
    'admin-payouts': <AdminPayoutsPage {...pageProps} />,
    'admin-reviews': <AdminReviewsPage {...pageProps} />,
    'admin-support': <AdminSupportPage {...pageProps} />,
    'seller-reviews': <SellerReviewsPage {...pageProps} />,
    'my-reviews': <MyReviewsPage {...pageProps} />,
    'admin-activity': <AdminActivityPage {...pageProps} />,
    'admin-announcements': <AdminAnnouncementsPage {...pageProps} />,
    profile: <ProfilePage {...pageProps} />,
    wishlist: <WishlistPage {...pageProps} />,
    notifications: <NotificationsPage {...pageProps} />,
    support: <SupportPage {...pageProps} />,
    customer: <DashboardPage {...pageProps} />,
    seller: <SellerDashboardPage {...pageProps} />,
    admin: <AdminDashboardPage {...pageProps} />,
    login: <LoginPage {...pageProps} />,
    register: <RegisterPage {...pageProps} />,
    'register-seller': <RegisterSellerPage {...pageProps} />,
    'register-admin': <RegisterAdminPage {...pageProps} />,
    'forgot-password': <ForgotPasswordPage {...pageProps} />,
  };
  return pages[route] || <DashboardPage {...pageProps} />;
}