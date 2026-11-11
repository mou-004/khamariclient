import { useApi, dateTimeText } from '../api.js';
import { PortalShell, PageCard, Loading, ErrorBox, EmptyState } from '../components/PortalUI.jsx';
import { History } from 'lucide-react';

const LABELS = { 'user.approve-seller': 'Approved a seller', 'user.reject-seller': 'Declined a seller', 'user.suspend': 'Suspended an account', 'user.activate': 'Restored an account', 'user.approve-admin': 'Approved an admin', 'user.reject-admin': 'Declined an admin application', 'user.remove-admin': 'Removed admin access',
  'product.active': 'Approved a product', 'product.rejected': 'Rejected a product', 'product.paused': 'Hid a product', 'product.pending': 'Moved a product to review', 'product.import': 'Imported sample products', 'category.create': 'Added a category', 'category.update': 'Edited a category', 'category.delete': 'Deleted a category',
  'coupon.create': 'Created a coupon', 'coupon.active': 'Enabled a coupon', 'coupon.disabled': 'Disabled a coupon', 'coupon.delete': 'Deleted a coupon', 'payout.paid': 'Paid a seller', 'payout.rejected': 'Declined a payout', 'settings.update': 'Changed platform settings', 'auction.cancel': 'Cancelled an auction', 'review.delete': 'Deleted a review',
  'product.stock-update': 'Updated product stock',
  'order.accepted': 'Accepted an order',
  'order.preparing': 'Started preparing an order',
  'order.out_for_delivery': 'Dispatched an order',
  'order.delivered': 'Marked an order delivered',
  'order.received': 'Confirmed order receipt',
  'order.cancelled': 'Cancelled an order',
  'payment.cod-receipt-confirmed': 'Confirmed COD payment by OTP' };

export default function AdminActivityPage({ shell }) {
  const { data, loading, error, reload } = useApi('/admin/activity');
  return <PortalShell {...shell}>
    {loading && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
    {data && <PageCard title="Activity log" subtitle="The latest 200 recorded actions by administrators, sellers and customers">
      {data.items.length ? <div className="activity-list">{data.items.map((l) => <div key={l.id}><b>{LABELS[l.action] || l.action}</b><span>{l.target}{l.detail && <small>{l.detail}</small>}</span><em>{l.adminName} · {dateTimeText(l.createdAt)}</em></div>)}</div> : <EmptyState icon={History} title="No activity yet" text="Product stock changes, order status updates, payment confirmations, approvals, payouts and other important actions are recorded here." />}
    </PageCard>}
  </PortalShell>;
}