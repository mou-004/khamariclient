
import { useEffect, useRef, useState } from 'react';
import {
  UserRound,
  ChevronDown,
  LogIn,
  UserPlus,
  LogOut,
  X
} from 'lucide-react';

export default function UserMenu({ user, navigate, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const go = (page) => {
    setOpen(false);
    navigate(page);
  };

  const handleLogout = async () => {
    setOpen(false);
    if (onLogout) await onLogout();
  };

  const name =
    user?.name ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'My Account';

  const email = user?.email || '';

  return (
    <div
      className="user-menu"
      ref={menuRef}
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
    >
      {!user ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            whiteSpace: 'nowrap'
          }}
        >
          <button
            type="button"
            onClick={() => go('login')}
            style={{
              padding: '9px 13px',
              border: '1px solid #187345',
              borderRadius: '9px',
              background: '#ffffff',
              color: '#187345',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <LogIn size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />
            Sign In
          </button>

          <button
            type="button"
            onClick={() => go('register')}
            style={{
              padding: '9px 13px',
              border: '1px solid #187345',
              borderRadius: '9px',
              background: '#187345',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <UserPlus size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />
            Sign Up
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="Open account menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 9px',
              border: 'none',
              borderRadius: '10px',
              background: '#f0f5f1',
              color: '#183b2b',
              cursor: 'pointer'
            }}
          >
            <span
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#187345',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}
            >
              {name.charAt(0).toUpperCase()}
            </span>

            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              {name.length > 12 ? name.slice(0, 12) + '...' : name}
            </span>

            <ChevronDown size={15} />
          </button>

          {open && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '230px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.13)',
                padding: '12px',
                zIndex: 9999
              }}
            >
              <div style={{ padding: '8px', borderBottom: '1px solid #eeeeee' }}>
                <strong style={{ display: 'block', color: '#183b2b' }}>
                  {name}
                </strong>
                <small style={{ color: '#777', wordBreak: 'break-all' }}>
                  {email}
                </small>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '12px 8px',
                  marginTop: '5px',
                  border: 'none',
                  borderRadius: '7px',
                  background: '#ffffff',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontWeight: 600,
                  textAlign: 'left'
                }}
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
