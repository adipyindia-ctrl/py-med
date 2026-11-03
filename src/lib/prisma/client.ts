import 'server-only';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: pg.Pool | undefined;
};

function createPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. ' +
      'Add it to .env.local and restart the dev server.\n' +
      'Expected format: postgresql://user:pass@host/db?sslmode=require'
    );
  }
  
  // Production environment: higher pool capacity for voice traffic
  const isProduction = process.env.NODE_ENV === 'production';
  const maxConnections = isProduction ? 20 : 5;
  const idleTimeout = isProduction ? 30_000 : 10_000; // 30s idle before cleanup in prod
  const connectionTimeout = isProduction ? 30_000 : 15_000; // 30s connection timeout in prod
  
  return new pg.Pool({
    connectionString,
    max: maxConnections,
    idleTimeoutMillis: idleTimeout,
    connectionTimeoutMillis: connectionTimeout,
    // NeonDB direct endpoint doesn't require verify-full — use require only
    ssl: process.env.DATABASE_URL?.includes('sslmode=verify-full')
      ? { rejectUnauthorized: false } // For verify-full mode
      : true, // For sslmode=require
  });
}

function createPrismaClient(): PrismaClient {
  const pool = globalForPrisma.pgPool ?? createPool();
  globalForPrisma.pgPool = pool;
  
  // Monitor pool lifecycle to detect exhaustion
  if (process.env.NODE_ENV === 'production') {
    pool.on('connect', () => {
      const stats = (pool as any).totalCount || 'unknown';
      console.log(`[DB Pool] ✓ Connection established (total: ${stats})`);
    });
    
    pool.on('remove', () => {
      const stats = (pool as any).totalCount || 'unknown';
      console.log(`[DB Pool] ✗ Connection removed (total: ${stats})`);
    });
    
    pool.on('error', (err: Error) => {
      console.error(`[DB Pool] ⚠️ Unexpected pool error:`, err.message);
    });
  }
  
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn', 'query'] 
      : ['error', 'warn'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
