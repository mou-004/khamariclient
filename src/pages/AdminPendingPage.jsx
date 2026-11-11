import { AuthLayout } from '../components/PortalUI.jsx';
export default function AdminPendingPage({navigate}) {
  return <AuthLayout navigate={navigate} heading="Administrator sign in" subheading="No approval is required. Sign in with the configured administrator account."><button className="auth-submit" onClick={()=>navigate('login')}>Sign in</button></AuthLayout>;
}
