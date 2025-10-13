import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// Force dynamic rendering (disable static optimization)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/test
 * Public route - Returns test data (read-only, no auth required)
 */
export async function GET() {
  try {
    const session = await getSession()

    // Example: Query using Prisma
    // const result = await prisma.test.findMany({ take: 10 })

    return Response.json({
      success: true,
      message: 'Test endpoint working',
      authenticated: !!session?.user,
      user: session?.user || null,
      // data: result,
    })
  } catch (error) {
    console.error('Database error:', error)
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
