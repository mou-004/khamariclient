import { useEffect, useRef, useState } from 'react';
import {
  X,
  ChevronRight,
  Banknote,
  Smartphone,
  CreditCard,
  Info,
  CheckCircle2,
  ShieldCheck,
  Mail,
  ShoppingBag,
  MapPin,
  Package,
  Wallet,
  ArrowRight,
  Lock
} from 'lucide-react';

import { api } from '../api.js';
import { taka } from '../utils/portal.js';
import { PortalShell } from '../components/PortalUI.jsx';
import '../payments.css';

const METHODS = [
  {
    id: 'cash',
    name: 'Cash on Delivery',
    description: 'Pay when your order arrives',
    icon: Banknote
  },
  {
    id: 'bkash',
    name: 'bKash',
    description: 'Pay using your bKash account',
    logo: 'https://cloudhub.bd/assets/frontend/img/bkash.png',
    icon: Smartphone
  },
  {
    id: 'nagad',
    name: 'Nagad',
    description: 'Pay using your Nagad account',
    logo: 'https://storelybd.com/payment/nagad-payment-logo.png',
    icon: Smartphone
  },
  {
    id: 'card',
    name: 'Credit / Debit Card',
    description: 'Visa / Mastercard',
    icon: CreditCard,
    gatewayRequired: true
  }
];

