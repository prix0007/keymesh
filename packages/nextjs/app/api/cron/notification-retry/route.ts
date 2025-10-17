import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/services/notificationService';

const notificationService = new NotificationService();

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Retry failed notifications
    const retriedCount = await notificationService.retryFailedNotifications();

    return NextResponse.json({
      success: true,
      processed: {
        retriedNotifications: retriedCount
      },
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Error in notification retry cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}