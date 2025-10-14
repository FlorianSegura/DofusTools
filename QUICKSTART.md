# 🚀 Quick Start

## 1. Créer Supabase Project (5 min)

1. Aller sur https://supabase.com → Sign up
2. New Project
3. Attendre provisioning (2-3 min)
4. Project Settings → API
5. Copier **Project URL** et **anon public key**

## 2. Google OAuth (3 min)

**Dans Supabase:**
1. Authentication → Providers
2. Activer Google
3. Noter le **Callback URL** (ex: https://xxx.supabase.co/auth/v1/callback)

**Dans Google Console:**
1. https://console.cloud.google.com
2. APIs & Services → Credentials
3. Create OAuth 2.0 Client
4. Authorized redirect URI: coller le Callback URL Supabase
5. Copier Client ID + Secret
6. Les coller dans Supabase

## 3. Configuration (.env)

```env
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."
```

## 4. Lancer

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000

## ✅ Ça marche quand

- Page redirige vers `/login`
- Bouton "Sign in with Google" visible
- Clic → Popup Google OAuth
- Authentification → Retour sur `/` avec profil

## Documentation complète

- `SETUP.md` - Guide détaillé
- `README.md` - Features et tech stack
- `MIGRATION.md` - Changements effectués
