import { PrismaClient } from '@prisma/client';
import { inMemoryDb } from './in-memory-db';

export const prisma: PrismaClient = inMemoryDb as unknown as PrismaClient;
