import { sql } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    // Distinct months only - the old client pulled every row's month to work this out.
    const rows = await sql`select distinct month from employees order by month desc`;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ months: rows.map(r => r.month) });
  } catch (err) {
    console.error('months:', err);
    return res.status(500).json({ error: 'Could not load months' });
  }
}
