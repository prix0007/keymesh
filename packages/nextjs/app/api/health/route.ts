import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { BlockchainService } from '@/lib/services/blockchainService';
import { AvailService } from '@/lib/services/availService';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const blockchainService = new BlockchainService();
const availService = new AvailService();

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const health = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'unknown', latency: 0, error: null as string | null },
      redis: { status: 'unknown', latency: 0, error: null as string | null },
      blockchain: { status: 'unknown', latency: 0, error: null as string | null },
      avail: { status: 'unknown', latency: 0, error: null as string | null }
    },
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    totalLatency: 0
  };

  // Check Database (PostgreSQL)
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
      error: null
    };
  } catch (error) {
    health.services.database = {
      status: 'unhealthy',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
    health.status = 'unhealthy';
  }

  // Check Redis
  try {
    const redisStart = Date.now();
    const redis = new Redis(process.env.REDIS_URL!);
    await redis.ping();
    await redis.disconnect();
    health.services.redis = {
      status: 'healthy',
      latency: Date.now() - redisStart,
      error: null
    };
  } catch (error) {
    health.services.redis = {
      status: 'unhealthy',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown Redis error'
    };
    if (health.status === 'healthy') health.status = 'degraded';
  }

  // Check Blockchain Service
  try {
    const blockchainStart = Date.now();
    const isHealthy = await blockchainService.isHealthy();
    health.services.blockchain = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      latency: Date.now() - blockchainStart,
      error: isHealthy ? null : 'Blockchain service check failed'
    };
    if (!isHealthy && health.status === 'healthy') {
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.blockchain = {
      status: 'unhealthy',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown blockchain error'
    };
    if (health.status === 'healthy') health.status = 'degraded';
  }

  // Check Avail Service
  try {
    const availStart = Date.now();
    const isHealthy = await availService.healthCheck();
    health.services.avail = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      latency: Date.now() - availStart,
      error: isHealthy ? null : 'Avail service check failed'
    };
    if (!isHealthy && health.status === 'healthy') {
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.avail = {
      status: 'unhealthy',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown Avail error'
    };
    if (health.status === 'healthy') health.status = 'degraded';
  }

  health.totalLatency = Date.now() - startTime;

  // Determine overall status
  const unhealthyServices = Object.values(health.services).filter(s => s.status === 'unhealthy').length;
  if (unhealthyServices >= 2) {
    health.status = 'unhealthy';
  } else if (unhealthyServices >= 1 || health.status === 'degraded') {
    health.status = 'degraded';
  }

  // Return appropriate HTTP status
  let httpStatus = 200;
  if (health.status === 'degraded') {
    httpStatus = 200; // Still operational
  } else if (health.status === 'unhealthy') {
    httpStatus = 503; // Service unavailable
  }

  return NextResponse.json(health, { status: httpStatus });
}