import React, { useState, useEffect, useCallback } from 'react';
import {
  saveTokens,
  saveUser,
  sanitiseUsername,
  AuthUser,
} from '../shared/utils/auth';
import ForgotPasswordModal from './ForgotPasswordModal';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

type LoginState = 'idle' | 'loading' | 'success' | 'error';

// ─── Component ─────────────────────────────────────────────────────────────────

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Forced password change state
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forcePwdError, setForcePwdError] = useState('');
  const [forcePwdLoading, setForcePwdLoading] = useState(false);

  // Clear error when user edits inputs
  useEffect(() => {
    if (errorMessage) setErrorMessage('');
  }, [username, password]);

  const handleForcePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setForcePwdError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForcePwdError('New passwords do not match.');
      return;
    }

    setForcePwdLoading(true);
    setForcePwdError('');

    try {
      const token = sessionStorage.getItem('kspg_access_token');
      const res = await fetch('/api/v1/auth/force-change-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          new_password: newPassword,
          new_password_confirm: confirmPassword,
        }),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        if (pendingUser) {
          const updatedUser: AuthUser = {
            ...pendingUser,
            must_change_password: false,
          };
          saveUser(updatedUser);
          setPendingUser(null);
          setLoginState('success');
          setTimeout(() => {
            onLoginSuccess(updatedUser);
          }, 400);
        }
      } else {
        setForcePwdError(body?.error?.message || body?.new_password?.[0] || 'Failed to change password.');
      }
    } catch {
      setForcePwdError('Server error while changing password. Please try again.');
    } finally {
      setForcePwdLoading(false);
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const cleanUsername = sanitiseUsername(username);

      if (!cleanUsername) {
        setErrorMessage('Please enter your Operator ID or Username.');
        return;
      }
      if (!password) {
        setErrorMessage('Please enter your Access Key.');
        return;
      }

      setLoginState('loading');
      setErrorMessage('');

      try {
        const res = await fetch('/api/v1/auth/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username: cleanUsername, password }),
        });

        let body: any = null;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          body = await res.json();
        }

        if (res.status === 429) {
          setLoginState('error');
          setErrorMessage(
            body?.detail ||
            body?.error?.message ||
            'Rate limit exceeded. Maximum 5 login attempts per minute. Please wait before retrying.'
          );
          setTimeout(() => setLoginState('idle'), 5000);
          return;
        }

        if (res.ok && (body?.access || body?.data?.tokens?.access)) {
          const tokens = body?.data?.tokens ?? body;
          saveTokens({ access: tokens.access, refresh: tokens.refresh || '' });

          let user: AuthUser | null = null;
          const rawFromLogin = body?.data?.user;
          if (rawFromLogin) {
            const isSuper = Boolean(
              rawFromLogin.is_superadmin ||
              rawFromLogin.isSuperadmin ||
              rawFromLogin.role_category === 'superadmin' ||
              rawFromLogin.role_name === 'superadmin'
            );

            const rawCategory = rawFromLogin.roleCategory || rawFromLogin.role_category;
            const roleName =
              rawFromLogin.roleDetail?.name ||
              rawFromLogin.role_detail?.name ||
              rawFromLogin.roleName ||
              rawFromLogin.role_name ||
              '';

            let category: 'initiator' | 'coordinator' | 'committee' | 'admin' | 'superadmin' = 'initiator';
            if (isSuper) category = 'superadmin';
            else if (rawCategory === 'admin' || roleName === 'admin') category = 'admin';
            else if (rawCategory === 'coordinator' || roleName === 'kaizen_lead') category = 'coordinator';
            else if (
              rawCategory === 'committee' ||
              roleName === 'reviewer' ||
              roleName === 'cft_member' ||
              roleName === 'verifier'
            )
              category = 'committee';

            user = {
              id: rawFromLogin.id,
              username: rawFromLogin.username || cleanUsername,
              email: rawFromLogin.email || '',
              first_name: rawFromLogin.firstName || rawFromLogin.first_name || '',
              last_name: rawFromLogin.lastName || rawFromLogin.last_name || '',
              full_name:
                rawFromLogin.fullName ||
                rawFromLogin.full_name ||
                `${rawFromLogin.firstName || rawFromLogin.first_name || ''} ${rawFromLogin.lastName || rawFromLogin.last_name || ''}`.trim() ||
                cleanUsername,
              employee_id: rawFromLogin.employeeId || rawFromLogin.employee_id || '',
              department: rawFromLogin.department || '',
              designation: rawFromLogin.designation || '',
              plant: rawFromLogin.plant || '',
              mini_factory: rawFromLogin.mini_factory || rawFromLogin.miniFactory || 'MF1',
              role_name: roleName,
              role_category: category,
              is_superadmin: isSuper,
              must_change_password: Boolean(rawFromLogin.must_change_password || rawFromLogin.mustChangePassword),
              is_active_employee: rawFromLogin.is_active_employee ?? true,
              module_roles: rawFromLogin.module_roles || [],
            };
          }

          if (!user) {
            user = {
              id: 0,
              username: cleanUsername,
              email: '',
              first_name: '',
              last_name: '',
              full_name: cleanUsername,
              employee_id: '',
              department: '',
              designation: '',
              plant: '',
              mini_factory: 'MF1',
              role_name: 'initiator',
              role_category: 'initiator',
              is_superadmin: false,
              must_change_password: false,
            };
          }

          // Note: Forced password change is disabled per project requirement for now
          // (user logs straight in with their initial password)

          saveUser(user);
          setLoginState('success');

          setTimeout(() => {
            onLoginSuccess(user!);
          }, 600);
        } else {
          setLoginState('error');
          setErrorMessage(
            body?.error?.message ||
            'Access denied. Invalid operator ID or access key.'
          );
          setTimeout(() => setLoginState('idle'), 3500);
        }
      } catch {
        setLoginState('error');
        setErrorMessage('Unable to connect to authentication server. Please check your network.');
        setTimeout(() => setLoginState('idle'), 3500);
      }
    },
    [username, password, onLoginSuccess]
  );

  return (
    <div
      className="login-viewport"
      style={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Hanken Grotesk', sans-serif",
        color: '#0a1128',
        backgroundColor: '#ffffff',
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuAs9oxr-9KGLKZpV4zN8cRNI4U1jaqebc034STW_P4jUhu70xRNJeRzOX-WBRTH3W3lvHYUVwXWLBFRn-jPoU_-DEEuPL5KmRZwORBPmWSIPT5VoQue-bAdLJ8ZEVG4bmv0TwWP9Vhd54at-_inyJTSmkfsfs1OgCNTWhNpKGCSc35qEampon1Lvfz_ofS5--zzMx6-ah_iTYhY1UgBHCP7GKf1XQ2OwLiV9jrPEj221Q58zt3jALsMxxIE_YO_e02M4g")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundAttachment: 'fixed',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* ── Orbit Rings ──────────────────────────────────────────────────────── */}
      <div className="orbit-ring ring-1" />
      <div className="orbit-ring ring-2" />

      {/* ── Background Marquee Ribbons ────────────────────────────────────────── */}
      <div className="marquee-container marquee-1">
        KAIZEN // 5S // RED FLAG // PPSR // 5M // KSPG COCKPIT // KAIZEN // 5S // RED FLAG // PPSR // 5M // KSPG COCKPIT
      </div>
      <div className="marquee-container marquee-2">
        KSPG COCKPIT // 5M // PPSR // RED FLAG // 5S // KAIZEN // KSPG COCKPIT // 5M // PPSR // RED FLAG // 5S // KAIZEN
      </div>
      <div className="marquee-container marquee-3">
        RED FLAG // KAIZEN // KSPG COCKPIT // 5M // PPSR // 5S // RED FLAG // KAIZEN // KSPG COCKPIT // 5M // PPSR // 5S
      </div>

      {/* ── Liquid Glass Login Card ───────────────────────────────────────────── */}
      <div
        className="login-card"
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem 2rem',
          margin: '1rem',
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '2rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 30px rgba(76, 127, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem',
        }}
      >
        {/* Card Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.35rem',
            borderBottom: '1px dashed #d1d5db',
            paddingBottom: '1.25rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.18em',
              color: '#4C7FFF',
              textTransform: 'uppercase',
            }}
          >
            KSPG COCKPIT // LIVE
          </div>
          <h1
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: '26px',
              fontWeight: 700,
              color: '#0a1128',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            System Access
          </h1>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div
            style={{
              background: 'rgba(254, 226, 226, 0.95)',
              border: '1px solid #f87171',
              color: '#991b1b',
              borderRadius: '0.85rem',
              padding: '0.75rem 1rem',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              animation: 'fadeIn 0.25s ease-in-out',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              warning
            </span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Username / Operator ID Field */}
          <div className="input-group" style={{ position: 'relative' }}>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loginState === 'loading' || loginState === 'success'}
              placeholder="OPERATOR_ID / USERNAME "
              required
              autoFocus
              className="peer neumorphic-input"
              style={{
                width: '100%',
                background: '#ffffff',
                borderRadius: '1rem',
                boxShadow: 'inset 4px 4px 8px #d9d9d9, inset -4px -4px 8px #ffffff',
                border: '1px solid transparent',
                padding: '1.25rem 1.25rem 0.6rem 1.25rem',
                fontSize: '15px',
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: '#0a1128',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
              }}
            />
            <label
              htmlFor="username"
              style={{
                position: 'absolute',
                left: '1.25rem',
                top: '0.95rem',
                color: '#6b7280',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                pointerEvents: 'none',
                transition: 'all 0.2s ease',
              }}
              className="peer-focus:top-[4px] peer-focus:text-[10px] peer-focus:text-[#4C7FFF] peer-not-placeholder-shown:top-[4px] peer-not-placeholder-shown:text-[10px] peer-not-placeholder-shown:text-[#4C7FFF]"
            >

            </label>
          </div>

          {/* Password / Access Key Field */}
          <div className="input-group" style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loginState === 'loading' || loginState === 'success'}
              placeholder="Password"
              required
              className="peer neumorphic-input"
              style={{
                width: '100%',
                background: '#ffffff',
                borderRadius: '1rem',
                boxShadow: 'inset 4px 4px 8px #d9d9d9, inset -4px -4px 8px #ffffff',
                border: '1px solid transparent',
                padding: '1.25rem 3rem 0.6rem 1.25rem',
                fontSize: '15px',
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: '#0a1128',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
              }}
            />
            <label
              htmlFor="password"
              style={{
                position: 'absolute',
                left: '1.25rem',
                top: '0.95rem',
                color: '#6b7280',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                pointerEvents: 'none',
                transition: 'all 0.2s ease',
              }}
              className="peer-focus:top-[4px] peer-focus:text-[10px] peer-focus:text-[#4C7FFF] peer-not-placeholder-shown:top-[4px] peer-not-placeholder-shown:text-[10px] peer-not-placeholder-shown:text-[#4C7FFF]"
            >

            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: showPassword ? '#4C7FFF' : '#9ca3af',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none',
              }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          {/* Options Row (Remember Me) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 0.25rem',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                color: '#4b5563',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{
                  accentColor: '#4C7FFF',
                  width: '14px',
                  height: '14px',
                  cursor: 'pointer',
                }}
              />
              REMEMBER_SESSION
            </label>

            <button
              type="button"
              onClick={() => setIsForgotPasswordOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                letterSpacing: '0.08em',
                color: '#4C7FFF',
                cursor: 'pointer',

              }}
            >
              FORGOT PASSWORD
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loginState === 'loading' || loginState === 'success'}
            className="btn-glow"
            style={{
              width: '100%',
              background:
                loginState === 'success'
                  ? '#10b981'
                  : 'linear-gradient(135deg, #4C7FFF 0%, #3b66db 100%)',
              color: '#ffffff',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '1rem',
              borderRadius: '1rem',
              border: 'none',
              cursor: loginState === 'loading' ? 'wait' : 'pointer',
              boxShadow: '0 8px 20px rgba(76, 127, 255, 0.28)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              transition: 'all 0.25s ease',
            }}
          >
            {loginState === 'loading' && (
              <>
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>
                  progress_activity
                </span>
                VERIFYING PROTOCOLS...
              </>
            )}
            {loginState === 'success' && (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  check_circle
                </span>
                ACCESS GRANTED // REDIRECTING...
              </>
            )}
            {loginState === 'idle' && (
              <>
                INITIATE SEQUENCE

              </>
            )}
            {loginState === 'error' && (
              <>
                RETRY AUTHENTICATION
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  refresh
                </span>
              </>
            )}
          </button>
        </form>

        {/* Decorative Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: -1,
            opacity: 0.02,
            mixBlendMode: 'overlay',
            pointerEvents: 'none',
            borderRadius: '2rem',
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCDHwyiDj-v1NqKcam-Zfg5xIQlfrmbEhfTXY8v4F-nXBWbKOK40dD9HOMZ9xeFoapkfTOi_muM6aYIK4pPytZMC9UEqzUoaEduU3r1G6Wg3kYyPpYZoPTbXbdJfKY6FguPVTIKzCN7HCdGBsxLe-XyDO0sQC9s4Lxr53ZFPJmloN1EoCm0Jqxef52dp4Fs5cwE24tw6I1PhU2SNhOrYvA7OzLbON5Kae1b1gQz4Wg_MTktRvUW2ARZBqz5VRJeGZIG9w')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </div>

      {/* ── Forgot Password Modal ────────────────────────────────────────────── */}
      {isForgotPasswordOpen && (
        <ForgotPasswordModal
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
        />
      )}

      {/* ── Mandatory First-Time Password Change Modal ───────────────────────── */}
      {pendingUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(10, 17, 40, 0.75)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '1.5rem',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              padding: '2.25rem',
              border: '1px solid rgba(229, 231, 235, 0.8)',
              fontFamily: "'Hanken Grotesk', sans-serif",
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                }}
              >
                <span className="material-symbols-outlined">lock_reset</span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0a1128' }}>
                  Mandatory Password Setup
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                  First login for <strong style={{ color: '#0a1128' }}>{pendingUser.username}</strong>
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                borderLeft: '4px solid #3b82f6',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.82rem',
                color: '#475569',
                marginBottom: '1.5rem',
              }}
            >
              You were issued a temporary password by the SuperAdmin. For system security, please create a new permanent access password to continue.
            </div>

            <form onSubmit={handleForcePasswordSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                  New Permanent Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                  Confirm Permanent Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {forcePwdError && (
                <div
                  style={{
                    padding: '0.6rem 0.8rem',
                    borderRadius: '0.5rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontSize: '0.8rem',
                    marginBottom: '1rem',
                    fontWeight: 500,
                  }}
                >
                  {forcePwdError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setPendingUser(null)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#4b5563',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forcePwdLoading}
                  style={{
                    flex: 2,
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: '#0a1128',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: forcePwdLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {forcePwdLoading ? 'Updating Access...' : 'Set Password & Enter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Fixed Footer ──────────────────────────────────────────────────────── */}
      {/* <footer
        style={{
          position: 'fixed',
          bottom: 0,
          width: '100%',
          zIndex: 40,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.6rem 2rem',
          borderTop: '1px solid rgba(229, 231, 235, 0.8)',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          fontSize: '11px',
          fontFamily: "'JetBrains Mono', monospace",
          color: '#6b7280',
          boxSizing: 'border-box',
        }}
      >
        <span>© 2026 KSPG OPERATIONS // KAIZEN PROTOCOL</span>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <span className="hidden md:inline">CONFIDENTIAL - INTERNAL OPERATIONS REVIEW</span>
          <span style={{ color: '#4C7FFF', fontWeight: 600 }}>SYSTEM STATUS: NOMINAL</span>
        </div>
      </footer> */}

      {/* ── Inline CSS Animations & Utilities ─────────────────────────────────── */}
      <style>{`
        .orbit-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px dashed rgba(10, 17, 40, 0.12);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 1;
        }
        .ring-1 { width: 580px; height: 580px; }
        .ring-2 { width: 840px; height: 840px; }

        .marquee-container {
          overflow: hidden;
          white-space: nowrap;
          position: absolute;
          width: 100%;
          opacity: 0.05;
          font-family: 'Hanken Grotesk', sans-serif;
          font-weight: 800;
          font-size: 7.5rem;
          color: transparent;
          -webkit-text-stroke: 1px #0a1128;
          pointer-events: none;
          user-select: none;
          z-index: 1;
        }
        .marquee-1 { top: 8%; animation: kspg-scroll-left 60s linear infinite; }
        .marquee-2 { top: 42%; animation: kspg-scroll-right 70s linear infinite; }
        .marquee-3 { top: 74%; animation: kspg-scroll-left 65s linear infinite; }

        @keyframes kspg-scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes kspg-scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }

        .btn-glow:hover:not(:disabled) {
          box-shadow: 0 0 22px rgba(76, 127, 255, 0.5) !important;
          transform: translateY(-1px);
        }

        .neumorphic-input:focus {
          border-color: #4C7FFF !important;
          box-shadow: inset 3px 3px 6px #d9d9d9, inset -3px -3px 6px #ffffff, 0 0 0 3px rgba(76, 127, 255, 0.15) !important;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .ring-1 { width: 340px; height: 340px; }
          .ring-2 { width: 480px; height: 480px; }
          .marquee-container { font-size: 4.5rem; }
          footer { font-size: 9px !important; padding: 0.5rem 1rem !important; }
        }
      `}</style>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        initialIdentifier={username}
        onClose={() => setIsForgotPasswordOpen(false)}
        onSuccessReturn={resetUser => {
          if (resetUser) setUsername(resetUser);
          setIsForgotPasswordOpen(false);
        }}
      />
    </div>
  );
}
