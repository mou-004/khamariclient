import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  reload,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from './firebase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

function requireFirebase() {
  if (!firebaseConfigured || !auth || !db) {
    throw new Error('Firebase is not configured. Fill in the VITE_FIREBASE_* values in client/.env and restart Vite.');
  }
}

function makeError(message, code = 'khamari/auth-error') {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function requestOtpEndpoint(path, body = {}) {
  requireFirebase();
  const user = auth.currentUser;
  if (!user) throw makeError('Your registration session expired. Please sign in again.', 'auth/session-expired');
  const token = await user.getIdToken(true);
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw makeError(data.error || 'Could not complete email verification.', `khamari/http-${response.status}`);
  return data;
}

export async function getUserProfile(firebaseUser) {
  requireFirebase();
  await reload(firebaseUser);
  if (!firebaseUser.emailVerified) return null;
  const token = await firebaseUser.getIdToken();
  const response = await fetch(`${API_BASE}/auth/profile`, {headers: {Authorization: `Bearer ${token}`}});
  if (!response.ok) throw makeError('Could not load your account. Check the backend connection.');
  const { profile } = await response.json();
  if (!profile) return null;
  if (profile.emailVerified !== true) return null;
  if (profile.status === 'suspended') return null;
  return { uid: firebaseUser.uid, email: firebaseUser.email || '', ...profile };
}

export async function registerAccount({ name, email, password, requestedRole = 'customer', adminCode = '' }) {
  requireFirebase();
  const normalizedEmail = email.trim().toLowerCase();
  const safeRole = ['customer', 'seller', 'admin'].includes(requestedRole) ? requestedRole : 'customer';
  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  await updateProfile(credential.user, { displayName: name.trim() });

  // Admin Code is validated server-side before an Admin OTP is sent.
  // All three roles complete email OTP; Admins skip only approval, not verification.
  try {
    const result = safeRole === 'admin'
      ? await requestOtpEndpoint('/auth/admin/register', { name: name.trim(), adminCode })
      : await requestOtpEndpoint('/auth/email-otp/send', { name: name.trim(), requestedRole: safeRole });
    return {
      uid: credential.user.uid,
      name: name.trim(),
      email: normalizedEmail,
      requestedRole: safeRole,
      requiresVerification: true,
      otpSent: true,
      message: result.message,
    };
  } catch (error) {
    if (safeRole === 'admin') {
      await deleteUser(credential.user).catch(() => {});
      await signOut(auth).catch(() => {});
      throw error;
    }
    return {
      uid: credential.user.uid,
      name: name.trim(),
      email: normalizedEmail,
      requestedRole: safeRole,
      requiresVerification: true,
      otpSent: false,
      sendError: error.message,
    };
  }
}

export async function resendEmailOtp() {
  return requestOtpEndpoint('/auth/email-otp/send');
}

export async function resendVerificationCode({ email, password }) {
  requireFirebase();
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await reload(credential.user);
  if (credential.user.emailVerified) {
    throw makeError('This email is already verified. Please sign in.', 'auth/email-already-verified');
  }
  return requestOtpEndpoint('/auth/email-otp/send');
}

export async function verifyEmailOtp(code) {
  const result = await requestOtpEndpoint('/auth/email-otp/verify', { code: String(code).trim() });
  if (!auth?.currentUser) throw makeError('Your session expired. Please sign in again.', 'auth/session-expired');
  await reload(auth.currentUser);
  await auth.currentUser.getIdToken(true);
  const profile = await getUserProfile(auth.currentUser);
  if (!profile) throw makeError('Your email was verified, but the profile could not be loaded. Please sign in again.', 'khamari/profile-missing');
  return { ...profile, requestedRole: result.requestedRole || 'customer' };
}

export async function loginAccount({ email, password }) {
  requireFirebase();
  // Each administrator signs in with their own email address. Multiple admin
  // accounts are supported, so a shared "admin" username would be ambiguous.
  const identifier = email.trim().toLowerCase();
  const credential = await signInWithEmailAndPassword(auth, identifier, password);
  await reload(credential.user);
  if (!credential.user.emailVerified) {
    await signOut(auth);
    throw makeError('Please verify your email first. Use “Resend verification code” to receive a 6-digit OTP.', 'auth/email-not-verified');
  }
  const profile = await getUserProfile(credential.user);
  if (!profile) {
    await signOut(auth);
    throw makeError('Your account profile is not activated. Please complete email verification or contact support.', 'khamari/profile-missing');
  }
  return {
    ...profile,
    name: profile.name || credential.user.displayName || credential.user.email?.split('@')[0] || 'Khamari user',
    email: credential.user.email || profile.email,
  };
}

export async function logoutAccount() {
  if (auth) await signOut(auth);
}

export async function resetAccountPassword(email) {
  requireFirebase();
  const normalizedEmail = email.trim().toLowerCase();
  let response;
  let result = {};
  try {
    response = await fetch(`${API_BASE}/auth/password-reset`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: normalizedEmail}),
    });
    result = await response.json().catch(() => ({}));
  } catch {
    // If the backend/SMTP service is unavailable, use Firebase's own email service.
    await sendPasswordResetEmail(auth, normalizedEmail);
    return;
  }
  if (response.ok) return;
  if (response.status === 503 || response.status === 502) {
    await sendPasswordResetEmail(auth, normalizedEmail);
    return;
  }
  throw makeError(result.error || 'Password reset email could not be sent.');
}

export function observeAccount(callback) {
  if (!auth || !firebaseConfigured) return () => {};
  // Firebase can resolve an earlier profile request after a later sign-out
  // event. Ignore stale async results so they cannot restore the old session.
  let revision = 0;
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    const currentRevision = ++revision;
    if (!firebaseUser) {
      callback(null);
      return;
    }
    try {
      const profile = await getUserProfile(firebaseUser);
      if (currentRevision === revision) callback(profile);
    } catch (error) {
      console.error('Could not load Khamari user profile:', error);
      if (currentRevision === revision) callback(null);
    }
  });
  return () => {
    revision += 1;
    unsubscribe();
  };
}

export function firebaseErrorMessage(error) {
  const code = error?.code || '';
  const messages = {
    'auth/email-already-in-use': 'This email already has an account. Please sign in instead.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/user-not-found': 'No account was found for this email.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/too-many-requests': 'Too many attempts. Wait a little and try again.',
    'auth/email-not-verified': 'Your email is not verified yet. Send a new OTP and verify your account before signing in.',
    'auth/email-already-verified': 'This email is already verified. Please sign in.',
    'auth/session-expired': 'Your session expired. Please sign in again.',
    'permission-denied': 'Firestore rejected this action. Check your Firestore security rules.',
  };
  return messages[code] || error?.message || 'Something went wrong. Please try again.';
}

export { firebaseConfigured };