/**
 * Restore a prediction from a backup file
 * 
 * Usage: 
 *   npm run restore-prediction <backup-filename>
 * 
 * Example:
 *   npm run restore-prediction prediction-backup-user123_match-1-2025-01-15T10-30-00.json
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Timestamp } from 'firebase/firestore';
import type { Prediction } from '../types';

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

// Backup directory
const BACKUP_DIR = path.join(process.cwd(), 'scripts', 'backups');

async function restorePrediction(backupFileName: string) {
  console.log('🔄 Restoring prediction from backup...\n');
  
  const backupPath = path.join(BACKUP_DIR, backupFileName);
  
  // Check if backup file exists
  if (!fs.existsSync(backupPath)) {
    console.log(`❌ Backup file not found: ${backupPath}`);
    console.log('\nAvailable backups:');
    const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
    if (backups.length === 0) {
      console.log('   No backups found');
    } else {
      backups.forEach(b => console.log(`   - ${b}`));
    }
    process.exit(1);
  }
  
  try {
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    const { prediction, userEmail, backedUpAt } = backupData;
    
    console.log(`📄 Backup Details:`);
    console.log(`   User: ${userEmail}`);
    console.log(`   Prediction ID: ${prediction.id}`);
    console.log(`   Backed up at: ${backedUpAt}`);
    console.log(`   Winner: ${prediction.predictedWinnerName}`);
    if (prediction.predictedPomName) {
      console.log(`   POM: ${prediction.predictedPomName}`);
    }
    console.log();
    
    // Convert ISO strings back to Timestamps
    const restoredPrediction: Prediction = {
      ...prediction,
      submittedAt: prediction.submittedAt ? Timestamp.fromDate(new Date(prediction.submittedAt)) : Timestamp.now(),
      scoredAt: prediction.scoredAt ? Timestamp.fromDate(new Date(prediction.scoredAt)) : undefined,
    };
    
    // Restore to Firestore
    await setDoc(doc(db, 'predictions', prediction.id), restoredPrediction);
    
    console.log('✅ Prediction restored successfully!');
    console.log(`   Prediction ID: ${prediction.id}`);
    console.log('\n⚠️  Note: If the match is completed, you may need to recalculate scores.');
    console.log('   Run: npm run recalculate-match <matchId>');
    
  } catch (error) {
    console.error('❌ Error restoring backup:', error);
    process.exit(1);
  }
}

// Get backup filename from command line args
const backupFileName = process.argv[2];

if (!backupFileName) {
  console.log('❌ Please provide a backup filename');
  console.log('\nUsage: npm run restore-prediction <backup-filename>');
  console.log('\nExample:');
  console.log('   npm run restore-prediction prediction-backup-user123_match-1-2025-01-15T10-30-00.json');
  console.log('\nAvailable backups:');
  if (fs.existsSync(BACKUP_DIR)) {
    const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
    if (backups.length === 0) {
      console.log('   No backups found');
    } else {
      backups.forEach(b => console.log(`   - ${b}`));
    }
  } else {
    console.log('   Backup directory does not exist');
  }
  process.exit(1);
}

restorePrediction(backupFileName);

