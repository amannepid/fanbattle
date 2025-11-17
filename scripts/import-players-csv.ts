import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

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

console.log('Firebase Config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
});

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

interface PlayerCSV {
  teamId: string;
  name: string;
  role: 'batter' | 'bowler' | 'allrounder' | 'wicketkeeper';
  battingStyle: string;
  bowlingStyle: string;
  isAbroadPlayer: boolean;
  photoUrl: string;
}

async function importPlayersFromCSV(csvPath: string) {
  console.log('📊 Importing players from CSV...\n');

  try {
    // Read CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    // Skip header row
    const dataLines = lines.slice(1);
    
    if (dataLines.length === 0) {
      console.log('⚠️  No player data found in CSV');
      return;
    }

    // First, delete all existing players
    console.log('🗑️  Deleting existing players...');
    const playersSnapshot = await getDocs(collection(db, 'players'));
    for (const docSnapshot of playersSnapshot.docs) {
      await deleteDoc(docSnapshot.ref);
    }
    console.log(`✓ Deleted ${playersSnapshot.size} existing players\n`);

    // Parse and import players
    console.log('📝 Importing new players...');
    let imported = 0;
    
    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      // Skip comment lines (starting with #)
      if (line.trim().startsWith('#')) continue;
      
      const [teamId, name, role, battingStyle, bowlingStyle, isAbroadPlayer, photoUrl] = line.split(',');
      
      if (!teamId || !name) continue;
      
      const playerId = `${teamId}-player-${imported + 1}`;
      const playerRef = doc(db, 'players', playerId);
      
      await setDoc(playerRef, {
        teamId: teamId.trim(),
        name: name.trim(),
        role: (role || 'batter').trim() as 'batter' | 'bowler' | 'allrounder' | 'wicketkeeper',
        battingStyle: battingStyle?.trim() || 'Unknown',
        bowlingStyle: bowlingStyle?.trim() || 'Unknown',
        isAbroadPlayer: isAbroadPlayer?.trim().toLowerCase() === 'true',
        photoUrl: photoUrl?.trim() || null,
      });
      
      imported++;
      console.log(`  ✓ ${imported}. ${name.trim()} (${teamId.trim()})`);
    }
    
    console.log(`\n✅ Successfully imported ${imported} players!`);
    console.log('\n🚀 Players are now ready in Firestore!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing players:', error);
    process.exit(1);
  }
}

// Get CSV path from command line or use default
const csvPath = process.argv[2] || path.join(__dirname, 'players-template.csv');

if (!fs.existsSync(csvPath)) {
  console.error(`❌ CSV file not found: ${csvPath}`);
  console.log('\nUsage: npm run import-players [path-to-csv]');
  console.log('Default: npm run import-players (uses players-template.csv)');
  process.exit(1);
}

importPlayersFromCSV(csvPath);

