import { sql, MONTH_RE } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const month = String(req.query.month || '').trim();
  if (!MONTH_RE.test(month)) return res.status(400).json({ error: 'month must look like 2026-02' });
  try {
    // Dates are cast to text in SQL so they cannot drift a day through JS Date parsing.
    const rows = await sql`
      select emp_code, name, branch, team, status, month,
             to_char(start_date, 'YYYY-MM-DD') as start_date,
             to_char(end_date,   'YYYY-MM-DD') as end_date,
             tenure_days, tenure_months
      from employees
      where month = ${month}
      order by branch, team, name`;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ employees: rows });
  } catch (err) {
    console.error('employees:', err);
    return res.status(500).json({ error: 'Could not load data' });
  }
}
