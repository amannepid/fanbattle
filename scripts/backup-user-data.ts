/**
 * Backup user data before recalculating points
 * 
 * This script exports all userEntries, predictions, and matches to a JSON file
 * for backup purposes before running point recalculation.
 * 
 * Usage: npm run backup-user-data
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { join } from 'path';
import type { Match, Prediction, UserEntry, Tournament } from '../types';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const COLLECTIONS = {
  tournaments: 'tournaments',
  matches: 'matches',
  userEntries: 'userEntries',
  predictions: 'predictions',
};

async function getActiveTournament(): Promise<Tournament | null> {
  const q = query(
    collection(db, COLLECTIONS.tournaments),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Tournament;
}

async function backupUserData() {
  console.log('💾 Starting backup of user data...\n');

  try {
    // 1. Get active tournament
    const tournament = await getActiveTournament();
    if (!tournament) {
      console.log('❌ No active tournament found');
      process.exit(1);
    }

    console.log(`📋 Tournament: ${tournament.name} (${tournament.id})\n`);

    // 2. Get all user entries
    console.log('📥 Fetching user entries...');
    const userEntriesQuery = query(
      collection(db, COLLECTIONS.userEntries),
      where('tournamentId', '==', tournament.id)
    );
    const userEntriesSnapshot = await getDocs(userEntriesQuery);
    const userEntries = userEntriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Timestamp to ISO string for JSON serialization
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    } as any));
    console.log(`   ✅ Found ${userEntries.length} user entries`);

    // 3. Get all matches
    console.log('📥 Fetching matches...');
    const matchesQuery = query(
      collection(db, COLLECTIONS.matches),
      where('tournamentId', '==', tournament.id),
      orderBy('matchNumber', 'asc')
    );
    const matchesSnapshot = await getDocs(matchesQuery);
    const matches = matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Timestamp to ISO string for JSON serialization
      matchDate: doc.data().matchDate?.toDate?.()?.toISOString() || doc.data().matchDate,
      deadline: doc.data().deadline?.toDate?.()?.toISOString() || doc.data().deadline,
    } as any));
    console.log(`   ✅ Found ${matches.length} matches`);

    // 4. Get all predictions
    console.log('📥 Fetching predictions...');
    const matchIds = matches.map(m => m.id);
    
    // Firestore 'in' query supports up to 10 items, so we need to batch if there are more
    const MAX_IN_QUERY = 10;
    const allPredictions: any[] = [];
    
    // Process in batches of 10
    for (let i = 0; i < matchIds.length; i += MAX_IN_QUERY) {
      const batchMatchIds = matchIds.slice(i, i + MAX_IN_QUERY);
      const predictionsQuery = query(
        collection(db, COLLECTIONS.predictions),
        where('matchId', 'in', batchMatchIds),
        orderBy('matchNumber', 'asc')
      );
      const predictionsSnapshot = await getDocs(predictionsQuery);
      const batchPredictions = predictionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Timestamp to ISO string for JSON serialization
        submittedAt: doc.data().submittedAt?.toDate?.()?.toISOString() || doc.data().submittedAt,
        scoredAt: doc.data().scoredAt?.toDate?.()?.toISOString() || doc.data().scoredAt,
      }));
      allPredictions.push(...batchPredictions);
    }
    
    // Sort all predictions by match number
    allPredictions.sort((a, b) => a.matchNumber - b.matchNumber);
    console.log(`   ✅ Found ${allPredictions.length} predictions`);

    // 5. Create backup object
    const backup = {
      timestamp: new Date().toISOString(),
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
      },
      userEntries,
      matches,
      predictions: allPredictions,
      summary: {
        totalUsers: userEntries.length,
        totalMatches: matches.length,
        totalPredictions: allPredictions.length,
        completedMatches: matches.filter((m: any) => m.status === 'completed').length,
      },
    };

    // 6. Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `backup-user-data-${timestamp}.json`;
    const filepath = join(process.cwd(), 'backups', filename);
    
    // Create backups directory if it doesn't exist
    const { mkdirSync } = require('fs');
    try {
      mkdirSync(join(process.cwd(), 'backups'), { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
    
    writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');
    
    console.log('\n✅ Backup completed successfully!');
    console.log(`📁 Backup saved to: ${filepath}`);
    console.log('\n📊 Summary:');
    console.log(`   Users: ${backup.summary.totalUsers}`);
    console.log(`   Matches: ${backup.summary.totalMatches} (${backup.summary.completedMatches} completed)`);
    console.log(`   Predictions: ${backup.summary.totalPredictions}`);
    console.log(`   File size: ${(JSON.stringify(backup).length / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Error creating backup:', error);
    throw error;
  }
}

backupUserData()
  .then(() => {
    console.log('\n✅ Backup process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backup process failed:', error);
    process.exit(1);
  });

