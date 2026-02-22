import { PrismaClient } from '@prisma/client';

/**
 * Database client singleton
 */
let prisma: PrismaClient | null = null;

export function getDatabase(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
      errorFormat: 'pretty',
    });

    // Graceful shutdown
    const cleanup = async () => {
      if (prisma) {
        await prisma.$disconnect();
        prisma = null;
      }
    };

    process.on('beforeExit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  return prisma;
}

export function resetDatabase(): void {
  if (prisma) {
    prisma.$disconnect();
    prisma = null;
  }
}

export { PrismaClient };
