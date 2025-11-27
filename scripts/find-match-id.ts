/**
 * Find match ID by match number
 * 
 * Usage: npm run find-match-id <matchNumber>
 * Example: npm run find-match-id 14
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, getDocs, collection, query, where } from 'firebase/firestore';
import { config } from 'dotenv';

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

async function findMatchId(matchNumber: number) {
  console.log(`🔍 Searching for Match ${matchNumber}...\n`);

  try {
    const q = query(
      collection(db, 'matches'),
      where('matchNumber', '==', matchNumber)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log(`❌ No match found with match number ${matchNumber}`);
      return;
    }

    snapshot.docs.forEach((doc) => {
      const match = doc.data();
      console.log(`✅ Found Match ${matchNumber}:`);
      console.log(`   Match ID: ${doc.id}`);
      console.log(`   Teams: ${match.teamAName} vs ${match.teamBName}`);
      console.log(`   Type: ${match.matchType}`);
      console.log(`   Status: ${match.status}`);
      console.log(`   Date: ${match.matchDate?.toDate?.()?.toLocaleString() || 'N/A'}`);
      if (match.status === 'completed') {
        console.log(`   Winner: ${match.winnerName || 'N/A'}`);
        console.log(`   First Innings: ${match.firstInningsBattingTeamId ? 'Team ID: ' + match.firstInningsBattingTeamId : 'N/A'}`);
        console.log(`   Score: ${match.firstInningsScore || 'N/A'}, Wickets: ${match.firstInningsWickets || 'N/A'}`);
      }
      console.log(`\n   To recalculate, run:`);
      console.log(`   npm run recalculate-match ${doc.id}\n`);
    });
  } catch (error) {
    console.error('❌ Error finding match:', error);
    throw error;
  }
}

// Get match number from command line
const matchNumber = process.argv[2];

if (!matchNumber) {
  console.log('❌ Please provide a match number');
  console.log('Usage: npm run find-match-id <matchNumber>');
  console.log('Example: npm run find-match-id 14');
  process.exit(1);
}

const matchNum = parseInt(matchNumber, 10);
if (isNaN(matchNum)) {
  console.log('❌ Invalid match number:', matchNumber);
  process.exit(1);
}

findMatchId(matchNum)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

