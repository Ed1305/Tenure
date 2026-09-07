import { safeEqual, setSessionCookie, clearSessionCookie } from './_lib.js';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {           // sign out
    clearSessionCookie(res);
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expected = process.env.ADMIN_CODE;
  if (!expected || !process.env.SESSION_SECRET) {
    return res.status(500).json({ error: 'Server not configured: ADMIN_CODE and SESSION_SECRET must be set.' });
  }

  const code = (req.body && req.body.code) || '';
  if (!safeEqual(code, expected)) {
    await new Promise(r => setTimeout(r, 400));    // blunt the brute force
    return res.status(401).json({ error: 'Invalid access code' });
  }

  setSessionCookie(res);
  return res.status(200).json({ ok: true });
}
