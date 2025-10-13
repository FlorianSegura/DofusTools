# Database Setup Guide

This guide explains how to configure the database for different environments.

## Current Setup: SQLite (Local Development)

The project is currently configured to use **SQLite** for local development. This allows you to develop without depending on external database services.

### Benefits of SQLite for Development
- ✅ No network connectivity required
- ✅ Zero configuration
- ✅ Fast and lightweight
- ✅ Perfect for testing authentication and features locally

### Location
- Database file: `prisma/dev.db`
- Automatically created when you run `npx prisma db push`

## Switching to PostgreSQL (Neon) for Production

When you're ready to deploy or connect to Neon PostgreSQL:

### Step 1: Update Prisma Schema

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 2: Update Environment Variables

Update `.env` with your Neon connection string:

```env
DATABASE_URL="postgresql://user:password@host-pooler.region.aws.neon.tech/database?sslmode=require&pgbouncer=true"
```

### Step 3: Update Account Model

PostgreSQL supports larger text fields. Update the `Account` model in `prisma/schema.prisma`:

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text  // Add @db.Text for PostgreSQL
  access_token      String? @db.Text  // Add @db.Text for PostgreSQL
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text  // Add @db.Text for PostgreSQL
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}
```

### Step 4: Push Schema to Neon

```bash
npx prisma db push
```

### Step 5: Regenerate Prisma Client

```bash
npx prisma generate
```

## Multi-Environment Setup (Advanced)

For production deployments, you can use environment-specific configurations:

### Development (.env.development)
```env
DATABASE_URL="file:./dev.db"
```

### Production (.env.production)
```env
DATABASE_URL="postgresql://..."
```

### Conditional Schema (Alternative Approach)

You can use environment variables in the schema:

```prisma
datasource db {
  provider = env("DATABASE_PROVIDER")
  url      = env("DATABASE_URL")
}
```

Then in `.env`:
```env
DATABASE_PROVIDER="sqlite"
DATABASE_URL="file:./dev.db"
```

For production in Vercel:
```env
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgresql://..."
```

## Troubleshooting Neon Connection

If you can't connect to Neon:

### 1. Check Database Status
- Go to https://console.neon.tech
- Verify your database is **Active** (not paused)
- Click "Wake up" if it's in sleep mode

### 2. Verify Connection String
- Get the **pooled connection** string (with `-pooler` in the hostname)
- Ensure `?sslmode=require&pgbouncer=true` is included

### 3. Test Connectivity
```bash
# Test if port 5432 is reachable
powershell Test-NetConnection -ComputerName your-host-pooler.region.aws.neon.tech -Port 5432
```

### 4. Check Firewall
- Ensure port 5432 is not blocked by your firewall
- Try connecting from a different network

### 5. Verify Credentials
- Username and password are correct
- Database name matches your Neon project

## Current Status

- ✅ **Local Development**: SQLite (working)
- ⚠️ **Neon PostgreSQL**: Connection issues detected
  - Port 5432 not reachable
  - Database may be paused or network blocked

## Recommendations

1. **For local development**: Continue using SQLite (current setup)
2. **For deployment**: Fix Neon connectivity before deploying
3. **Alternative**: Use Railway, Supabase, or another PostgreSQL provider if Neon issues persist

## Testing Authentication

With SQLite, you can now test:
```bash
npm run dev
```

1. Visit http://localhost:3000
2. Sign in with Google
3. All authentication features will work with local SQLite database
4. When ready, switch to PostgreSQL for production deployment
