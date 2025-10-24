import { NextResponse } from 'next/server';
import { MockAvailService } from '@/lib/services/mockAvailService';

export async function GET() {
  try {
    const availService = new MockAvailService();
    const connected = await availService.getConnectionStatus();

    return NextResponse.json({ connected });
  } catch (error) {
    console.error('Error in Avail status API:', error);
    return NextResponse.json({ connected: false });
  }
}