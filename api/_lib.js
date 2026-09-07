// Shared helpers for the tenure API.
// The Neon connection string never reaches the browser - it lives only in the
// Vercel environment, which is the whole point of moving off the anon key.
import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

export const sql = neon(process.env.DATABASE_URL);

const COOKIE = 'tenure_admin';
const TTL_MS = 8 * 60 * 60 * 1000;   // admin session lasts a working day

function mac(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// Constant-time compare that does not leak length via an exception.
export function safeEqual(a, b) {
  const ba = Buffer.from(String(a), 'utf8');
  const bb = Buffer.from(String(b), 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function isAdmin(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const jar = req.headers.cookie || '';
  const hit = jar.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  if (!hit) return false;
  const [payload, sig] = decodeURIComponent(hit.slice(COOKIE.length + 1)).split('.');
  if (!payload || !sig) return false;
  if (!safeEqual(sig, mac(payload, secret))) return false;
  return Number(payload) > Date.now();          // expired cookies are not admin
}

export function setSessionCookie(res) {
  const secret = process.env.SESSION_SECRET;
  const expires = Date.now() + TTL_MS;
  const token = `${expires}.${mac(String(expires), secret)}`;
  res.setHeader('Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${Math.floor(TTL_MS / 1000)}`);
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
}

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
