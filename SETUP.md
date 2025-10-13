# Dofus Tools - Setup Instructions

## Current Status

### Completed Tasks
- ✅ **GitHub Repository**: Local git repository initialized
- ✅ **Next.js Stack**: Fully configured with React 18, Tailwind CSS, and Prisma
- ⚠️ **Database**: Prisma schema created, but database connection pending
- ⚠️ **Login System**: NextAuth configured with Google OAuth (needs credentials)

## Next Steps to Complete Setup

### 1. Create GitHub Remote Repository

1. Go to https://github.com/new
2. Create a repository named `DofusTools` (or your preferred name)
3. Don't initialize with README
4. After creation, connect it locally:

```bash
git remote add origin https://github.com/FlorianSegura/DofusTools.git
git branch -M main
git push -u origin main
```

### 2. Fix Database Connection (Neon)

The database connection is currently failing. Please check:

1. Go to https://console.neon.tech/
2. Navigate to your project
3. Look for **both** connection strings:
   - **Pooled connection** (what you provided)
   - **Direct connection** (might work better)
4. Verify the database is active
5. Try the direct connection string instead

Once you have the correct connection string, update `.env` file and run:

```bash
npx prisma db push
```

### 3. Set Up Google OAuth

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Enable "Google+ API"
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure consent screen if needed
6. Application type: **Web application**
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-vercel-domain.vercel.app/api/auth/callback/google` (after deployment)
8. Copy the **Client ID** and **Client Secret**
9. Update `.env` file:

```env
GOOGLE_CLIENT_ID="your-client-id-here"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
```

### 4. Test Locally

Once steps 2 and 3 are complete:

```bash
npm run dev
```

Visit http://localhost:3000 and test:
- Navigation works
- Sign in with Google
- User profile displays in sidebar

### 5. Deploy to Vercel

1. Go to https://vercel.com/
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables in Vercel:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (your Vercel domain, e.g., `https://dofus-tools.vercel.app`)
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
5. Deploy!
6. Remember to add your Vercel domain to Google OAuth authorized redirect URIs

## Project Structure

```
DofusTools/
├── src/
│   ├── app/
│   │   ├── api/auth/[...nextauth]/    # NextAuth API routes
│   │   ├── auth/signin/               # Custom sign-in page
│   │   ├── globals.css                # Global styles
│   │   ├── layout.jsx                 # Root layout with SessionProvider
│   │   └── page.jsx                   # Home page
│   ├── components/
│   │   ├── Sidebar.jsx                # Navigation sidebar with session
│   │   └── SessionProvider.jsx        # NextAuth session wrapper
│   └── lib/
│       └── prisma.js                  # Prisma client singleton
├── prisma/
│   └── schema.prisma                  # Database schema
├── .env                               # Environment variables (not in git)
├── .env.example                       # Example environment variables
└── package.json                       # Dependencies
```

## Database Schema

The Prisma schema includes:
- **User**: Main user table with email, name, image
- **Account**: OAuth account connections
- **Session**: User sessions
- **VerificationToken**: Email verification tokens

## Technologies Used

- **Next.js 14** with App Router
- **React 18** with hooks
- **NextAuth.js** for authentication
- **Prisma** as ORM
- **PostgreSQL** (Neon) as database
- **Tailwind CSS** for styling
- **Vercel** for deployment

## Troubleshooting

### Database Connection Issues
- Try the direct connection string instead of pooled
- Check if database is in sleep mode (free tier)
- Verify SSL settings in connection string

### Google OAuth Issues
- Ensure redirect URIs match exactly
- Check if Google+ API is enabled
- Verify credentials are copied correctly

### Build Issues
- Run `npm install` to ensure all dependencies are installed
- Clear `.next` folder: `rm -rf .next`
- Try `npm run build` to check for build errors

## Support

For issues or questions, create an issue in the GitHub repository once it's pushed.
