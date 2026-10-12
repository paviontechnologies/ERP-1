import { PrismaClient } from '@prisma/client';
import { inMemoryDb } from './in-memory-db';

const globalForPrisma = global as unknown as { prisma: any; dbAvailable?: boolean };

function createPrismaProxy() {
  let realPrisma: any = null;
  // Circuit breaker: if DB fails once, switch permanently to in-memory store
  let dbAvailable = globalForPrisma.dbAvailable ?? true;

  try {
    const isCloudflare =
      typeof navigator !== 'undefined' &&
      (navigator as any).userAgent?.includes('Cloudflare');

    const dbUrl = process.env.DATABASE_URL;
    const isLocalUrl = !dbUrl || dbUrl.includes('127.0.0.1') || dbUrl.includes('localhost');

    // In Cloudflare or Production without remote DB URL, disable real Prisma immediately
    if (isCloudflare || (process.env.NODE_ENV === 'production' && isLocalUrl)) {
      dbAvailable = false;
      globalForPrisma.dbAvailable = false;
    } else if (dbUrl && !isLocalUrl) {
      realPrisma = new PrismaClient({ log: ['error'] });
    }
  } catch {
    realPrisma = null;
    dbAvailable = false;
    globalForPrisma.dbAvailable = false;
  }

  return new Proxy({} as PrismaClient, {
    get(_target, prop: string) {
      if (prop === '$transaction') {
        return async (arg: any) => {
          if (dbAvailable && realPrisma) {
            try {
              return await realPrisma.$transaction(arg);
            } catch {
              dbAvailable = false;
              globalForPrisma.dbAvailable = false;
            }
          }
          return inMemoryDb.$transaction(arg);
        };
      }

      if (prop in inMemoryDb) {
        const mockModel = inMemoryDb[prop];
        return new Proxy(mockModel, {
          get(mTarget, action: string) {
            return async (...args: any[]) => {
              if (dbAvailable && realPrisma && realPrisma[prop] && typeof realPrisma[prop][action] === 'function') {
                try {
                  const res = await realPrisma[prop][action](...args);
                  if (res !== null && res !== undefined) return res;
                  if (prop === 'organization' && !res) {
                    return mTarget[action](...args);
                  }
                  return res;
                } catch {
                  // Circuit breaker tripped: switch to in-memory store
                  dbAvailable = false;
                  globalForPrisma.dbAvailable = false;
                  if (typeof mTarget[action] === 'function') {
                    return mTarget[action](...args);
                  }
                }
              }
              if (typeof mTarget[action] === 'function') {
                return mTarget[action](...args);
              }
              return null;
            };
          },
        });
      }

      if (realPrisma && prop in realPrisma) {
        return realPrisma[prop];
      }

      return undefined;
    },
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma || createPrismaProxy();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
