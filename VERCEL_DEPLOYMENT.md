# Vercel Deployment Guide

## Prerequisites

Before deploying to Vercel, ensure you have:
1. ✅ A working Neon PostgreSQL database
2. ✅ Google OAuth credentials configured
3. ✅ All code pushed to GitHub

## Step 1: Configure Environment Variables in Vercel

Go to your Vercel project settings and add these environment variables:

### Database
```env
DATABASE_URL=postgresql://your-user:your-password@your-host-pooler.region.aws.neon.tech/your-database?sslmode=require&pgbouncer=true
```

**Important**: Use the **pooled connection string** from Neon (with `-pooler` in the hostname).

### NextAuth
```env
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-secret-here
```

**Generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```

### Google OAuth
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Step 2: Update Google OAuth Authorized Redirect URIs

1. Go to https://console.cloud.google.com
2. Navigate to **APIs & Services** > **Credentials**
3. Select your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```
5. **Save** changes

## Step 3: Initialize Database on Neon

Before deploying, make sure your Neon database has the required tables:

### Option A: Using Prisma Migrate (Recommended)
```bash
npx prisma migrate dev --name init
npx prisma migrate deploy
```

### Option B: Using Prisma DB Push
```bash
npx prisma db push
```

This will create all the NextAuth tables (`User`, `Account`, `Session`, `VerificationToken`).

## Step 4: Deploy to Vercel

### Via Vercel Dashboard
1. Go to https://vercel.com
2. Click **"New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js
5. Click **"Deploy"**

### Via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel
```

## Step 5: Verify Deployment

After deployment:

1. **Check build logs** for any errors
2. **Visit your app** at `https://your-app.vercel.app`
3. **Test authentication**:
   - Click "Sign in with Google"
   - Authenticate
   - Verify your profile appears
4. **Test protected routes**:
   - Try accessing `/api/test/update` without auth (should get 401)
   - Sign in and try again (should work)

## Troubleshooting

### Build Error: "Failed to collect page data"

**Cause**: API routes trying to access database during build.

**Solution**: Ensure all API routes have:
```javascript
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
```

### Database Connection Error

**Cause**: Neon database is paused or connection string is incorrect.

**Solutions**:
1. Check that your Neon database is active (not paused)
2. Verify `DATABASE_URL` in Vercel environment variables
3. Use the **pooled connection** string (with `-pooler`)
4. Ensure `?sslmode=require&pgbouncer=true` is in the connection string

### OAuth Redirect Mismatch

**Cause**: Redirect URI not configured in Google Console.

**Solution**:
1. Add `https://your-app.vercel.app/api/auth/callback/google` to Google OAuth
2. Make sure `NEXTAUTH_URL` matches your Vercel URL exactly

### Prisma Client Error

**Cause**: Prisma client not generated or wrong provider.

**Solution**:
1. Check `prisma/schema.prisma` uses `provider = "postgresql"`
2. Ensure `@db.Text` is used for large text fields in Account model
3. Vercel will run `prisma generate` automatically during build

## Local vs Production Configuration

### Local Development (SQLite)
For local development, you can use SQLite by creating a `.env.local`:

```env
# .env.local (not committed to git)
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
```

And temporarily changing `schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

**Remember**: Remove `@db.Text` from Account model for SQLite.

### Production (PostgreSQL)
Keep the main configuration for PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

With `@db.Text` on `refresh_token`, `access_token`, and `id_token` in Account model.

## Post-Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Google OAuth redirect URI updated
- [ ] Neon database is active and tables created
- [ ] Deployment successful (no build errors)
- [ ] Homepage loads correctly
- [ ] Google authentication works
- [ ] Protected routes return 401 when not authenticated
- [ ] Protected routes work when authenticated

## Monitoring

### Vercel Logs
- Go to your project in Vercel dashboard
- Click on **"Deployments"**
- Select latest deployment
- View **"Functions"** logs to see runtime errors

### Database Monitoring
- Check Neon dashboard for query performance
- Monitor connection pool usage
- Review slow queries

## Scaling Considerations

### Connection Pooling
Vercel serverless functions can create many connections. Ensure:
- Using Neon pooled connection (with `-pooler`)
- `pgbouncer=true` in connection string
- Prisma client uses singleton pattern (already configured)

### Cold Starts
- First request after inactivity may be slow
- Keep critical pages as static when possible
- Use Vercel Edge Functions for faster cold starts if needed

## Rolling Back

If deployment fails:
1. Go to Vercel dashboard
2. Navigate to **"Deployments"**
3. Find previous working deployment
4. Click **"..."** → **"Promote to Production"**

## Continuous Deployment

Vercel automatically deploys on:
- **Push to main branch** → Production deployment
- **Pull request** → Preview deployment

Configure in **Settings** → **Git** if needed.

## Support

- Vercel: https://vercel.com/support
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- NextAuth: https://next-auth.js.org/getting-started/introduction
- Neon: https://neon.tech/docs/introduction
