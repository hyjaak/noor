# Persistence setup

Phase 9 requires a Supabase project before the database or authenticated journey can run. Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL`: Supabase pooled transaction connection string, port 6543, with `pgbouncer=true`.
- `DIRECT_URL`: Supabase direct connection string, port 5432, used only for migrations.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase Auth client settings.

Then run:

```text
npm run db:generate
npm run db:migrate -- --name initial
npm run db:studio
```

The app intentionally returns configuration/auth errors rather than falling back to the previous demo or in-memory data. The Supabase project URL, password, and keys are not checked into this repository.