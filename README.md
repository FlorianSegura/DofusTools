# Dofus Tools

Next.js application with Supabase authentication and Google OAuth.

## Quick Start

### 1. Create Supabase Project
- Go to https://supabase.com
- Create new project
- Get API credentials from Project Settings → API

### 2. Setup Google OAuth in Supabase
- Go to Authentication → Providers
- Enable Google
- Add Google OAuth credentials
- Redirect URI: `https://your-project.supabase.co/auth/v1/callback`

### 3. Install & Configure
```bash
npm install
```

Create `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL="your-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### 4. Run
```bash
npm run dev
```

## Features
- ✅ Google OAuth via Supabase
- ✅ Protected routes
- ✅ PostgreSQL database
- ✅ Session management
- ✅ Tailwind CSS

## Tech Stack
- Next.js 13
- Supabase (Auth + DB)
- Tailwind CSS
