/**
 * Script to create required Firestore indexes programmatically
 * 
 * This ensures indexes exist before production deployment
 * Run this script before deploying to production to avoid user-facing errors
 * 
 * Usage: tsx scripts/create-firestore-indexes.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (if not already initialized)
if (getApps().length === 0) {
  // Try to use service account from environment variable
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (serviceAccount) {
    try {
      const serviceAccountJson = JSON.parse(serviceAccount);
      initializeApp({
        credential: cert(serviceAccountJson),
      });
    } catch (error) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT:', error);
      console.log('Falling back to default credentials...');
      initializeApp();
    }
  } else {
    // Use default credentials (from GOOGLE_APPLICATION_CREDENTIALS env var or default)
    initializeApp();
  }
}

const db = getFirestore();

/**
 * Note: Firebase Admin SDK doesn't have a direct API to create indexes programmatically.
 * However, we can verify indexes exist and provide instructions.
 * 
 * The recommended approach is:
 * 1. Use Firebase Console to create indexes manually (before production)
 * 2. Or use Firebase CLI: firebase deploy --only firestore:indexes
 * 3. Or use the firestore.indexes.json file we created
 */

async function checkAndCreateIndexes() {
  console.log('🔍 Checking Firestore indexes...\n');
  
  // Required indexes
  const requiredIndexes = [
    {
      name: 'User Predictions Index',
      description: 'For getUserPredictions() query',
      collection: 'predictions',
      fields: [
        { field: 'userId', order: 'ASCENDING' },
        { field: 'matchNumber', order: 'ASCENDING' }
      ],
      query: "where('userId', '==', userId).orderBy('matchNumber', 'asc')"
    },
    {
      name: 'Scheduled Predictions Index',
      description: 'For getScheduledPredictionsToActivate() cron job',
      collection: 'predictions',
      fields: [
        { field: 'scheduledFor', order: 'ASCENDING' }
      ],
      query: "where('scheduledFor', '<=', now).orderBy('scheduledFor', 'asc')"
    },
    {
      name: 'Match Predictions Index',
      description: 'For getAllPredictions() battleground query',
      collection: 'predictions',
      fields: [
        { field: 'matchId', order: 'ASCENDING' },
        { field: 'matchNumber', order: 'ASCENDING' }
      ],
      query: "where('matchId', 'in', batchMatchIds).orderBy('matchNumber', 'asc')"
    }
  ];

  console.log('📋 Required Firestore Indexes:\n');
  
  requiredIndexes.forEach((index, i) => {
    console.log(`${i + 1}. ${index.name}`);
    console.log(`   Collection: ${index.collection}`);
    console.log(`   Fields: ${index.fields.map(f => `${f.field} (${f.order})`).join(', ')}`);
    console.log(`   Query: ${index.query}`);
    console.log(`   Description: ${index.description}\n`);
  });

  console.log('⚠️  IMPORTANT: Firebase Admin SDK cannot create indexes programmatically.\n');
  console.log('📝 To create indexes, use one of these methods:\n');
  
  console.log('Method 1: Firebase Console (Recommended)');
  console.log('   1. Go to: https://console.firebase.google.com/');
  console.log('   2. Select your project');
  console.log('   3. Go to Firestore Database → Indexes');
  console.log('   4. Click "Create Index"');
  console.log('   5. Follow the guide in FIRESTORE_INDEXES_GUIDE.md\n');
  
  console.log('Method 2: Firebase CLI');
  console.log('   1. Install: npm install -g firebase-tools');
  console.log('   2. Login: firebase login');
  console.log('   3. Deploy: firebase deploy --only firestore:indexes');
  console.log('   4. This will use firestore.indexes.json file\n');
  
  console.log('Method 3: Wait for Auto-Prompt (NOT RECOMMENDED FOR PRODUCTION)');
  console.log('   - Firestore will show errors with index creation links');
  console.log('   - Users will see errors until indexes are created\n');
  
  console.log('✅ After creating indexes, they will take a few minutes to build.');
  console.log('   Check status in Firebase Console → Firestore → Indexes\n');
  
  // Test if we can query (this will fail if indexes don't exist)
  console.log('🧪 Testing queries (will fail if indexes don\'t exist)...\n');
  
  try {
    // Test query 1: getUserPredictions pattern
    const testQuery1 = db.collection('predictions')
      .where('userId', '==', 'test-user-id')
      .orderBy('matchNumber', 'asc')
      .limit(1);
    
    await testQuery1.get();
    console.log('✅ Index 1 (userId + matchNumber): EXISTS');
  } catch (error: any) {
    if (error.code === 9 || error.message?.includes('index')) {
      console.log('❌ Index 1 (userId + matchNumber): MISSING');
      console.log('   Create this index in Firebase Console');
    } else {
      console.log('⚠️  Index 1: Could not verify (may not exist or other error)');
    }
  }
  
  try {
    // Test query 2: getScheduledPredictionsToActivate pattern
    const testQuery2 = db.collection('predictions')
      .where('scheduledFor', '<=', new Date())
      .orderBy('scheduledFor', 'asc')
      .limit(1);
    
    await testQuery2.get();
    console.log('✅ Index 2 (scheduledFor): EXISTS');
  } catch (error: any) {
    if (error.code === 9 || error.message?.includes('index')) {
      console.log('❌ Index 2 (scheduledFor): MISSING');
      console.log('   Create this index in Firebase Console');
    } else {
      console.log('⚠️  Index 2: Could not verify (may not exist or other error)');
    }
  }
  
  try {
    // Test query 3: getAllPredictions pattern
    const testQuery3 = db.collection('predictions')
      .where('matchId', 'in', ['test-match-id'])
      .orderBy('matchNumber', 'asc')
      .limit(1);
    
    await testQuery3.get();
    console.log('✅ Index 3 (matchId + matchNumber): EXISTS');
  } catch (error: any) {
    if (error.code === 9 || error.message?.includes('index')) {
      console.log('❌ Index 3 (matchId + matchNumber): MISSING');
      console.log('   Create this index in Firebase Console');
    } else {
      console.log('⚠️  Index 3: Could not verify (may not exist or other error)');
    }
  }
  
  console.log('\n📚 See FIRESTORE_INDEXES_GUIDE.md for detailed instructions');
}

// Run the script
checkAndCreateIndexes()
  .then(() => {
    console.log('\n✅ Index check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

