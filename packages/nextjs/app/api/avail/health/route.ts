import { NextResponse } from 'next/server';
import { MockAvailService } from '@/lib/services/mockAvailService';

export async function GET() {
  try {
    const availService = new MockAvailService();
    const healthy = await availService.healthCheck();

    return NextResponse.json({ healthy });
  } catch (error) {
    console.error('Error in Avail health API:', error);
    return NextResponse.json({ healthy: false });
  }
}