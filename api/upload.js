import { sql, isAdmin, MONTH_RE, publicError } from './_lib.js';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

const CHUNK = 200;
const MAX_ROWS = 5000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin access required' });

  const month = String((req.body && req.body.month) || '').trim();
  const employees = (req.body && req.body.employees) || null;

  if (!MONTH_RE.test(month)) return res.status(400).json({ error: 'month must look like 2026-02' });
  if (!Array.isArray(employees) || employees.length === 0) return res.status(400).json({ error: 'No employees supplied' });
  if (employees.length > MAX_ROWS) return res.status(413).json({ error: `Too many rows (${employees.length})` });
  if (employees.some(e => !e || !e.branch || !e.emp_code)) return res.status(400).json({ error: 'Every row needs a branch and an emp_code' });

  const branches = [...new Set(employees.map(e => String(e.branch)))];

  // Delete + insert run as ONE transaction, so a failed insert can no longer
  // leave the month empty the way the old delete-then-insert could.
  const statements = branches.map(b => sql`delete from employees where month = ${month} and branch = ${b}`);

  for (let i = 0; i < employees.length; i += CHUNK) {
    const c = employees.slice(i, i + CHUNK);
    statements.push(sql`
      insert into employees (month, branch, emp_code, name, start_date, team, status, end_date, tenure_days, tenure_months)
      select * from unnest(
        ${c.map(() => month)}::text[],
        ${c.map(e => String(e.branch))}::text[],
        ${c.map(e => String(e.emp_code))}::text[],
        ${c.map(e => String(e.name ?? ''))}::text[],
        ${c.map(e => e.start_date ?? null)}::date[],
        ${c.map(e => e.team ?? null)}::text[],
        ${c.map(e => e.status ?? null)}::text[],
        ${c.map(e => e.end_date ?? null)}::date[],
        ${c.map(e => e.tenure_days ?? null)}::int[],
        ${c.map(e => e.tenure_months ?? null)}::numeric[]
      )`);
  }

  try {
    await sql.transaction(statements);
    return res.status(200).json({ ok: true, month, inserted: employees.length, branches });
  } catch (err) {
    console.error('upload:', err);
    return res.status(500).json({ error: 'Upload failed, nothing was changed: ' + publicError(err, 'database error') });
  }
}
