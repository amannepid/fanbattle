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

interface PlayerJSON {
  name: string;
  teamId: string;
  role?: string;
  position?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  isAbroadPlayer?: boolean;
  photoUrl?: string | null;
}

// Map position/role from scraper to our role format
function normalizeRole(position?: string, role?: string): 'batter' | 'bowler' | 'allrounder' | 'wicketkeeper' {
  const combined = `${position || ''} ${role || ''}`.toLowerCase();
  
  if (combined.includes('wicketkeeper') || combined.includes('wicket keeper')) {
    return 'wicketkeeper';
  }
  if (combined.includes('allrounder') || combined.includes('all-rounder') || combined.includes('all rounder')) {
    return 'allrounder';
  }
  if (combined.includes('bowler') || combined.includes('bowling')) {
    return 'bowler';
  }
  if (combined.includes('batter') || combined.includes('batsman') || combined.includes('batting')) {
    return 'batter';
  }
  
  // Default to batter if unclear
  return 'batter';
}

async function importPlayersFromJSON(jsonPath: string) {
  console.log('📊 Importing players from JSON...\n');

  try {
    // Read JSON file
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const players: PlayerJSON[] = JSON.parse(jsonContent);
    
    if (!Array.isArray(players) || players.length === 0) {
      console.log('⚠️  No player data found in JSON (empty array or invalid format)');
      return;
    }

    // First, delete all existing players
    console.log('🗑️  Deleting existing players...');
    const playersSnapshot = await getDocs(collection(db, 'players'));
    for (const docSnapshot of playersSnapshot.docs) {
      await deleteDoc(docSnapshot.ref);
    }
    console.log(`✓ Deleted ${playersSnapshot.size} existing players\n`);

    // Import players
    console.log('📝 Importing new players...');
    let imported = 0;
    let skipped = 0;
    
    for (const player of players) {
      if (!player.name || !player.teamId) {
        skipped++;
        console.log(`  ⚠️  Skipping player (missing name or teamId):`, player);
        continue;
      }
      
      const playerId = `${player.teamId}-player-${imported + 1}`;
      const playerRef = doc(db, 'players', playerId);
      
      // Normalize role from position/role fields
      const role = normalizeRole(player.position, player.role);
      
      await setDoc(playerRef, {
        teamId: player.teamId.trim(),
        name: player.name.trim(),
        role: role,
        battingStyle: player.battingStyle?.trim() || 'Unknown',
        bowlingStyle: player.bowlingStyle?.trim() || 'Unknown',
        isAbroadPlayer: player.isAbroadPlayer || false,
        photoUrl: player.photoUrl?.trim() || null,
      });
      
      imported++;
      console.log(`  ✓ ${imported}. ${player.name.trim()} (${player.teamId.trim()}) - ${role}`);
    }
    
    if (skipped > 0) {
      console.log(`\n⚠️  Skipped ${skipped} invalid players`);
    }
    
    console.log(`\n✅ Successfully imported ${imported} players!`);
    console.log('\n🚀 Players are now ready in Firestore!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing players:', error);
    process.exit(1);
  }
}

// Get JSON path from command line or use default
const jsonPath = process.argv[2] || path.join(__dirname, 'player-data', 'all-players.json');

if (!fs.existsSync(jsonPath)) {
  console.error(`❌ JSON file not found: ${jsonPath}`);
  console.log('\nUsage: npm run import-players-json [path-to-json]');
  console.log('Default: npm run import-players-json (uses player-data/all-players.json)');
  console.log('\nAvailable JSON files:');
  const playerDataDir = path.join(__dirname, 'player-data');
  if (fs.existsSync(playerDataDir)) {
    const files = fs.readdirSync(playerDataDir).filter(f => f.endsWith('.json'));
    files.forEach(f => console.log(`  - player-data/${f}`));
  }
  process.exit(1);
}

importPlayersFromJSON(jsonPath);

