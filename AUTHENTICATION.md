# Authentication & Protected Routes

This application uses **NextAuth.js** with Google OAuth and **Prisma** in serverless mode.

## Architecture Overview

### Database Configuration

- **Serverless Mode**: Using Neon PostgreSQL with connection pooling (PgBouncer)
- **ORM**: Prisma Client with optimized singleton pattern
- **Connection**: Only pooled connections are used (no direct connections)

### Authentication System

- **Provider**: Google OAuth 2.0
- **Session Management**: Database sessions via Prisma Adapter
- **Protected Routes**: Middleware-based authentication for API routes

## Key Files

### Authentication Configuration

- `src/app/api/auth/[...nextauth]/route.js` - NextAuth configuration
- `src/lib/auth.js` - Authentication helpers and middleware
- `src/lib/prisma.js` - Prisma Client singleton for serverless

### Environment Variables

```env
DATABASE_URL="postgresql://..." # Neon pooled connection
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..." # Generate with: openssl rand -base64 32
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

## Usage

### Protecting API Routes

Use the `withAuth` middleware to protect API routes that modify data:

```javascript
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const POST = withAuth(async (request, session) => {
  // This code only runs if user is authenticated
  // session.user contains user information

  const data = await request.json()

  const result = await prisma.model.create({
    data: {
      ...data,
      userId: session.user.id
    }
  })

  return Response.json({ success: true, data: result })
})
```

### Manual Authentication Check

For more control, use the authentication helpers directly:

```javascript
import { requireAuth, getSession } from '@/lib/auth'

export async function POST(request) {
  try {
    const session = await requireAuth()
    // User is authenticated
  } catch (error) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}
```

### Getting Session in Server Components

```javascript
import { getSession } from '@/lib/auth'

export default async function Page() {
  const session = await getSession()

  if (!session?.user) {
    return <div>Please log in</div>
  }

  return <div>Hello {session.user.name}</div>
}
```

## Security Model

### Read Operations (Public)
- No authentication required
- Anyone can query data

### Write Operations (Protected)
- **CREATE**: Requires authentication
- **UPDATE**: Requires authentication
- **DELETE**: Requires authentication

All mutations must go through authenticated API routes that use `withAuth` middleware or manual `requireAuth()` checks.

## Database Schema

The authentication tables are managed by Prisma:

- `User` - User profiles
- `Account` - OAuth account linking
- `Session` - Active sessions
- `VerificationToken` - Email verification tokens

See `prisma/schema.prisma` for full schema definition.

## Development

### Running Locally

1. Start development server: `npm run dev`
2. Database changes: Update `prisma/schema.prisma` then run `npx prisma db push`
3. Generate Prisma Client: `npx prisma generate`

### Testing Authentication

1. Visit http://localhost:3000
2. Click "Sign in with Google"
3. After authentication, try protected endpoints
4. Non-authenticated requests to protected routes will receive 401 responses

## Deployment (Vercel)

The app is configured for Vercel deployment with:

- **Automatic deployments** from GitHub
- **Environment variables** set in Vercel dashboard
- **Serverless functions** for API routes
- **Edge-compatible** Prisma configuration

Ensure all environment variables are set in Vercel project settings.
