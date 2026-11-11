import { useState } from "react";
import { ArrowRight, LockKeyhole, Mail, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

import { AuthLayout } from "./PortalUI.jsx";
import { loginAccount, registerAccount, resetAccountPassword, resendEmailOtp, resendVerificationCode, verifyEmailOtp, firebaseErrorMessage } from '../firebaseService';

export default function AuthPage({ route, navigate, onLogin, onRegister }) {
  const [name,setName] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [adminCode,setAdminCode] = useState('');
  const [role,setRole] = useState(route === 'register-seller' ? 'seller' : route === 'register-admin' ? 'admin' : 'customer');

  const [showPassword,setShowPassword] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const [otpCode,setOtpCode] = useState('');
  const [verificationStep,setVerificationStep] = useState(false);
  const [canResend,setCanResend] = useState(false);
  const isRegister = ['register','register-seller','register-admin'].includes(route);
  const isAdminRegistration = isRegister && (route === 'register-admin' || role === 'admin');
  const isForgot = route === 'forgot-password';
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setMessage('');
    if (!email.trim() || (!isForgot && !password.trim()) || (isRegister && !name.trim()) || (isAdminRegistration && !adminCode.trim())) { setError('Please complete all required fields.'); return; }
    setSubmitting(true);
    try {
      if (isForgot) {
        await resetAccountPassword(email);
        setMessage('If an account exists for this email, password reset instructions have been sent. Check your inbox and spam folder, then follow the Firebase reset link to choose a new password.');
      } else if (isRegister) {
        const account = await registerAccount({ name, email, password, requestedRole: isAdminRegistration ? 'admin' : role, adminCode });
        setVerificationStep(true);
        setCanResend(true);
        setMessage(account.otpSent ? account.message : `Your Firebase account was created, but the code could not be sent. ${account.sendError || ''} Check the backend SMTP setup and resend the code.`);
      } else {
        const account = await loginAccount({ email, password });
        onLogin(account);
      }
    } catch (err) {
      setError(firebaseErrorMessage(err));
      if (err?.code === 'auth/email-not-verified') setCanResend(true);
    } finally {
      setSubmitting(false);
    }
  };

  const verifySubmit = async (e) => {
    e.preventDefault(); setError(''); setMessage('');
    if (!/^\d{6}$/.test(otpCode.trim())) { setError('Enter the 6-digit code sent to your email.'); return; }
    setSubmitting(true);
    try {
      const account = await verifyEmailOtp(otpCode);
      onRegister(account);
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setError(''); setMessage(''); setSubmitting(true);
    try {
      const result = verificationStep
        ? await resendEmailOtp()
        : await resendVerificationCode({ email, password });
      setVerificationStep(true);
      setCanResend(true);
      setMessage(result.message || 'A new verification code has been sent. Check your inbox and spam folder.');
    } catch (err) {
      setError(firebaseErrorMessage(err));
      if (err?.code === 'auth/email-already-verified') setCanResend(false);
    } finally {
      setSubmitting(false);
    }
  };

  const heading = verificationStep ? 'Verify your email' : isForgot ? 'Reset your password' : isRegister ? 'Create your account' : 'Welcome back';
  const subheading = verificationStep
    ? 'Enter the 6-digit code sent to your email. The code expires after 10 minutes.'
    : isForgot ? 'Enter the email address linked to your Khamari account. We’ll send a secure password reset link.'
    : isRegister ? (isAdminRegistration ? 'Enter the Admin Code. Then verify your email with the 6-digit OTP. No Super Admin approval is required.' : 'Join the local farm-to-home marketplace.')
    : 'Sign in with your email to manage orders, products and bids.';

  return <AuthLayout navigate={navigate} heading={heading} subheading={subheading}>
    {verificationStep ? <form className="auth-form" onSubmit={verifySubmit}>
      <div className="portal-alert"><Mail size={16}/><span>Verification code for <b>{email}</b>. Check your inbox and spam folder.</span></div>
      <label>6-digit email verification code<input value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/></label>
      {error && <div className="portal-alert portal-alert-error"><AlertCircle size={16}/>{error}</div>}
      {message && <div className="portal-alert"><CheckCircle2 size={16}/>{message}</div>}
      <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Verifying…' : isAdminRegistration ? 'Verify OTP and activate Admin account' : 'Verify email and activate account'} <ArrowRight size={17}/></button>
      <button className="auth-secondary" type="button" onClick={resendCode} disabled={submitting}>{submitting ? 'Please wait…' : 'Resend verification code'}</button>
      <p className="auth-bottom">Already verified? <a href="#login" onClick={()=>navigate('login')}>Back to sign in</a></p>
    </form> : <form className="auth-form" onSubmit={submit}>
      {isRegister && <label>Full name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" autoComplete="name" required/></label>}
      <label>Email address<span className="auth-input-wrap"><Mail size={17}/><input type={isRegister || isForgot ? "email" : "text"} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></span></label>
      {!isForgot && <label>Password<span className="auth-input-wrap"><LockKeyhole size={17}/><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={isRegister?'Create a strong password':'Enter your password'} minLength={6} autoComplete={isRegister?'new-password':'current-password'} required/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></span>{isRegister&&<small className="auth-help">Use at least 6 characters.</small>}</label>}
      {isRegister && route !== 'register-admin' && <label>I want to join as<select value={role} onChange={e=>{setRole(e.target.value);setError("");setMessage("");}}><option value="customer">Customer</option><option value="seller">Seller / Farmer</option><option value="admin">Admin</option></select></label>}
      {isAdminRegistration && <label>Admin Code<span className="auth-input-wrap"><LockKeyhole size={17}/><input type="password" value={adminCode} onChange={e=>setAdminCode(e.target.value)} placeholder="Enter Admin Code" autoComplete="off" required/></span><small className="auth-help">Enter the shared Admin Code supplied by the Khamari owner. Email OTP verification is also required.</small></label>}

      {error && <div className="portal-alert portal-alert-error"><AlertCircle size={16}/>{error}</div>}
      {message && <div className="portal-alert"><CheckCircle2 size={16}/>{message}</div>}
      {!isRegister && !isForgot && <div className="auth-inline-row"><label className="auth-check"><input type="checkbox"/> Remember me</label><a href="#forgot-password" onClick={()=>navigate('forgot-password')}>Forgot password?</a></div>}
      <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Please wait…' : isForgot ? 'Send password reset link' : isAdminRegistration ? 'Send Admin Verification OTP' : isRegister ? 'Create account and send OTP' : 'Sign in'} <ArrowRight size={17}/></button>
      {canResend && !isRegister && !isForgot && <button className="auth-secondary" type="button" onClick={resendCode} disabled={submitting}>Resend verification code</button>}
      <p className="auth-bottom">{isForgot ? <>Remember your password? <a href="#login" onClick={()=>navigate('login')}>Sign in</a></> : isRegister ? <>Already have an account? <a href="#login" onClick={()=>navigate('login')}>Sign in</a></> : <>New to Khamari? <a href="#register" onClick={()=>navigate('register')}>Create an account</a></>}</p>
    </form>}
  </AuthLayout>;
}
