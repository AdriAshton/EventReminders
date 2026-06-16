"use client";

import React, { useState } from 'react';

export default function TwoFactorSettings() {
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState('1');
  const [adminEnabled, setAdminEnabled] = useState<boolean | null>(null);
  const [required, setRequired] = useState<boolean | null>(null);

  async function handleSetup() {
    setMessage(null);
    const res = await fetch('/api/auth/2fa/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
    const j = await res.json();
    if (j.base32) {
      setSecret(j.base32);
      setOtpauth(j.otpauth_url || null);
    } else if (j.error) setMessage(j.error);
  }

  async function fetchSettings() {
    try {
      const res = await fetch('/api/users/settings');
      if (!res.ok) return;
      const j = await res.json();
      const s = j.settings || {};
      setAdminEnabled(!!s?.twoFactor?.adminEnabled);
      setRequired(!!s?.twoFactor?.required);
    } catch (e) { /* ignore */ }
  }

  async function toggleAdmin(enable: boolean) {
    setMessage(null);
    const res = await fetch(`/api/admin/users/${userId}/2fa`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminEnabled: enable }) });
    const j = await res.json();
    if (res.ok) {
      setAdminEnabled(enable);
      setMessage(j.message || 'Updated');
    } else setMessage(j.error || 'Error');
  }

  async function handleVerify() {
    setMessage(null);
    const res = await fetch('/api/auth/2fa/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, token }) });
    const j = await res.json();
    if (j.verified) setMessage('2FA enabled successfully');
    else setMessage('Invalid token');
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Two-Factor Authentication (TOTP)</h1>

      <label style={{ display: 'block', marginBottom: 8, color: '#fff' }}>User ID (for testing)</label>
      <input value={userId} onChange={(e) => setUserId(e.target.value)} style={{ padding: 10, width: 220, marginBottom: 16, background: '#111', color: '#fff', border: '1px solid #444', borderRadius: 6 }} />

      <div style={{ marginBottom: 16 }}>
        <button onClick={handleSetup} style={{ padding: '10px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Generate 2FA Secret</button>
        <button onClick={() => toggleAdmin(true)} style={{ padding: '10px 14px', marginLeft: 8, background: '#f57c00', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Enable (admin)</button>
        <button onClick={() => toggleAdmin(false)} style={{ padding: '10px 14px', marginLeft: 8, background: '#9e9e9e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Disable (admin)</button>
        <button onClick={fetchSettings} style={{ padding: '10px 14px', marginLeft: 8, background: '#1565c0', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Refresh</button>
      </div>

      {secret && (
        <div style={{ marginBottom: 16 }}>
          <div><strong>Secret (base32):</strong></div>
          <input readOnly value={secret} style={{ width: 420, padding: 10, marginTop: 6, background: '#111', color: '#fff', border: '1px solid #444', borderRadius: 6 }} />
        </div>
      )}

      {otpauth && (
        <div style={{ marginBottom: 16 }}>
          <div><strong>otpauth URL (for QR apps):</strong></div>
          <input readOnly value={otpauth} style={{ width: 720, padding: 10, marginTop: 6, background: '#111', color: '#fff', border: '1px solid #444', borderRadius: 6 }} />
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>Verification code</label>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter the 6-digit code"
          style={{ padding: 10, width: 220, background: '#111', color: '#fff', border: '1px solid #444', borderRadius: 6 }}
        />
        <div style={{ marginTop: 8 }}>
          <button onClick={handleVerify} style={{ padding: '10px 14px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Verify & Enable</button>
        </div>
      </div>

      {message && <div style={{ marginTop: 12 }}>{message}</div>}
      {adminEnabled !== null && <div style={{ marginTop: 8 }}>Admin Enabled: {adminEnabled ? 'Yes' : 'No'}</div>}
      {required !== null && <div>Required: {required ? 'Yes' : 'No'}</div>}
    </main>
  );
}
