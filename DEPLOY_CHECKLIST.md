# 🚀 Deployment Checklist

## ✅ Changes Made for Production

### 1. Prisma Schema Updated
- ✅ Changed from SQLite to PostgreSQL
- ✅ Added `@db.Text` annotations for large fields
- ✅ Ready for Neon database

### 2. API Routes Fixed
- ✅ Added `export const dynamic = 'force-dynamic'` to all API routes
- ✅ Added `export const runtime = 'nodejs'` to ensure server-side execution
- ✅ Build now succeeds without database errors

### 3. Documentation Created
- ✅ [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) - Complete deployment guide
- ✅ [.env.example](.env.example) - Environment variables template

## 📋 Pre-Deployment Checklist

Before pushing to GitHub and deploying to Vercel:

### Database Setup
- [ ] Neon database is created and active
- [ ] Connection string obtained (pooled, with `-pooler`)
- [ ] Database tables created with `npx prisma db push`

### Google OAuth Setup
- [ ] Production redirect URI added to Google Console:
  ```
  https://your-app.vercel.app/api/auth/callback/google
  ```

### Code Changes
- [x] Prisma schema uses PostgreSQL
- [x] API routes have `dynamic = 'force-dynamic'`
- [x] Local build passes: `npm run build` ✓
- [ ] Changes committed to Git
- [ ] Changes pushed to GitHub

## 🔧 Vercel Environment Variables

Add these in Vercel Project Settings → Environment Variables:

```env
DATABASE_URL=postgresql://user:password@host-pooler.region.aws.neon.tech/database?sslmode=require&pgbouncer=true

NEXTAUTH_URL=https://your-app.vercel.app

NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

GOOGLE_CLIENT_SECRET=your-client-secret
```

## 🚀 Deployment Steps

### 1. Push Changes to GitHub
```bash
git add .
git commit -m "Configure for Vercel production deployment"
git push origin main
```

### 2. Configure Vercel Environment Variables
1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add all required variables (see above)
5. Apply to **Production**, **Preview**, and **Development**

### 3. Initialize Database
Before deploying, ensure your Neon database has tables:

```bash
# Use your production DATABASE_URL temporarily
DATABASE_URL="postgresql://..." npx prisma db push
```

Or connect to Neon and run:
```sql
-- Prisma will create these automatically with db push
-- Just ensure the database is accessible
```

### 4. Deploy
Vercel will automatically deploy when you push to main branch.

Or manually trigger:
1. Go to Vercel Dashboard
2. Click **"Deployments"**
3. Click **"Redeploy"** on latest deployment

### 5. Verify Deployment
- [ ] Build succeeds without errors
- [ ] Homepage loads: `https://your-app.vercel.app`
- [ ] Authentication works with Google
- [ ] Protected routes return 401 when not logged in
- [ ] Protected routes work when logged in

## 🐛 Troubleshooting

### Build Fails: "Failed to collect page data"
**Solution**: Already fixed! Routes have `dynamic = 'force-dynamic'`

### Database Connection Error
**Causes**:
- Neon database is paused → Wake it up in Neon console
- Wrong DATABASE_URL → Double-check in Vercel settings
- Missing `?sslmode=require&pgbouncer=true` → Add to connection string

**Test connection**:
```bash
# Temporarily set DATABASE_URL and test
DATABASE_URL="postgresql://..." npx prisma db push
```

### OAuth Redirect Mismatch
**Solution**:
1. Update Google Console with exact URL: `https://your-app.vercel.app/api/auth/callback/google`
2. Ensure `NEXTAUTH_URL` in Vercel matches your domain exactly

### Prisma Generate Fails
**Solution**: Vercel automatically runs `prisma generate` during build. If it fails:
- Check `prisma/schema.prisma` syntax
- Ensure `provider = "postgresql"`
- Check that `@prisma/client` is in `dependencies` (not `devDependencies`)

## 📊 Post-Deployment

### Monitor
- Check Vercel Function logs for errors
- Monitor Neon dashboard for database queries
- Test all authentication flows

### Performance
- First load may be slow (cold start)
- Subsequent requests should be fast
- Monitor Neon connection pool usage

### Security
- [ ] NEXTAUTH_SECRET is strong and unique
- [ ] Google OAuth credentials are not exposed
- [ ] Database credentials are secure
- [ ] Environment variables are not in Git

## 🔄 Development Workflow

### Local Development with SQLite
For faster local development, you can use SQLite:

1. Create `.env.local`:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   # ... other vars
   ```

2. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```

3. Remove `@db.Text` from Account model

4. Run: `npx prisma db push`

**Remember**: Don't commit SQLite changes to production!

### Switching Back to PostgreSQL
1. Restore `schema.prisma` to PostgreSQL
2. Add back `@db.Text` annotations
3. Use production DATABASE_URL
4. Run `npx prisma generate`

## ✅ Success Criteria

Your deployment is successful when:
- ✅ Build completes without errors
- ✅ App loads at your Vercel URL
- ✅ Google OAuth login works
- ✅ User profile displays after login
- ✅ Session persists across page refreshes
- ✅ Protected API routes return 401 when not authenticated
- ✅ Protected API routes work when authenticated

## 📚 Additional Resources

- [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) - Detailed deployment guide
- [AUTHENTICATION.md](AUTHENTICATION.md) - Authentication system guide
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Database configuration guide

## 🎉 Ready to Deploy!

All code changes are complete. Follow the checklist above to deploy to Vercel!
