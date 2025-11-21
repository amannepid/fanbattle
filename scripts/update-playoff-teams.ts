import { initializeApp, getApps } from 'firebase/app';
import { config } from 'dotenv';
import { updatePlayoffMatchTeams } from '@/lib/playoff-matches';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

async function updatePlayoffTeams() {
  console.log('🔄 Updating playoff match teams...\n');

  try {
    const tournamentId = 'npl-2025-season-2';
    await updatePlayoffMatchTeams(tournamentId);
    console.log('\n✅ Playoff teams updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating playoff teams:', error);
    process.exit(1);
  }
}

// Run the update
updatePlayoffTeams();

