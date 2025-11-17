import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Firebase configuration
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
const db = getFirestore(app);

async function cleanupUsers() {
  console.log('🧹 Cleaning up database (users, predictions, matches, and players)...\n');

  try {
    // Delete all user entries
    const userEntriesSnapshot = await getDocs(collection(db, 'userEntries'));
    console.log(`Found ${userEntriesSnapshot.size} user entries to delete`);
    
    for (const docSnapshot of userEntriesSnapshot.docs) {
      await deleteDoc(docSnapshot.ref);
      console.log(`  ✓ Deleted user entry: ${docSnapshot.id}`);
    }

    // Delete all predictions
    const predictionsSnapshot = await getDocs(collection(db, 'predictions'));
    console.log(`\nFound ${predictionsSnapshot.size} predictions to delete`);
    
    for (const docSnapshot of predictionsSnapshot.docs) {
      await deleteDoc(docSnapshot.ref);
      console.log(`  ✓ Deleted prediction: ${docSnapshot.id}`);
    }

    // Delete all matches
    const matchesSnapshot = await getDocs(collection(db, 'matches'));
    console.log(`\nFound ${matchesSnapshot.size} matches to delete`);
    
    for (const docSnapshot of matchesSnapshot.docs) {
      await deleteDoc(docSnapshot.ref);
      console.log(`  ✓ Deleted match: ${docSnapshot.id}`);
    }

    // Delete all players
    const playersSnapshot = await getDocs(collection(db, 'players'));
    console.log(`\nFound ${playersSnapshot.size} players to delete`);
    
    for (const docSnapshot of playersSnapshot.docs) {
      await deleteDoc(docSnapshot.ref);
      console.log(`  ✓ Deleted player: ${docSnapshot.id}`);
    }

    console.log('\n✅ Cleanup complete!');
    console.log('Database is now clean. You can seed again with: npm run seed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupUsers();

