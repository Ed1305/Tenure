-- Tenure dashboard schema for Neon (run once, in the Demographics Neon project).
create table if not exists employees (
  id            bigserial primary key,
  month         text    not null,
  branch        text    not null,
  emp_code      text    not null,
  name          text    not null default '',
  start_date    date,
  team          text,
  status        text,
  end_date      date,
  tenure_days   integer,
  tenure_months numeric,
  created_at    timestamptz not null default now()
);

create index if not exists employees_month_idx        on employees (month);
create index if not exists employees_month_branch_idx on employees (month, branch);

-- Stops the same person being imported twice into one month/branch.
create unique index if not exists employees_month_branch_code_uidx
  on employees (month, branch, emp_code);
