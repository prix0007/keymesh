import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Invalid address' },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Generate a random nonce
    const nonce = randomBytes(16).toString('hex');
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // Store nonce in Redis with TTL
    await redis.setex(`nonce:${address.toLowerCase()}`, 600, nonce);

    return NextResponse.json({
      nonce,
      expiresAt,
      message: `Please sign this message to authenticate with Keymesh.\n\nNonce: ${nonce}\nExpires: ${new Date(expiresAt).toISOString()}`
    });

  } catch (error) {
    console.error('Error generating nonce:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}