import React, { useState, useEffect, useRef } from 'react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIdentifier?: string;
  onSuccessReturn?: (username: string) => void;
}

type Step = 'request' | 'verify' | 'reset' | 'success';

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  initialIdentifier = '',
  onSuccessReturn,
}: ForgotPasswordModalProps) {
  // Wizard state
  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Status & Timers
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const prevIsOpenRef = useRef(false);
  const resetTokenRef = useRef('');
  const identifierRef = useRef('');

  // Sync initial identifier when modal opens
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setStep('request');
      const initial = initialIdentifier || sessionStorage.getItem('kspg_reset_user') || '';
      setIdentifier(initial);
      identifierRef.current = initial;
      setOtp(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage('');
      setResetToken('');
      resetTokenRef.current = '';
      setMaskedEmail('');
      setCooldownSeconds(0);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialIdentifier]);

  // Timers countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldownSeconds > 0) {
      interval = setInterval(() => {
        setCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  if (!isOpen) return null;

  // ── Handlers ─────────────────────────────────────────────────────────────

  // Step 1: Request OTP via Email
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = identifier.trim() || identifierRef.current.trim();
    if (!clean) {
      setErrorMessage('Please enter your Username or Employee ID.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      identifierRef.current = clean;
      sessionStorage.setItem('kspg_reset_user', clean);
      localStorage.setItem('kspg_reset_user', clean);

      const res = await fetch('/api/v1/auth/forgot-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: clean, username: clean }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCooldownSeconds(data?.data?.cooldown_seconds || 15);
        setStep('verify');
      } else {
        const msg = data?.error?.message || 'Failed to dispatch verification code. Please try again.';
        setErrorMessage(msg);
      }
    } catch {
      setErrorMessage('Network error communicating with authentication service.');
    } finally {
      setIsLoading(false);
    }
  };

  // OTP inputs handling
  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanVal;
    setOtp(newOtp);

    if (cleanVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);
    const nextIdx = Math.min(pasted.length, 5);
    otpInputsRef.current[nextIdx]?.focus();
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const currentIdentifier =
        identifier.trim() ||
        identifierRef.current.trim() ||
        sessionStorage.getItem('kspg_reset_user') ||
        localStorage.getItem('kspg_reset_user') ||
        '';

      const res = await fetch('/api/v1/auth/verify-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: currentIdentifier,
          username: currentIdentifier,
          otp: fullOtp,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const token =
          data?.data?.resetToken ||
          data?.data?.reset_token ||
          data?.resetToken ||
          data?.reset_token ||
          data?.token ||
          '';
        const verifiedUsername =
          data?.data?.username ||
          data?.data?.userName ||
          data?.username ||
          data?.userName ||
          currentIdentifier;
        if (token) {
          setResetToken(token);
          resetTokenRef.current = token;
          sessionStorage.setItem('kspg_reset_token', token);
          localStorage.setItem('kspg_reset_token', token);
        }
        if (verifiedUsername) {
          setIdentifier(verifiedUsername);
          identifierRef.current = verifiedUsername;
          sessionStorage.setItem('kspg_reset_user', verifiedUsername);
          localStorage.setItem('kspg_reset_user', verifiedUsername);
        }
        setStep('reset');
      } else {
        const msg = data?.error?.message || 'Invalid or expired verification code.';
        setErrorMessage(msg);
      }
    } catch {
      setErrorMessage('Network error during verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    const currentToken =
      resetToken ||
      resetTokenRef.current ||
      sessionStorage.getItem('kspg_reset_token') ||
      localStorage.getItem('kspg_reset_token') ||
      '';

    const currentIdentifier =
      identifier.trim() ||
      identifierRef.current.trim() ||
      sessionStorage.getItem('kspg_reset_user') ||
      localStorage.getItem('kspg_reset_user') ||
      initialIdentifier.trim();

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/v1/auth/reset-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: currentIdentifier,
          username: currentIdentifier,
          employee_id: currentIdentifier,
          employeeId: currentIdentifier,
          reset_token: currentToken,
          resetToken: currentToken,
          token: currentToken,
          new_password: newPassword,
          newPassword: newPassword,
          password: newPassword,
          confirm_password: confirmPassword,
          confirmPassword: confirmPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.removeItem('kspg_reset_token');
        sessionStorage.removeItem('kspg_reset_user');
        localStorage.removeItem('kspg_reset_token');
        localStorage.removeItem('kspg_reset_user');
        setStep('success');
      } else {
        const msg = data?.error?.message || 'Password reset failed. Please try again.';
        setErrorMessage(msg);
      }
    } catch {
      setErrorMessage('Network error updating password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 24, 0.78)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'rgba(14, 18, 50, 0.95)',
          border: '1px solid rgba(106, 123, 217, 0.35)',
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(106, 123, 217, 0.15)',
          padding: '32px 28px',
          color: '#f1f3f5',
          fontFamily: "'Hanken Grotesk', sans-serif",
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: 'rgba(197, 197, 212, 0.8)',
            width: 32,
            height: 32,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            transition: 'background 0.2s',
          }}
          title="Close Recovery Window"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(106,123,217,0.2) 0%, rgba(82,99,201,0.4) 100%)',
              border: '1px solid rgba(106,123,217,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              margin: '0 auto 12px auto',
            }}
          >
            {step === 'success' ? '✓' : '🔐'}
          </div>
          <h2
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 20,
              fontWeight: 800,
              color: '#f8f9fa',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            {step === 'request' && 'Password Recovery'}
            {step === 'verify' && 'Enter Verification Code'}
            {step === 'reset' && 'Create New Password'}
            {step === 'success' && 'Password Restored'}
          </h2>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: 'rgba(197, 197, 212, 0.75)',
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            {step === 'request' && 'Verify your identity via registered email OTP'}
            {step === 'verify' && '6-digit OTP sent to your registered email address'}
            {step === 'reset' && 'Set a strong, 8+ character password'}
            {step === 'success' && 'Your security credentials are updated'}
          </p>
        </div>

        {/* Step Progress Pills */}
        {step !== 'success' && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 24,
            }}
          >
            {[
              { id: 'request', label: '1. Request' },
              { id: 'verify', label: '2. Verify' },
              { id: 'reset', label: '3. Reset' },
            ].map(s => {
              const isActive = step === s.id;
              const isPast =
                (s.id === 'request' && (step === 'verify' || step === 'reset')) ||
                (s.id === 'verify' && step === 'reset');
              return (
                <div
                  key={s.id}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: isActive
                      ? '#6A7BD9'
                      : isPast
                      ? '#04D98B'
                      : 'rgba(255,255,255,0.1)',
                    transition: 'all 0.3s ease',
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Error Alert Box */}
        {errorMessage && (
          <div
            style={{
              background: 'rgba(147, 0, 10, 0.25)',
              border: '1px solid rgba(255, 180, 171, 0.35)',
              borderRadius: 10,
              padding: '10px 14px',
              color: '#ffb4ab',
              fontSize: 12,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── STEP 1: REQUEST OTP ────────────────────────────────────── */}
        {step === 'request' && (
          <form onSubmit={handleRequestOtp}>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(197,197,212,0.85)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}
              >
                Username or Employee ID
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="e.g. test_user_1 or dev_initiator"
                required
                disabled={isLoading}
                autoFocus
                style={{
                  width: '100%',
                  background: 'rgba(8, 10, 30, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  color: '#f1f3f5',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !identifier.trim()}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: 12,
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: 'linear-gradient(135deg, #6A7BD9 0%, #5263c9 100%)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(106, 123, 217, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {isLoading ? 'Dispatching OTP...' : 'Send Verification Code →'}
            </button>
          </form>
        )}

        {/* ── STEP 2: VERIFY OTP ─────────────────────────────────────── */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: 'rgba(197,197,212,0.85)',
                    textTransform: 'uppercase',
                  }}
                >
                  6-Digit Verification Code
                </span>
              </div>

              {/* 6 Digit Input Boxes */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => (otpInputsRef.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    disabled={isLoading}
                    autoFocus={idx === 0}
                    style={{
                      width: 50,
                      height: 52,
                      textAlign: 'center',
                      fontSize: 20,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      background: 'rgba(8, 10, 30, 0.9)',
                      border: digit
                        ? '1px solid #6A7BD9'
                        : '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 10,
                      color: '#f8f9fa',
                      outline: 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.join('').length !== 6}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: 12,
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: 'linear-gradient(135deg, #6A7BD9 0%, #5263c9 100%)',
                color: '#fff',
                marginBottom: 12,
              }}
            >
              {isLoading ? 'Verifying...' : 'Verify Code & Proceed →'}
            </button>

            {/* Resend button */}
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => handleRequestOtp()}
                disabled={isLoading || cooldownSeconds > 0}
                style={{
                  background: 'none',
                  border: 'none',
                  color: cooldownSeconds > 0 ? 'rgba(197,197,212,0.45)' : '#bac3ff',
                  cursor: cooldownSeconds > 0 ? 'not-allowed' : 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  textDecoration: 'underline',
                }}
              >
                {cooldownSeconds > 0
                  ? `Resend code in ${cooldownSeconds}s`
                  : 'Didn’t receive code? Resend Code'}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3: RESET PASSWORD ─────────────────────────────────── */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(197,197,212,0.85)',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                New Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                disabled={isLoading}
                autoFocus
                style={{
                  width: '100%',
                  background: 'rgba(8, 10, 30, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  color: '#f1f3f5',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(197,197,212,0.85)',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Confirm Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  background: 'rgba(8, 10, 30, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  color: '#f1f3f5',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Visibility Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <input
                id="showPassToggle"
                type="checkbox"
                checked={showPasswords}
                onChange={e => setShowPasswords(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label
                htmlFor="showPassToggle"
                style={{ fontSize: 12, color: 'rgba(197,197,212,0.7)', cursor: 'pointer' }}
              >
                Show password characters
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: 12,
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: 'linear-gradient(135deg, #04D98B 0%, #00995c 100%)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(4, 217, 139, 0.35)',
              }}
            >
              {isLoading ? 'Updating Password...' : 'Reset Password & Finish ✓'}
            </button>
          </form>
        )}

        {/* ── STEP 4: SUCCESS CONFIRMATION ───────────────────────────── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{ fontSize: 14, color: 'rgba(197,197,212,0.9)', marginBottom: 24 }}>
              Your password has been updated successfully. All previous active sessions have been terminated.
            </p>
            <button
              type="button"
              onClick={() => {
                if (onSuccessReturn) {
                  onSuccessReturn(identifier);
                }
                onClose();
              }}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: 'linear-gradient(135deg, #6A7BD9 0%, #5263c9 100%)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(106, 123, 217, 0.35)',
              }}
            >
              Back to Sign In →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
