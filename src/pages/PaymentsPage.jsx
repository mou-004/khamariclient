
import { useState } from 'react';
import {
  Wallet, Smartphone, Banknote, ShieldCheck,
  Clock, CheckCircle2, AlertCircle, Copy,
  RefreshCw, ReceiptText, ArrowRight
} from 'lucide-react';

import { api, useApi, dateText } from '../api.js';
import { taka } from '../utils/portal.js';
import {
  PortalShell, Loading, ErrorBox, StatusBadge
} from '../components/PortalUI.jsx';

import '../payments.css';

export default function PaymentsPage({ shell, navigate, notify }) {
  const {
    data,
    loading,
    error,
    reload
  } = useApi('/orders/mine', { poll: 10000 });

  const config = useApi('/payments/config');

  const [references, setReferences] = useState({});
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState('');

  const orders = data?.items || [];
  const accounts = config.data?.accounts || {};

  const paidOrders = orders.filter(
    order => order.paymentMethod !== 'cash' && order.paymentStatus === 'paid'
  );

  const pendingOrders = orders.filter(
    order => order.paymentMethod !== 'cash' && ['pending', 'submitted'].includes(order.paymentStatus)
  );

  const totalPaid = paidOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const totalPending = pendingOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const copyAccount = async method => {
    try {
      await navigator.clipboard.writeText(accounts[method] || '');
      setCopied(method);
      notify('Account number copied.');

      setTimeout(() => setCopied(''), 2000);
    } catch {
      notify('Could not copy account number.');
    }
  };

  const submitPayment = async (event, order) => {
    event.preventDefault();

    const reference = (references[order.id] || '').trim();

    if (!reference) {
      notify('Enter your transaction ID.');
      return;
    }

    try {
      setBusy(order.id);

      const result = await api(
        `/orders/${order.id}/payment`,
        {
          method: 'POST',
          body: { reference }
        }
      );

      notify(result.message || 'Payment submitted successfully.');

      setReferences(previous => ({
        ...previous,
        [order.id]: ''
      }));

      reload();

    } catch (err) {
      notify(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <PortalShell {...shell}>
      <div className="payment-page">

        {/* PAGE HEADER */}
        <section className="payment-hero">
          <div>
            <span className="payment-eyebrow">
              KHAMARI SECURE PAYMENTS
            </span>

            <h1>My Payments</h1>

            <p>
              Manage your order payments, submit transaction references
              and track payment confirmation.
            </p>
          </div>

          <div className="payment-hero-icon">
            <Wallet size={40}/>
            <ShieldCheck size={20}/>
          </div>
        </section>

        {/* PAYMENT SUMMARY */}
        <section className="payment-summary">

          <div className="payment-stat">
            <span className="payment-stat-icon green">
              <CheckCircle2 size={21}/>
            </span>

            <div>
              <small>Total paid</small>
              <strong>{taka(totalPaid)}</strong>
            </div>
          </div>

          <div className="payment-stat">
            <span className="payment-stat-icon orange">
              <Clock size={21}/>
            </span>

            <div>
              <small>Awaiting verification</small>
              <strong>{taka(totalPending)}</strong>
            </div>
          </div>

          <div className="payment-stat">
            <span className="payment-stat-icon blue">
              <ReceiptText size={21}/>
            </span>

            <div>
              <small>Total orders</small>
              <strong>{orders.length}</strong>
            </div>
          </div>

        </section>

        {/* PAYMENT METHODS */}
        <section className="payment-method-section">

          <div className="payment-section-title">
            <div>
              <span className="payment-eyebrow">
                PAYMENT OPTIONS
              </span>
              <h2>Available payment methods</h2>
            </div>
          </div>

          <div className="payment-method-grid">

            <div className="payment-method-card">
              <div className="payment-method-logo">
                <img src="https://cloudhub.bd/assets/frontend/img/bkash.png" alt="bKash logo" onError={e => { e.currentTarget.style.display = 'none'; }}/>
              </div>

              <div>
                <strong>bKash</strong>
                <p>Mobile banking</p>
              </div>

              <span className="method-available">Email OTP available</span>
            </div>

            <div className="payment-method-card">
              <div className="payment-method-logo">
                <img src="https://storelybd.com/payment/nagad-payment-logo.png" alt="Nagad logo" onError={e => { e.currentTarget.style.display = 'none'; }}/>
              </div>

              <div>
                <strong>Nagad</strong>
                <p>Mobile banking</p>
              </div>

              <span className="method-available">Email OTP available</span>
            </div>

            <div className="payment-method-card">
              <div className="payment-method-logo cash">
                <Banknote size={26}/>
              </div>

              <div>
                <strong>Cash on Delivery</strong>
                <p>Pay when your order arrives</p>
              </div>

              <span className="method-available">
                Available
              </span>
            </div>

            <div className="payment-method-card">
              <div className="payment-method-logo">
                <span className="payment-card-brands">
                  <img src="https://cdn.simpleicons.org/visa/1A1F71" alt="Visa"/>
                  <img src="https://cdn.simpleicons.org/mastercard/EB001B" alt="Mastercard"/>
                </span>
              </div>
              <div><strong>Credit / Debit Card</strong><p>Visible as a payment option; checkout is pending integration of a secure card gateway.</p></div>
              <span className="method-unavailable">Gateway setup required</span>
            </div>
          </div>
          <div className="payment-card-notice">
            <div><strong>How payment confirmation works</strong><p>Selecting bKash or Nagad at checkout sends a one-time code to your registered email through SMTP; no merchant account is needed to send that OTP. Email verification does not transfer money or mark an order paid. Actual mobile-wallet settlement still needs the store's payment instructions and administrator verification. Credit/debit card remains listed, but card checkout needs a secure payment gateway.</p></div>
          </div>
        </section>

        {/* SECURITY NOTICE */}
        <section className="payment-instructions">
          <ShieldCheck size={23}/>

          <div>
            <strong>Payment security</strong>

            <p>
              Never share your PIN or OTP. Submit only genuine transaction
              references. bKash and Nagad payments are marked paid only after
              an administrator verifies the transaction against the merchant statement.
            </p>
          </div>
        </section>

        {/* PAYMENT HISTORY */}
        <section className="payment-orders-section">

          <div className="payment-section-title">
            <div>
              <span className="payment-eyebrow">
                TRANSACTION HISTORY
              </span>

              <h2>Your order payments</h2>
            </div>

            <button
              className="payment-refresh"
              onClick={reload}
              disabled={loading}
            >
              <RefreshCw size={15}/>
              Refresh
            </button>
          </div>

          {loading && <Loading/>}

          {error && (
            <ErrorBox
              message={error}
              onRetry={reload}
            />
          )}

          {config.error && (
            <ErrorBox
              message={config.error}
              onRetry={config.reload}
            />
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="payment-empty">
              <CreditCardIcon/>

              <h3>No payment history yet</h3>

              <p>Your order payments will appear here.</p>

              <button onClick={() => navigate('products')}>
                Browse Products
                <ArrowRight size={15}/>
              </button>
            </div>
          )}

          <div className="payment-order-list">

            {orders.map(order => {
              const method = order.paymentMethod;
              const isCash = method === 'cash' || order.paymentStatus === 'not_required';
              const isPaid = !isCash && order.paymentStatus === 'paid';
              const isSubmitted = order.paymentStatus === 'submitted';
              const isRejected = order.paymentStatus === 'rejected';
              const isLegacyDemo = order.paymentDemo === true;

              return (
                <article
                  className="payment-order-card"
                  key={order.id}
                >

                  {/* ORDER HEADER */}
                  <div className="payment-order-header">
                    <div>
                      <span className="payment-order-label">
                        ORDER NUMBER
                      </span>

                      <h3>{order.orderNumber || order.id}</h3>

                      <small>{dateText(order.createdAt)}</small>
                    </div>

                    {isCash ? <span className="portal-badge">Not required</span> : <StatusBadge status={order.paymentStatus}/>}
                  </div>

                  {/* ORDER INFORMATION */}
                  <div className="payment-order-details">

                    <div>
                      <small>Order amount</small>
                      <strong>{taka(order.total)}</strong>
                    </div>

                    <div>
                      <small>Payment method</small>
                      <strong>{method?.toUpperCase()}</strong>
                    </div>

                    <div>
                      <small>Order status</small>
                      <strong>{String(order.status || '').replaceAll('_', ' ').replace(/^./, c => c.toUpperCase())}</strong>
                    </div>

                  </div>

                  <div className="payment-order-content">

                    {isPaid && !isLegacyDemo && (
                      <div className="payment-message success payment-success-confirmed" role="status" aria-live="polite">
                        <CheckCircle2 size={20}/>
                        <span><strong>PAYMENT SUCCESSFUL!</strong> Your payment of {taka(order.total)} for {order.orderNumber || order.id} has been confirmed.</span>
                      </div>
                    )}

                    {isPaid && isLegacyDemo && (
                      <div className="payment-message pending">
                        <AlertCircle size={18}/>
                        This is an older demo order. It was not a real money transfer and is not a confirmed payment.
                      </div>
                    )}

                    {isCash && !isPaid && (
                      <div className="payment-message">
                        <Banknote size={18}/>
                        No payment processing is required for COD. Confirm receipt from Order History after delivery.
                      </div>
                    )}

                    {isSubmitted && (
                      <div className="payment-message pending">
                        <Clock size={18}/>
                        Your transaction is awaiting administrator verification.
                      </div>
                    )}

                    {isRejected && (
                      <div className="payment-message rejected">
                        <AlertCircle size={18}/>
                        Payment reference rejected. Please contact support.
                      </div>
                    )}

                    {order.status === 'cancelled' && (
                      <div className="payment-message rejected">
                        <AlertCircle size={18}/>
                        This order has been cancelled.
                      </div>
                    )}

                    {/* MANUAL TRANSACTION SUBMISSION */}
                    {!isCash &&
                      !isPaid &&
                      !isSubmitted &&
                      order.status !== 'cancelled' &&
                      accounts[method] && (
                      <div className="payment-transfer-box">

                        <h4>Submit transaction reference</h4>
                        <p>
                          Transfer <strong>{taka(order.total)}</strong>
                          {' '}to the following merchant account, then enter the transaction ID below.
                        </p>

                        <div className="payment-account">
                          <div>
                            <small>{method?.toUpperCase()} account</small>
                            <strong>{accounts[method]}</strong>
                          </div>
                          <button type="button" onClick={() => copyAccount(method)}>
                            {copied === method ? <CheckCircle2 size={16}/> : <Copy size={16}/>}
                            {copied === method ? 'Copied' : 'Copy'}
                          </button>
                        </div>

                        <form
                          className="payment-reference-form"
                          onSubmit={event =>
                            submitPayment(event, order)
                          }
                        >
                          <label>
                            Transaction ID / Reference

                            <input
                              required
                              minLength={6}
                              maxLength={60}
                              pattern="[A-Za-z0-9-]{6,60}"
                              placeholder="Enter transaction ID"
                              value={references[order.id] || ''}
                              onChange={event =>
                                setReferences(previous => ({
                                  ...previous,
                                  [order.id]: event.target.value
                                }))
                              }
                            />
                          </label>

                          <button
                            type="submit"
                            disabled={busy === order.id}
                          >
                            {busy === order.id
                              ? 'Submitting...'
                              : 'Submit for verification'
                            }
                          </button>
                        </form>

                      </div>
                    )}

                    {!isCash && !isPaid && !isSubmitted && order.status !== 'cancelled' && !accounts[method] && (
                      <div className="payment-message pending">
                        <AlertCircle size={18}/>
                        Your email OTP is available without merchant credentials, but the store has not provided {String(method || '').toUpperCase()} transfer instructions. Contact customer support before making a transfer.
                      </div>
                    )}

                    {order.paymentReference && (
                      <div className="payment-reference-display">
                        <span>Transaction reference</span>
                        <strong>{order.paymentReference}</strong>
                      </div>
                    )}

                    {!isCash && !isPaid && !isSubmitted && order.status !== 'cancelled' && !accounts[method] && (
                      <div className="payment-message pending" role="status">
                        <AlertCircle size={18}/>
                        Khamari has not configured its {String(method || 'mobile wallet').toUpperCase()} merchant account yet. No transfer has been collected. Please contact the administrator; sellers cannot collect this payment separately.
                      </div>
                    )}

                  </div>
                </article>
              );
            })}

          </div>
        </section>

      </div>
    </PortalShell>
  );
}

function CreditCardIcon() {
  return <ReceiptText size={40}/>;
}
