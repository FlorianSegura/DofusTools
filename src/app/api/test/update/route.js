import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

/**
 * POST /api/test/update
 * Protected route - Requires authentication to modify data
 */
export const POST = withAuth(async (request, session) => {
  try {
    const { id, value } = await request.json()

    if (!id || value === undefined) {
      return Response.json({
        success: false,
        error: 'Missing id or value'
      }, { status: 400 })
    }

    // Example: Update using Prisma
    // const result = await prisma.test.update({
    //   where: { id },
    //   data: { test_column: value }
    // })

    return Response.json({
      success: true,
      message: 'Update endpoint working (protected)',
      user: session.user,
      data: { id, value }
      // data: result
    })
  } catch (error) {
    console.error('Database update error:', error)
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
})
