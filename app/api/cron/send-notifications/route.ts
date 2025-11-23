/**
 * Vercel Cron Job API Route
 * 
 * This endpoint is called by Vercel Cron Jobs to send notifications
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/send-notifications",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { ServerNotificationScheduler } from '@/lib/notifications/schedulers/server-scheduler';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max execution time
export const dynamic = 'force-dynamic'; // Prevent caching for cron jobs

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const testMode = process.env.NOTIFICATION_TEST_MODE === 'true' || process.env.NOTIFICATION_TEST_MODE === '1';
    
    if (testMode) {
      console.log('🧪 TEST MODE ENABLED');
      console.log('   Sending test notifications to all subscribed users...');
    } else {
      console.log('📅 Production mode - Checking for cutoff reminders...');
    }
    
    const scheduler = new ServerNotificationScheduler();
    await scheduler.checkAndTrigger();
    
    if (testMode) {
      return NextResponse.json({
        success: true,
        mode: 'test',
        message: 'Test notifications sent successfully',
      });
    } else {
      return NextResponse.json({
        success: true,
        mode: 'production',
        message: 'Notification check completed',
      });
    }
  } catch (error) {
    console.error('❌ Error in notification cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}

