import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import TestDataEditor from '@/components/TestDataEditor'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await getSession()
  let testData = []
  let error = null

  // Example: Fetch data using Prisma
  // Uncomment when you have a 'test' table in your schema
  // try {
  //   testData = await prisma.test.findMany({
  //     orderBy: { id: 'asc' },
  //     take: 10
  //   })
  // } catch (err) {
  //   error = err.message
  //   console.error('Database error:', err)
  // }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Welcome to Dofus Tools</h1>
        <p className="text-lg text-gray-600">
          Your comprehensive toolkit for Dofus game management.
        </p>
      </div>

      {/* Authentication Status */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
        {session?.user ? (
          <div className="flex items-center gap-3">
            {session.user.image && (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="text-green-600 font-semibold">Logged in as {session.user.name}</p>
              <p className="text-sm text-gray-600">{session.user.email}</p>
            </div>
          </div>
        ) : (
          <p className="text-amber-600">You are not logged in. Some features require authentication.</p>
        )}
      </div>

      {/* Database Test Section */}
      <div className="border-t pt-6">
        <h2 className="text-2xl font-bold mb-4">Database Test - Protected Mutations</h2>

        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error connecting to database:</p>
            <p>{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              <p className="font-bold">Database configured with Prisma (serverless mode)</p>
              <p>Data modifications require authentication. {session?.user ? 'You can edit data.' : 'Please log in to edit.'}</p>
            </div>

            {testData.length > 0 && <TestDataEditor initialData={testData} />}
          </div>
        )}
      </div>
    </div>
  )
}
