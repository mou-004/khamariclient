import { useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '../api.js';
import { PortalShell, PageCard } from '../components/PortalUI.jsx';

export default function ProfilePage({ shell, user, notify, onUserUpdate }) {
  const [busy, setBusy] = useState(false);
  const isStore = ['seller', 'seller_pending', 'admin'].includes(user?.role);
  const save = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try { setBusy(true); const r = await api('/me', { method: 'PATCH', body: f }); onUserUpdate?.(r.profile); notify(r.message); } catch (err) { notify(err.message); } finally { setBusy(false); }
  };
  return <PortalShell {...shell}>
    <PageCard title={isStore ? 'Store & account details' : 'Account details'} subtitle="These details are saved to your Khamari account and used for orders and delivery.">
      <form className="portal-form" onSubmit={save}>
        <div className="portal-form-grid">
          <label>Full name<input name="name" defaultValue={user?.name || ''} required /></label>
          <label>Email<input value={user?.email || ''} disabled /></label>
          <label>Phone number<input name="phone" defaultValue={user?.phone || ''} placeholder="01XXXXXXXXX" /></label>
          <label>District / area<input name="area" defaultValue={user?.area || ''} placeholder="e.g. Savar, Dhaka" /></label>
          {isStore && <label>Store / farm name<input name="storeName" defaultValue={user?.storeName || ''} placeholder="e.g. Green Valley Farm" /></label>}
        </div>
        <label>Address<textarea name="address" defaultValue={user?.address || ''} placeholder="House, road, village or area" /></label>
        {isStore && <>
          <label>About your store<textarea name="bio" defaultValue={user?.bio || ''} placeholder="Tell customers about your farm and products." /></label>
          <label className="profile-contact-sharing">
            <input type="checkbox" name="showContactOnListings" defaultChecked={user?.showContactOnListings === true} />
            <span><b>Show my phone number and business address on my products</b><small>When enabled, buyers can see the phone number, area and address saved above. Leave this off if you prefer to keep those details private.</small></span>
          </label>
        </>}
        <button className="portal-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'} <Check size={16} /></button>
      </form>
    </PageCard>
  </PortalShell>;
}