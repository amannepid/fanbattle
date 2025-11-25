/**
 * Test script to manually activate scheduled predictions
 * 
 * Usage: tsx scripts/test-activate-scheduled.ts
 * 
 * This script finds all scheduled predictions that should be activated
 * and activates them manually (useful for testing in dev mode)
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

// Import functions (need to use dynamic import or copy logic)
async function testActivation() {
  console.log('🔄 Testing scheduled predictions activation...\n');

  try {
    // Import the functions
    const { getScheduledPredictionsToActivate, activateScheduledPrediction } = await import('../lib/firestore');
    
    // Get scheduled predictions ready to activate
    const scheduled = await getScheduledPredictionsToActivate();
    
    console.log(`📋 Found ${scheduled.length} scheduled prediction(s) to activate\n`);
    
    if (scheduled.length === 0) {
      console.log('✅ No scheduled predictions to activate');
      console.log('   (Either none exist, or all activation times are in the future)');
      process.exit(0);
    }
    
    // Activate each one
    let activatedCount = 0;
    let errorCount = 0;
    
    for (const pred of scheduled) {
      console.log(`🔄 Activating prediction: ${pred.id}`);
      console.log(`   Match: ${pred.matchNumber}`);
      console.log(`   User: ${pred.userId}`);
      console.log(`   Scheduled for: ${pred.scheduledFor?.toDate().toLocaleString()}`);
      
      const result = await activateScheduledPrediction(pred.id);
      
      if (result) {
        console.log(`   ✅ Activated successfully\n`);
        activatedCount++;
      } else {
        console.log(`   ❌ Failed to activate\n`);
        errorCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   ✅ Activated: ${activatedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📋 Total: ${scheduled.length}`);
    
    if (activatedCount > 0) {
      console.log('\n💡 Tip: Refresh your dashboard to see the activated predictions!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testActivation();

