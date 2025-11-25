/**
 * Vercel Cron Job API Route
 * 
 * This endpoint is called by Vercel Cron Jobs to activate scheduled predictions
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/activate-scheduled-predictions",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 * 
 * Note: Vercel Hobby plan only supports daily cron jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getScheduledPredictionsToActivate, activateScheduledPrediction } from '@/lib/firestore';
import { shouldActivateScheduledPrediction } from '@/lib/prediction-rules';
import { getActiveTournament, getMatches } from '@/lib/firestore';

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

    console.log('🔄 Starting scheduled predictions activation...');
    
    // Get scheduled predictions ready to activate
    const scheduledPredictions = await getScheduledPredictionsToActivate();
    console.log(`   Found ${scheduledPredictions.length} scheduled prediction(s) to activate`);
    
    if (scheduledPredictions.length === 0) {
      return NextResponse.json({
        success: true,
        activated: 0,
        message: 'No scheduled predictions to activate',
      });
    }
    
    // Get matches for validation (optional double-check)
    const tournament = await getActiveTournament();
    let allMatches: any[] = [];
    if (tournament) {
      allMatches = await getMatches(tournament.id);
    }
    
    // Activate predictions
    let activatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    for (const prediction of scheduledPredictions) {
      try {
        // Optional validation (double-check)
        if (allMatches.length > 0) {
          const shouldActivate = shouldActivateScheduledPrediction(prediction, allMatches);
          if (!shouldActivate) {
            console.log(`   ⚠️  Skipping prediction ${prediction.id} - not yet time to activate`);
            continue;
          }
        }
        
        // Activate the prediction
        const success = await activateScheduledPrediction(prediction.id);
        if (success) {
          activatedCount++;
          console.log(`   ✅ Activated prediction ${prediction.id}`);
        } else {
          errorCount++;
          errors.push(`Failed to activate ${prediction.id}`);
          console.error(`   ❌ Failed to activate prediction ${prediction.id}`);
        }
      } catch (error) {
        errorCount++;
        const errorMsg = `Error activating ${prediction.id}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }
    
    console.log(`   ✅ Activation complete: ${activatedCount} activated, ${errorCount} errors`);
    
    return NextResponse.json({
      success: true,
      activated: activatedCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      message: `Activated ${activatedCount} scheduled prediction(s)`,
    });
  } catch (error) {
    console.error('❌ Error in scheduled predictions activation cron job:', error);
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

