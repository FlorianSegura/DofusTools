import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

/**
 * Get the current session on the server side
 * @returns {Promise<Session|null>} The session object or null if not authenticated
 */
export async function getSession() {
  return await getServerSession(authOptions)
}

/**
 * Check if a user is authenticated
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export async function isAuthenticated() {
  const session = await getSession()
  return !!session?.user
}

/**
 * Require authentication for API routes
 * Returns the session if authenticated, throws an error otherwise
 * @returns {Promise<Session>} The session object
 * @throws {Error} If not authenticated
 */
export async function requireAuth() {
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  return session
}

/**
 * Middleware helper for API routes that require authentication
 * Usage in API route:
 *
 * export async function POST(request) {
 *   try {
 *     const session = await requireAuth()
 *     // Your protected logic here
 *   } catch (error) {
 *     return new Response(JSON.stringify({ error: 'Unauthorized' }), {
 *       status: 401,
 *       headers: { 'Content-Type': 'application/json' }
 *     })
 *   }
 * }
 */
export function withAuth(handler) {
  return async function(request, ...args) {
    try {
      const session = await requireAuth()
      return await handler(request, session, ...args)
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.message || 'Unauthorized',
          authenticated: false
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}
