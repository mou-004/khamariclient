import { RotateCcw } from 'lucide-react';
import { useApi } from '../api.js';

const FLOW = [
  ['Request a refund', 'Open My orders, choose the order and tell us what went wrong. Add photos if the item was damaged, spoiled or wrong.'],
  ['Seller reviews', 'The seller approves or declines within {sellerDays} days. If they don’t answer, Khamari support takes over automatically.'],
  ['Send the item back (if needed)', 'For wrong or not-as-described items the seller asks you to return them. Ship within {shipDays} days and add the tracking number.'],
  ['Refund is paid', 'Once approved (or the return arrives), Khamari support sends your money to the bKash, Nagad or bank account you gave us and you get a notification with the reference.'],
];

// Public "Returns & refund policy" (storefront layout). The time limits come from the server so they always match the rules enforced.
export default function RefundPolicyPage({ navigate, user }) {
  const { data } = useApi('/refunds/policy', { auto: true });
  const fill = (s) => s.replace('{sellerDays}', data?.sellerResponseDays ?? 3).replace('{shipDays}', data?.returnShipDays ?? 7);
  return <div className="cm-wrap">
    <div className="cm-head"><div><h1>Returns &amp; refund policy</h1><p>Shop with confidence. If something isn’t right with your order, here’s exactly how we put it right.</p></div>
      <button className="cm-btn cm-btn-primary" onClick={() => navigate(user ? 'orders' : 'login')}><RotateCcw size={16} /> {user ? 'Request a refund' : 'Sign in to request a refund'}</button></div>
    <div className="rf-policy-grid">
      <div><b>{data?.sellerResponseDays ?? 3} days</b><span>for the seller to respond before Khamari steps in</span></div>
      <div><b>{data?.returnShipDays ?? 7} days</b><span>to ship an approved return back</span></div>
      <div><b>{data?.escalationDays ?? 7} days</b><span>to ask Khamari support to review a declined request</span></div>
      <div><b>100%</b><span>refund when an order you paid for is cancelled</span></div>
    </div>
    <div className="cm-prose">
      <h3>How it works</h3>
      <ol className="rf-flow" style={{ padding: 0 }}>{FLOW.map(([t, d]) => <li key={t}><span><b>{t}</b>{fill(d)}</span></li>)}</ol>

      <h3>When you can ask for a refund</h3>
      <p>Refunds apply to <b>paid</b> orders. Cash-on-delivery orders become refundable once they are delivered and paid. Pick the reason that fits best and make your request within its time limit:</p>
      <div className="cm-panel" style={{ overflowX: 'auto' }}><table className="cm-table"><thead><tr><th>Reason</th><th>Time limit</th><th>Photos</th><th>Send item back?</th></tr></thead>
        <tbody>{(data?.reasons || []).map((r) => <tr key={r.code}><td>{r.label}</td><td>{r.windowDays} days{r.code === 'not_received' ? ' from order' : ' from delivery'}</td><td>{r.evidence ? 'Required' : 'Optional'}</td><td>{r.returnRequired ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div>

      <h3>What you get back</h3>
      <p>You’re refunded the price of the items you return or report (minus your share of any coupon). If you’re refunding the <b>whole order</b> because of a problem on the seller’s side, the delivery fee is refunded too. Refunds for a change of mind don’t include delivery.</p>
      <p>Refunds go to the bKash, Nagad or bank account you give us on the request form. If you paid by bKash or Nagad and your order is cancelled, the full amount is queued for refund automatically.</p>

      <h3>What can’t be returned for a change of mind</h3>
      <p>Fresh produce, dairy, eggs, fish and meat, and live animals can’t be returned just because you changed your mind. They are always covered if they arrive damaged, spoiled or not as described. Report spoiled fresh items within 2 days.</p>

      <h3>Auction purchases</h3>
      <p>Auction bids are binding, so auction items can’t be returned for a change of mind. You are fully covered if the item is damaged, wrong or not as described.</p>

      <h3>If the seller says no</h3>
      <p>You can ask Khamari support to review the decision within {data?.escalationDays ?? 7} days. Our team looks at your photos and messages and makes a final decision. If the seller doesn’t reply in time, the request is escalated for you automatically.</p>

      <h3>How long does it take?</h3>
      <p>After approval (and, where needed, after the seller confirms your return arrived), Khamari support usually sends your refund within 2–3 working days. You’ll get a notification with the payment reference.</p>
    </div>
    <p style={{ marginTop: 28 }}><button className="cm-btn" onClick={() => navigate('support')}>Contact support</button></p>
  </div>;
}