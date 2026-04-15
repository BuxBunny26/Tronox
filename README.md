# Tronox CM Portal

## Stack
- **Frontend**: React 18 + Vite 5 + Tailwind CSS 3
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Deploy**: Netlify

## Project Structure
```
frontend/       ← Vite React app
supabase/
  migrations/   ← Run in Supabase SQL Editor in order
netlify.toml    ← Netlify deploy config
```

## Local Development

### 1. Install dependencies
```bash
cd frontend
npm install
```

### 2. Set environment variables
Create `frontend/.env.local`:
```
VITE_SUPABASE_URL=https://zdsbtfwgjvunljauiqjr.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Run dev server
```bash
cd frontend
npm run dev
```

## Database Setup
Run SQL files in Supabase SQL Editor in this order:
1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_seed.sql`
3. `supabase/migrations/003_rls.sql`

## Deploy to Netlify
1. Connect this repo to Netlify
2. Set env vars in Netlify dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Netlify auto-deploys from main branch