export default function CheckoutPage({
  shell,
  navigate,
  user,
  cart = [],
  cartTotal = 0,
  onClearCart,
  notify
}) {
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    area: user?.area || ''
  });

  const [method, setMethod] = useState('cash');
  const [paymentConfig, setPaymentConfig] = useState({});

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpStepStarted, setOtpStepStarted] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [verified, setVerified] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const [deliveryFee, setDeliveryFee] = useState(60);
  const [freeDeliveryOver, setFreeDeliveryOver] = useState(1500);

  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [availableCoupons, setAvailableCoupons] = useState([]);

  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  const processingRef = useRef(false);

  useEffect(() => {
    let active = true;

    api('/payments/config')
      .then(data => {
        if (!active) return;
        setPaymentConfig(data || {});
      })
      .catch(() => {});

    api('/settings/public')
      .then(data => {
        if (!active) return;
        setDeliveryFee(Number(data.deliveryFee ?? 60));
        setFreeDeliveryOver(Number(data.freeDeliveryOver ?? 1500));
      })
      .catch(() => {});

    api('/coupons/available')
      .then(data => {
        if (!active) return;
        setAvailableCoupons(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;

    const timer = setTimeout(() => {
      setSeconds(s => s - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [seconds]);

  const updateField = key => event => {
    setForm(old => ({
      ...old,
      [key]: event.target.value
    }));
  };

  const sellerTotals = Object.values(
    cart.reduce((result, item) => {
      const seller = item.sellerId || 'khamari-store';

      result[seller] =
        (result[seller] || 0) +
        Number(item.price || 0) * Number(item.quantity || 1);

      return result;
    }, {})
  );

  const delivery = sellerTotals.reduce(
    (sum, subtotal) =>
      sum + (subtotal >= freeDeliveryOver ? 0 : deliveryFee),
    0
  );

  const discount = Number(coupon?.discount || coupon?.amount || 0);

  const total = Math.max(0, cartTotal - discount + delivery);

  const selectMethod = id => {
    setCheckoutError('');
    setMethod(id);
    setOtp('');
    setOtpSent(false);
    setOtpStepStarted(false);
    setVerified(false);
    setSeconds(0);
  };

  const sendOtp = async (methodOverride = method) => {
    if (!cart.length) {
      notify('Your cart is empty.');
      return;
    }

    try {
      setCheckoutError('');
      setOtpSending(true);

      const result = await api('/payments/email-otp/send', {
        method: 'POST',
        body: { method: methodOverride }
      });

      setOtpSent(true);
      setOtp('');
      setSeconds(60);

      notify(result.message || 'OTP sent to your registered email.');
    } catch (error) {
      setOtpSent(false);
      setCheckoutError(error.message || 'Unable to send OTP.');
      notify(error.message || 'Unable to send OTP.');
    } finally {
      setOtpSending(false);
    }
  };

  const createOrder = async () => {
    const result = await api('/orders', {
      method: 'POST',
      body: {
        items: cart.map(item => ({
          productId: item.id || item.productId,
          quantity: Math.max(1, Math.floor(Number(item.quantity) || 1))
        })),
        recipient: form,
        paymentMethod: method,
        couponCode: coupon?.code || couponCode || ''
      }
    });

    const order = result.order || result;
    const allOrders = result.orders || [order];

    const combinedTotal = allOrders.reduce(
      (sum, item) => sum + Number(item.total || 0),
      0
    );

    setCompletedOrder({
      ...order,
      total: combinedTotal || Number(order.total || total),
      orderNumber: order.orderNumber || order.id,
      paymentMethod: method,
      paymentStatus: order.paymentStatus || result.paymentStatus || 'pending'
    });

    setSuccess(true);
    onClearCart?.();
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      notify('Enter the correct 6-digit OTP.');
      return;
    }

    if (processingRef.current) return;
    processingRef.current = true;

    try {
      setBusy(true);
      setCheckoutError('');

      await api('/payments/email-otp/verify', {
        method: 'POST',
        body: {
          method,
          code: otp
        }
      });

      notify('Email verified. Saving your order...');
      await createOrder();
      setVerified(true);
    } catch (error) {
      setCheckoutError(error.message || 'Could not save the order. Please retry.');
      notify(error.message || 'Could not save the order. Please retry.');
    } finally {
      processingRef.current = false;
      setBusy(false);
    }
  };

  const placeOrder = async event => {
    event.preventDefault();

    if (method === 'card') {
      notify('Card payments are not available until a secure payment gateway is connected.');
      return;
    }

    if (processingRef.current) return;
    processingRef.current = true;

    try {
      setBusy(true);
      setCheckoutError('');
      if (method === 'bkash' || method === 'nagad') {
        // Send the verification OTP only after the customer confirms the
        // completed delivery details and submits the order form.
        setOtpStepStarted(true);
        await sendOtp(method);
        return;
      }
      await createOrder();
    } catch (error) {
      setCheckoutError(error.message || 'Unable to place order.');
      notify(error.message || 'Unable to place order.');
    } finally {
      processingRef.current = false;
      setBusy(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      notify('Enter a coupon code.');
      return;
    }

    try {
      setBusy(true);

      const result = await api('/coupons/validate', {
        method: 'POST',
        body: {
          code: couponCode.trim(),
          subtotal: cartTotal
        }
      });

      setCoupon(result);
      notify(result.message || 'Coupon applied.');
    } catch (error) {
      setCoupon(null);
      notify(error.message || 'Coupon invalid.');
    } finally {
      setBusy(false);
    }
  };

  if (success && completedOrder) {
    const paymentPaid = completedOrder.paymentStatus === 'paid';
    const paymentPending = method !== 'cash' && !paymentPaid;

    return (
      <PortalShell {...shell}>
        <div className="kh-success-page">
          <div className="kh-success-card">
            <div className="kh-success-top">
              <div className="kh-success-icon">
                <CheckCircle2 size={46} />
              </div>
              <span className="kh-success-label">
                {paymentPaid ? 'PAYMENT CONFIRMED' : 'ORDER PLACED'}
              </span>
              <h1>{paymentPaid ? 'Payment Successful!' : 'Order Placed Successfully!'}</h1>
              <p className="kh-success-description">
                {method === 'cash'
                  ? 'Your order has been placed. Pay the delivery person when your order arrives, then confirm receipt using the OTP sent to your email.'
                  : paymentPaid
                    ? 'Your payment has been confirmed and your order has been placed successfully.'
                    : 'Your email is verified and your order has been placed. Complete the bKash/Nagad transfer and submit its transaction reference in My Payments. Payment will be marked successful after the store verifies the transfer.'}
              </p>
            </div>

            {paymentPaid && (
              <div className="kh-payment-success-banner" role="status" aria-live="polite">
                <CheckCircle2 size={24} />
                <div><strong>PAYMENT SUCCESSFUL!</strong><span>Your payment has been confirmed successfully.</span></div>
              </div>
            )}

            {paymentPending && (
              <div className="kh-payment-success-banner kh-payment-pending-banner" role="status" aria-live="polite">
                <Info size={24} />
                <div><strong>ORDER PLACED — PAYMENT PENDING</strong><span>Email OTP verified. Submit your real transaction reference from My Payments after transferring the amount.</span></div>
              </div>
            )}

            <div className="kh-success-highlight">
              <div className="kh-success-highlight-row">
                <span>Order Total</span>
                <strong>{taka(completedOrder.total || 0)}</strong>
              </div>
              <div className="kh-success-badge">
                {method === 'cash' ? 'COD · NO ONLINE PAYMENT' : paymentPaid ? 'PAID' : 'PAYMENT PENDING'}
              </div>
            </div>

            <div className="kh-success-details">
              <div className="kh-detail-row">
                <span>Order Number</span>
                <strong>{completedOrder.orderNumber || completedOrder.id || 'N/A'}</strong>
              </div>
              <div className="kh-detail-row">
                <span>Payment Method</span>
                <strong>{String(completedOrder.paymentMethod || method).toUpperCase()}</strong>
              </div>
              <div className="kh-detail-row">
                <span>Payment Status</span>
                <strong className={paymentPaid ? 'kh-green-text' : ''}>
                  {method === 'cash' ? 'Not applicable · Cash on Delivery' : paymentPaid ? 'Paid' : 'Awaiting verification'}
                </strong>
              </div>
              <div className="kh-detail-row">
                <span>Order Status</span>
                <strong className="kh-green-text">Order Placed</strong>
              </div>
            </div>

            <div className="kh-success-message">
              <CheckCircle2 size={20} />
              <p>Your order is confirmed. You can track its progress from My Orders.</p>
            </div>

            <div className="kh-success-actions">
              {paymentPending && (
                <button type="button" className="kh-success-primary" onClick={() => navigate('payments')}>
                  <Wallet size={18} />
                  Complete Payment
                  <ArrowRight size={18} />
                </button>
              )}
              <button
                type="button"
                className={paymentPending ? 'kh-success-secondary' : 'kh-success-primary'}
                onClick={() => navigate('orders')}
              >
                <Package size={18} />
                View My Orders
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                className="kh-success-secondary"
                onClick={() => navigate('products')}
              >
                Continue Shopping
              </button>
            </div>

            <div className="kh-success-footer">
              <ShoppingBag size={16} />
              <span>Khamari — Fresh from the farm</span>
            </div>
          </div>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell {...shell}>
      <div className="kh-payment">
        <header className="kh-payment-header">
          <button
            type="button"
            onClick={() => navigate('products')}
            aria-label="Close checkout"
          >
            <X size={23} />
          </button>

          <h1>Checkout</h1>
          <ShoppingBag size={22} />
        </header>

        <div className="kh-payment-banner">
          <Info size={19} />
          <span>
            Complete your delivery details, choose a payment method, and click Confirm Order. For bKash/Nagad, an email OTP will be sent only after you confirm the order details. Card payments need a connected gateway.
          </span>
        </div>

        <form onSubmit={placeOrder}>
          <section className="kh-payment-section">
            <h3>
              <MapPin size={18} />
              Delivery Information
            </h3>

            <div className="kh-payment-fields">
              <input
                required
                placeholder="Recipient name"
                value={form.name}
                onChange={updateField('name')}
              />

              <input
                required
                type="tel"
                placeholder="Phone number"
                value={form.phone}
                onChange={updateField('phone')}
              />

              <textarea
                required
                placeholder="Full delivery address"
                value={form.address}
                onChange={updateField('address')}
              />

              <input
                placeholder="District / Area"
                value={form.area}
                onChange={updateField('area')}
              />
            </div>
          </section>

          <section className="kh-payment-section">
            <h3>Recommended method(s)</h3>

            {METHODS.filter(item => item.id === 'cash').map(item => {
              const Icon = item.icon;

              return (
                <button
                  type="button"
                  key={item.id}
                  className={`kh-payment-option ${method === item.id ? 'chosen' : ''}`}
                  onClick={() => selectMethod(item.id)}
                >
                  <Icon size={30} />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </span>
                  <ChevronRight />
                </button>
              );
            })}
          </section>

          <section className="kh-payment-section">
            <h3>Other Payment Methods</h3>
            <p className="kh-otp-help">Choose bKash or Nagad, complete your phone number and delivery address, then click Confirm Order. Your email verification code will be sent at that point.</p>

            {METHODS.filter(item => item.id !== 'cash').map(item => {
              const Icon = item.icon;
              const configured = item.id === 'card'
                ? Boolean(paymentConfig.cardGatewayConfigured)
                : true;

              return (
                <button
                  type="button"
                  key={item.id}
                  className={`kh-payment-option ${method === item.id ? 'chosen' : ''}`}
                  onClick={() => selectMethod(item.id)}
                  disabled={!configured}
                >
                  {item.logo
                    ? <img className="kh-payment-brand-logo" src={item.logo} alt={`${item.name} logo`} onError={e => { e.currentTarget.style.display = 'none'; }} />
                    : <Icon size={30} />}
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.id === 'card' ? item.description : `${item.description} · OTP after order confirmation`}</small>
                  </span>
                  <ChevronRight />
                </button>
              );
            })}
          </section>

          {['bkash', 'nagad'].includes(method) && (paymentConfig.accounts?.[method] || paymentConfig.instructions) && (
            <div className="kh-payment-banner" role="status">
              <Info size={18}/>
              <span>
                {paymentConfig.accounts?.[method] && (
                  <>After order placement, transfer the order amount to Khamari's {method.toUpperCase()} merchant account <strong>{paymentConfig.accounts[method]}</strong>. Then open My Payments and submit the transaction reference. Khamari admin verifies the transfer; the seller does not collect customer payments.</>
                )}
                {paymentConfig.accounts?.[method] && paymentConfig.instructions ? ' ' : ''}
                {paymentConfig.instructions ? paymentConfig.instructions : ''}
              </span>
            </div>
          )}

          {checkoutError && <div className="kh-checkout-error" role="alert"><Info size={18} /><span>{checkoutError}</span></div>}

          {['bkash', 'nagad'].includes(method) && otpStepStarted && (
            <section className="kh-payment-section kh-otp-section">
              <div className="kh-otp-heading">
                <div className="kh-otp-icon">
                  <Mail size={24} />
                </div>

                <div>
                  <h3>Email verification</h3>
                  <p>We will send a one-time code to your registered email. This verifies your email; it does not transfer money.</p>
                </div>
              </div>

              {!verified ? (
                <>
                  {!otpSent ? (
                    <div className="kh-otp-content">
                      <p className="kh-otp-help">
                        {otpSending
                          ? 'Sending your verification code to your registered email...'
                          : 'Your order details have been submitted. Request an email OTP below to continue. If you have already requested one, you can resend it after the countdown.'}
                      </p>
                      <button
                        type="button"
                        className="kh-payment-primary"
                        onClick={() => sendOtp(method)}
                        disabled={otpSending}
                      >
                        <Mail size={18} />
                        {otpSending ? 'Sending OTP...' : 'Send OTP to Email'}
                      </button>
                    </div>
                  ) : (
                    <div className="kh-otp-content">
                      <p className="kh-otp-help">
                        Enter the six-digit verification code sent to your registered email.
                      </p>
                      <input
                        className="kh-otp-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={event =>
                          setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                      />

                      <button
                        type="button"
                        className="kh-payment-primary"
                        onClick={verifyOtp}
                        disabled={busy || otp.length !== 6}
                      >
                        <ShieldCheck size={18} />
                        {busy ? 'Verifying & Placing Order...' : 'Verify OTP & Place Order'}
                      </button>

                      <button
                        type="button"
                        className="kh-resend"
                        onClick={() => sendOtp(method)}
                        disabled={otpSending || busy || seconds > 0}
                      >
                        {seconds > 0 ? `Resend OTP in ${seconds}s` : 'Resend OTP'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="kh-verified">
                  <CheckCircle2 size={22} />
                  <div>
                    <strong>Email verified successfully!</strong>
                    <p>Your order is being processed.</p>
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="kh-payment-section">
            <h3>Promo Code</h3>

            <div className="kh-coupon">
              <input
                value={couponCode}
                onChange={event => setCouponCode(event.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                disabled={Boolean(coupon)}
              />

              <button
                type="button"
                onClick={applyCoupon}
                disabled={busy || Boolean(coupon)}
              >
                {coupon ? 'Applied' : 'Apply'}
              </button>
            </div>
            {coupon && (
              <p className="kh-coupon-applied" role="status">
                <CheckCircle2 size={16} /> {coupon.code} applied — {coupon.percent}% off ({taka(coupon.discount)} saved).
              </p>
            )}
            {availableCoupons.length > 0 && (
              <div className="kh-available-coupons">
                <strong>Available promo codes</strong>
                <p>Admin offers you can use on this order:</p>
                <div className="kh-available-coupon-list">
                  {availableCoupons.map((offer) => (
                    <article key={offer.code} className="kh-available-coupon">
                      <div>
                        <b>{offer.code}</b>
                        <strong>{offer.discount}% OFF</strong>
                        <small>{Number(offer.minOrder) > 0 ? `Minimum order ${taka(offer.minOrder)}` : 'No minimum order'}{offer.expiresAt ? ` · Expires ${new Date(offer.expiresAt).toLocaleDateString()}` : ''}</small>
                      </div>
                      <button type="button" onClick={() => setCouponCode(offer.code)} disabled={Boolean(coupon)}>
                        Use code
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="kh-payment-bottom">
            <div>
              <span>Subtotal</span>
              <strong>{taka(cartTotal)}</strong>
            </div>

            {discount > 0 && (
              <div>
                <span>Discount</span>
                <strong>−{taka(discount)}</strong>
              </div>
            )}

            <div>
              <span>Delivery charge</span>
              <strong>{taka(delivery)}</strong>
            </div>

            <div className="kh-payment-grand">
              <span>Total Amount</span>
              <strong>{taka(total)}</strong>
            </div>

            {method !== 'card' && !(['bkash', 'nagad'].includes(method) && otpStepStarted) && (
              <button
                type="submit"
                className="kh-payment-primary"
                disabled={busy || !cart.length}
              >
                {busy ? ((method === 'bkash' || method === 'nagad') ? 'Sending OTP...' : 'Processing Order...') : 'Confirm Order'}
                <ChevronRight size={19} />
              </button>
            )}

            <div className="kh-checkout-security">
              <Lock size={15} />
              <span>Secure checkout · Your order information is protected.</span>
            </div>
          </section>
        </form>
      </div>
    </PortalShell>
  );
}