import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import speakeasy from 'speakeasy';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, token } = body;
    if (!userId || !token) return NextResponse.json({ error: 'userId and token required' }, { status: 400 });

    const res = await pool.query('SELECT settings FROM users WHERE userid = $1', [userId]);
    const settings = res.rows[0]?.settings || {};

    const pending = settings?.twoFactor?.pending;
    const existing = settings?.twoFactor?.enabled;

    // First: check for an emailed one-time code
    const emailCodeObj = settings?.twoFactor?.emailCode;
    if (emailCodeObj) {
      const now = new Date();
      const exp = new Date(emailCodeObj.expires);
      if (now <= exp && token === String(emailCodeObj.code)) {
        // consume code
        const newSettings = { ...(settings || {}) };
        if (newSettings.twoFactor) newSettings.twoFactor.emailCode = null;
        await pool.query('UPDATE users SET settings = $1 WHERE userid = $2', [newSettings, userId]);
        // Issue final JWT
        const userRes = await pool.query('SELECT userid, companyid, username, roleid FROM users WHERE userid = $1', [userId]);
        const user = userRes.rows[0] || {};
        const roleRes = await pool.query('SELECT rolename FROM roles WHERE roleid = $1', [user.roleid]);
        const role = roleRes.rows[0]?.rolename || null;
        const jwtToken = jwt.sign({ userid: user.userid, companyid: user.companyid, role, username: user.username }, process.env.JWT_SECRET!, { expiresIn: '1h' });
        return NextResponse.json({ verified: true, token: jwtToken });
      }
      // fallthrough to TOTP check if code mismatches or expired
    }

    if (!pending && !existing) return NextResponse.json({ error: 'no 2FA setup found' }, { status: 400 });

    const secret = (existing && existing.base32) || (pending && pending.base32);
    const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });

    if (!verified) return NextResponse.json({ verified: false }, { status: 200 });

    // move pending to enabled
    const newSettings = { ...(settings || {}) };
    newSettings.twoFactor = { enabled: { base32: secret }, pending: null };
    await pool.query('UPDATE users SET settings = $1 WHERE userid = $2', [newSettings, userId]);

    // Issue final JWT for the user
    const userRes = await pool.query('SELECT userid, companyid, username, roleid FROM users WHERE userid = $1', [userId]);
    const user = userRes.rows[0] || {};
    const roleRes = await pool.query('SELECT rolename FROM roles WHERE roleid = $1', [user.roleid]);
    const role = roleRes.rows[0]?.rolename || null;
    const jwtToken = jwt.sign({ userid: user.userid, companyid: user.companyid, role, username: user.username }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    return NextResponse.json({ verified: true, token: jwtToken });
  } catch (err: any) {
    console.error('2FA verify error', err);
    return NextResponse.json({ error: err?.message || 'internal error' }, { status: 500 });
  }
}
