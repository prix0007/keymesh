import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL!);

export async function POST(request: NextRequest) {
  try {
    const { address, signature, nonce } = await request.json();

    if (!address || !signature || !nonce) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();

    // Retrieve and verify nonce from Redis
    const storedNonce = await redis.get(`nonce:${normalizedAddress}`);
    if (!storedNonce || storedNonce !== nonce) {
      return NextResponse.json(
        { error: 'Invalid or expired nonce' },
        { status: 401 }
      );
    }

    // Construct the message that should have been signed
    const message = `Please sign this message to authenticate with Keymesh.\n\nNonce: ${nonce}\nExpires: ${new Date(Date.now() + 10 * 60 * 1000).toISOString()}`;

    // Verify the signature
    let isValid = false;
    try {
      isValid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
    } catch (error) {
      console.error('Signature verification error:', error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Delete the used nonce
    await redis.del(`nonce:${normalizedAddress}`);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { address: normalizedAddress },
      include: {
        guardians: {
          where: { status: 'ACCEPTED' },
          select: {
            id: true,
            name: true,
            status: true,
            addedAt: true,
            acceptedAt: true
          }
        },
        daCommitments: {
          select: {
            pieceId: true,
            blockNumber: true,
            dataHash: true,
            timestamp: true
          }
        },
        recoveries: {
          where: {
            status: {
              in: ['INITIATED', 'AWAITING_APPROVALS', 'APPROVED']
            }
          },
          select: {
            id: true,
            status: true,
            isEmergency: true,
            initiatedAt: true,
            approvals: {
              include: {
                guardian: {
                  select: {
                    name: true,
                    address: true
                  }
                }
              }
            }
          },
          take: 1,
          orderBy: { initiatedAt: 'desc' }
        }
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          address: normalizedAddress,
          lastHeartbeat: new Date(),
        },
        include: {
          guardians: true,
          daCommitments: true,
          recoveries: true,
        }
      });
    } else {
      // Update last heartbeat
      await prisma.user.update({
        where: { id: user.id },
        data: { lastHeartbeat: new Date() }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        address: normalizedAddress,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

    return NextResponse.json({
      token,
      expiresIn,
      user: {
        id: user.id,
        address: user.address,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt,
        lastHeartbeat: user.lastHeartbeat,
        guardians: user.guardians,
        daCommitments: user.daCommitments,
        activeRecovery: user.recoveries[0] || null,
        isSetup: user.daCommitments.length === 3 // User is setup if all 3 pieces are stored
      }
    });

  } catch (error) {
    console.error('Error verifying signature:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}