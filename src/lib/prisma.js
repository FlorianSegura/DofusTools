import { PrismaClient } from '@prisma/client'

const globalForPrisma = global

// Create Prisma Client optimized for serverless/edge with connection pooling
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

// Singleton pattern to prevent connection exhaustion in serverless
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Helper to disconnect in serverless environments
export async function disconnectPrisma() {
  await prisma.$disconnect()
}
