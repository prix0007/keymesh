import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '@/lib/services/notificationService';

const prisma = new PrismaClient();
const notificationService = new NotificationService();

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (if Envio provides one)
    const signature = request.headers.get('x-envio-signature');
    if (process.env.ENVIO_WEBHOOK_SECRET && signature) {
      // TODO: Implement webhook signature verification
      // This would verify that the webhook is actually from Envio
    }

    const events = await request.json();

    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 });
    }

    let processedEvents = 0;
    let errors = 0;

    for (const event of events) {
      try {
        await processEvent(event);
        processedEvents++;
      } catch (error) {
        console.error('Error processing event:', error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedEvents,
      errors: errors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in Envio webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processEvent(event: any) {
  const { type, data } = event;

  switch (type) {
    case 'RecoverySetup':
      await handleRecoverySetup(data);
      break;
    case 'RecoveryInitiated':
      await handleRecoveryInitiated(data);
      break;
    case 'GuardianApproval':
      await handleGuardianApproval(data);
      break;
    case 'RecoveryCompleted':
      await handleRecoveryCompleted(data);
      break;
    case 'RecoveryCancelled':
      await handleRecoveryCancelled(data);
      break;
    case 'HeartbeatUpdated':
      await handleHeartbeatUpdated(data);
      break;
    case 'CommitmentRecorded':
      await handleCommitmentRecorded(data);
      break;
    default:
      console.log(`Unknown event type: ${type}`);
  }
}

async function handleRecoverySetup(data: any) {
  const { userAddress, guardians, blockNumber, transactionHash } = data;

  // Update database with on-chain confirmation
  const user = await prisma.user.findUnique({
    where: { address: userAddress.toLowerCase() }
  });

  if (user) {
    // Mark guardians as confirmed on-chain if they exist
    await prisma.guardian.updateMany({
      where: {
        userId: user.id,
        address: {
          in: guardians.map((g: string) => g.toLowerCase())
        }
      },
      data: {
        // Could add onChainConfirmed field
      }
    });
  }

  console.log(`Recovery setup confirmed on-chain for ${userAddress} at block ${blockNumber}`);
}

async function handleRecoveryInitiated(data: any) {
  const { userAddress, isEmergency, blockNumber, transactionHash } = data;

  // Find or create recovery record
  const user = await prisma.user.findUnique({
    where: { address: userAddress.toLowerCase() },
    include: {
      guardians: {
        where: { status: 'ACCEPTED' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      }
    }
  });

  if (!user) {
    console.error(`User not found for recovery initiation: ${userAddress}`);
    return;
  }

  // Check if recovery already exists
  let recovery = await prisma.recovery.findFirst({
    where: {
      userId: user.id,
      status: {
        in: ['INITIATED', 'AWAITING_APPROVALS', 'APPROVED']
      }
    }
  });

  if (!recovery) {
    // Create recovery record if it doesn't exist
    recovery = await prisma.recovery.create({
      data: {
        userId: user.id,
        status: 'INITIATED',
        isEmergency: isEmergency,
        initiatedAt: new Date()
      }
    });
  }

  // Send notifications to all guardians
  for (const guardian of user.guardians) {
    if (guardian.email) {
      await notificationService.sendNotification({
        userId: user.id,
        guardianId: guardian.id,
        type: 'RECOVERY_REQUEST',
        recipient: guardian.email,
        channel: 'EMAIL',
        templateData: {
          userAddress: user.address,
          recoveryId: recovery.id,
          isEmergency: isEmergency,
          initiatedAt: recovery.initiatedAt,
          guardianName: guardian.name
        }
      });
    }
  }

  console.log(`Recovery initiated on-chain for ${userAddress} (Emergency: ${isEmergency})`);
}

async function handleGuardianApproval(data: any) {
  const { userAddress, guardianAddress, signature, blockNumber } = data;

  // Find the recovery and guardian
  const user = await prisma.user.findUnique({
    where: { address: userAddress.toLowerCase() }
  });

  const guardian = await prisma.guardian.findFirst({
    where: {
      address: guardianAddress.toLowerCase(),
      userId: user?.id
    }
  });

  const recovery = await prisma.recovery.findFirst({
    where: {
      userId: user?.id,
      status: {
        in: ['INITIATED', 'AWAITING_APPROVALS']
      }
    }
  });

  if (!user || !guardian || !recovery) {
    console.error('Could not find user, guardian, or recovery for approval event');
    return;
  }

  // Check if approval already exists
  const existingApproval = await prisma.recoveryApproval.findFirst({
    where: {
      recoveryId: recovery.id,
      guardianId: guardian.id
    }
  });

  if (!existingApproval) {
    // Create approval record
    await prisma.recoveryApproval.create({
      data: {
        recoveryId: recovery.id,
        guardianId: guardian.id,
        signature: signature,
        message: `On-chain approval from block ${blockNumber}`,
        approvedAt: new Date()
      }
    });

    // Check if we have enough approvals
    const totalApprovals = await prisma.recoveryApproval.count({
      where: { recoveryId: recovery.id }
    });

    if (totalApprovals >= 3) {
      // Update recovery status
      await prisma.recovery.update({
        where: { id: recovery.id },
        data: { status: 'APPROVED' }
      });

      // Notify user about approval
      if (user.email) {
        await notificationService.sendNotification({
          userId: user.id,
          type: 'RECOVERY_APPROVED',
          recipient: user.email,
          channel: 'EMAIL',
          templateData: {
            recoveryId: recovery.id,
            currentApprovals: totalApprovals,
            isEmergency: recovery.isEmergency,
            canFinalize: false // Will be true after delay period
          }
        });
      }
    }
  }

  console.log(`Guardian approval confirmed on-chain: ${guardianAddress} for ${userAddress}`);
}

async function handleRecoveryCompleted(data: any) {
  const { userAddress, blockNumber, transactionHash } = data;

  // Update recovery status
  const user = await prisma.user.findUnique({
    where: { address: userAddress.toLowerCase() }
  });

  if (user) {
    await prisma.recovery.updateMany({
      where: {
        userId: user.id,
        status: 'APPROVED'
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });
  }

  console.log(`Recovery completed on-chain for ${userAddress} at block ${blockNumber}`);
}

async function handleRecoveryCancelled(data: any) {
  const { userAddress, blockNumber } = data;

  // Update recovery status
  const user = await prisma.user.findUnique({
    where: { address: userAddress.toLowerCase() }
  });

  if (user) {
    await prisma.recovery.updateMany({
      where: {
        userId: user.id,
        status: {
          in: ['INITIATED', 'AWAITING_APPROVALS', 'APPROVED']
        }
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
      }
    });
  }

  console.log(`Recovery cancelled on-chain for ${userAddress} at block ${blockNumber}`);
}

async function handleHeartbeatUpdated(data: any) {
  const { userAddress, timestamp, blockNumber } = data;

  // Update user's heartbeat
  await prisma.user.updateMany({
    where: { address: userAddress.toLowerCase() },
    data: {
      lastHeartbeat: new Date(timestamp * 1000), // Convert from Unix timestamp
      updatedAt: new Date()
    }
  });

  console.log(`Heartbeat updated on-chain for ${userAddress} at block ${blockNumber}`);
}

async function handleCommitmentRecorded(data: any) {
  const { userAddress, pieceId, blockNumber, txIndex, dataHash } = data;

  // Update or create DA commitment
  const user = await prisma.user.findUnique({
    where: { address: userAddress.toLowerCase() }
  });

  if (user) {
    await prisma.dACommitment.upsert({
      where: {
        userId_pieceId: {
          userId: user.id,
          pieceId: pieceId
        }
      },
      update: {
        blockNumber: BigInt(blockNumber),
        txIndex: txIndex,
        dataHash: dataHash,
        timestamp: new Date()
      },
      create: {
        userId: user.id,
        pieceId: pieceId,
        blockNumber: BigInt(blockNumber),
        txIndex: txIndex,
        dataHash: dataHash,
        merkleRoot: '0x', // Would be provided in the event data
        timestamp: new Date()
      }
    });
  }

  console.log(`DA commitment recorded on-chain for ${userAddress}, piece ${pieceId}`);
}