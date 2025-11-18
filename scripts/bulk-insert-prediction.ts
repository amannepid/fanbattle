/**
 * Bulk insert/update predictions for any match from CSV format
 * 
 * Format: emailaddress,WINNER,TEAM1:SCORE/WICKETS,TEAM2:SCORE/WICKETS,PLAYER_NAME
 * Example: user@example.com,JNB,KTG:C/10,JNB:C/7,Lahiru Milantha
 * 
 * Usage: 
 *   npm run bulk-insert-prediction <matchNumber>
 *   npm run bulk-insert-prediction 2
 *   npm run bulk-insert-prediction 3
 * 
 * The script will:
 *   1. Ask if you want to paste data or read from file
 *   2. Process each line
 *   3. Create/update predictions
 *   4. Show summary
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { config } from 'dotenv';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { Timestamp } from 'firebase/firestore';
import type { Match, Prediction, UserEntry, Player, Team } from '../types';

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
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Helper to get user input
function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Read all lines using a simple recursive approach
async function readAllLines(rl: readline.Interface): Promise<string[]> {
  const lines: string[] = [];
  let hasReceivedData = false;
  
  return new Promise((resolve) => {
    const readNextLine = () => {
      rl.question('', (input) => {
        const trimmed = input.trim();
        
        if (trimmed === '') {
          // Empty line
          if (hasReceivedData) {
            // We've received data before, so this empty line means we're done
            resolve(lines);
            return;
          }
          // No data yet, continue reading
          readNextLine();
          return;
        }
        
        // We have data
        hasReceivedData = true;
        
        // Check if input contains multiple lines (user pasted multiple lines)
        const inputLines = input.split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0);
        
        if (inputLines.length > 1) {
          // Multiple lines were pasted at once
          lines.push(...inputLines);
          console.log(`   ✓ Captured ${inputLines.length} line(s) in one paste (total: ${lines.length})`);
        } else {
          // Single line
          lines.push(trimmed);
          console.log(`   ✓ Line ${lines.length} captured`);
        }
        
        // Continue reading
        readNextLine();
      });
    };
    
    // Start reading
    readNextLine();
  });
}

// Save backup of existing prediction
function saveBackup(predictionId: string, prediction: Prediction, userEmail: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `prediction-backup-${predictionId}-${timestamp}.json`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);
  
  const backupData = {
    predictionId,
    userEmail,
    backedUpAt: new Date().toISOString(),
    prediction: {
      ...prediction,
      submittedAt: prediction.submittedAt?.toDate().toISOString(),
      scoredAt: prediction.scoredAt?.toDate().toISOString(),
    },
  };
  
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  return backupPath;
}

// Get match by number
async function getMatchByNumber(tournamentId: string, matchNumber: number): Promise<Match | null> {
  const matchesRef = collection(db, 'matches');
  const q = query(
    matchesRef,
    where('tournamentId', '==', tournamentId),
    where('matchNumber', '==', matchNumber)
  );
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Match;
}

// Get user by email
async function getUserByEmail(email: string): Promise<UserEntry | null> {
  const userEntriesRef = collection(db, 'userEntries');
  const q = query(userEntriesRef, where('userEmail', '==', email.toLowerCase()));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as UserEntry;
}

// Get all players for a match
async function getMatchPlayers(match: Match): Promise<Player[]> {
  const playersRef = collection(db, 'players');
  const q = query(
    playersRef,
    where('teamId', 'in', [match.teamAId, match.teamBId])
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
}

// Get all teams
async function getTeams(tournamentId: string): Promise<Team[]> {
  const teamsRef = collection(db, 'teams');
  const q = query(teamsRef, where('tournamentId', '==', tournamentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
}

// Find player by name (fuzzy match)
function findPlayerByName(players: Player[], name: string): Player | null {
  const lowerName = name.toLowerCase();
  return players.find(p => 
    p.name.toLowerCase().includes(lowerName) || 
    lowerName.includes(p.name.toLowerCase())
  ) || null;
}

// Helper to match team identifier
function matchesTeam(
  identifier: string, 
  teamId: string, 
  teamName: string, 
  shortCode: string, 
  idShort: string, 
  nameAbbr: string
): boolean {
  const upper = identifier.toUpperCase();
  return upper === shortCode || 
         upper === idShort || 
         upper === nameAbbr ||
         teamId.toUpperCase().includes(upper) ||
         teamName.toUpperCase().includes(upper);
}

// Parse CSV line: email,WINNER,TEAM1:SCORE/WICKETS,TEAM2:SCORE/WICKETS,PLAYER_NAME
function parseCSVLine(
  line: string, 
  match: Match, 
  teams: Team[]
): {
  email: string;
  winnerId: string;
  winnerName: string;
  teamAScore?: string;
  teamAWickets?: string;
  teamBScore?: string;
  teamBWickets?: string;
  pomName?: string;
} | null {
  // Handle CSV with commas in player names - split carefully
  // First, split by comma but preserve quoted strings if any
  const parts: string[] = [];
  let currentPart = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentPart += char;
    } else if (char === ',' && !inQuotes) {
      parts.push(currentPart.trim());
      currentPart = '';
    } else {
      currentPart += char;
    }
  }
  // Add the last part
  if (currentPart.length > 0) {
    parts.push(currentPart.trim());
  }
  
  // Remove quotes from parts
  const cleanedParts = parts.map(p => p.replace(/^"(.*)"$/, '$1').trim());
  
  if (cleanedParts.length < 2) {
    return null;
  }
  
  const email = cleanedParts[0];
  const winner = cleanedParts[1];
  
  // Get team short codes
  const teamA = teams.find(t => t.id === match.teamAId);
  const teamB = teams.find(t => t.id === match.teamBId);
  const teamAShortCode = teamA?.shortCode?.toUpperCase() || '';
  const teamBShortCode = teamB?.shortCode?.toUpperCase() || '';
  const teamAIdShort = match.teamAId.split('-').pop()?.toUpperCase() || '';
  const teamBIdShort = match.teamBId.split('-').pop()?.toUpperCase() || '';
  const teamANameAbbr = match.teamAName.split(' ').map(w => w[0]).join('').toUpperCase();
  const teamBNameAbbr = match.teamBName.split(' ').map(w => w[0]).join('').toUpperCase();
  
  // Determine winner
  let winnerId: string;
  let winnerName: string;
  
  if (matchesTeam(winner, match.teamAId, match.teamAName, teamAShortCode, teamAIdShort, teamANameAbbr)) {
    winnerId = match.teamAId;
    winnerName = match.teamAName;
  } else if (matchesTeam(winner, match.teamBId, match.teamBName, teamBShortCode, teamBIdShort, teamBNameAbbr)) {
    winnerId = match.teamBId;
    winnerName = match.teamBName;
  } else {
    throw new Error(`Could not match winner "${winner}" to any team`);
  }
  
  // Parse team predictions
  let teamAScore: string | undefined;
  let teamAWickets: string | undefined;
  let teamBScore: string | undefined;
  let teamBWickets: string | undefined;
  let pomName: string | undefined;
  
  for (let i = 2; i < cleanedParts.length; i++) {
    const part = cleanedParts[i];
    
    // Check if it's a team prediction (format: TEAM:SCORE/WICKETS)
    const teamPredMatch = part.match(/^(\w+):([A-F])\/(\d+)$/i);
    if (teamPredMatch) {
      const [, teamId, score, wickets] = teamPredMatch;
      if (matchesTeam(teamId, match.teamAId, match.teamAName, teamAShortCode, teamAIdShort, teamANameAbbr)) {
        teamAScore = score.toUpperCase();
        teamAWickets = wickets;
      } else if (matchesTeam(teamId, match.teamBId, match.teamBName, teamBShortCode, teamBIdShort, teamBNameAbbr)) {
        teamBScore = score.toUpperCase();
        teamBWickets = wickets;
      }
    } else {
      // Assume it's the player name (last non-prediction part)
      pomName = part;
    }
  }
  
  return {
    email,
    winnerId,
    winnerName,
    teamAScore,
    teamAWickets,
    teamBScore,
    teamBWickets,
    pomName,
  };
}

// Process a single prediction
async function processPrediction(
  csvLine: string,
  match: Match,
  matchNumber: number,
  teams: Team[],
  players: Player[],
  lineNumber: number
): Promise<{ success: boolean; message: string; backupPath?: string; email?: string; action?: string }> {
  try {
    // Validate line is not empty
    if (!csvLine || csvLine.trim().length === 0) {
      return { success: false, message: `Empty line` };
    }
    
    const parsed = parseCSVLine(csvLine, match, teams);
    if (!parsed) {
      return { success: false, message: `Invalid CSV format. Expected: email,WINNER,TEAM1:SCORE/WICKETS,TEAM2:SCORE/WICKETS,PLAYER_NAME` };
    }
    
    // Get user
    const userEntry = await getUserByEmail(parsed.email);
    if (!userEntry) {
      return { success: false, message: `User not found: ${parsed.email}`, email: parsed.email };
    }
    
    // Check if prediction exists
    const predictionId = `${userEntry.userId}_${match.id}`;
    const existingPred = await getDoc(doc(db, 'predictions', predictionId));
    const isUpdate = existingPred.exists();
    
    let backupPath: string | undefined;
    if (isUpdate) {
      const existingPrediction = { id: existingPred.id, ...existingPred.data() } as Prediction;
      backupPath = saveBackup(predictionId, existingPrediction, userEntry.userEmail);
    }
    
    // Find POM player
    let pomPlayer: Player | null = null;
    if (parsed.pomName) {
      pomPlayer = findPlayerByName(players, parsed.pomName);
      if (!pomPlayer) {
        console.log(`   ⚠️  Warning: Player "${parsed.pomName}" not found, continuing without POM`);
      }
    }
    
    // Calculate submittedAt as current time (since game hasn't started)
    const submittedAtTimestamp = Timestamp.now();
    
    // Build update data - only include defined fields
    const updateData: any = {
      userId: userEntry.userId,
      matchId: match.id,
      matchNumber: matchNumber,
      predictedWinnerId: parsed.winnerId,
      predictedWinnerName: parsed.winnerName,
      submittedAt: submittedAtTimestamp,
    };
    
    // Add POM if provided
    if (pomPlayer) {
      updateData.predictedPomId = pomPlayer.id;
      updateData.predictedPomName = pomPlayer.name;
    }
    // If no POM provided, don't update it (preserve existing value if updating)
    
    // Add team A predictions if provided
    if (parsed.teamAScore && ['A', 'B', 'C', 'D', 'E', 'F'].includes(parsed.teamAScore.toUpperCase())) {
      updateData.teamAScoreCategory = parsed.teamAScore.toUpperCase();
    }
    if (parsed.teamAWickets && !isNaN(Number(parsed.teamAWickets))) {
      updateData.teamAWickets = Number(parsed.teamAWickets);
    }
    
    // Add team B predictions if provided
    if (parsed.teamBScore && ['A', 'B', 'C', 'D', 'E', 'F'].includes(parsed.teamBScore.toUpperCase())) {
      updateData.teamBScoreCategory = parsed.teamBScore.toUpperCase();
    }
    if (parsed.teamBWickets && !isNaN(Number(parsed.teamBWickets))) {
      updateData.teamBWickets = Number(parsed.teamBWickets);
    }
    
    // Use setDoc with merge for both updates and creates (more reliable)
    const predictionRef = doc(db, 'predictions', predictionId);
    
    // Prepare the document data
    const docData = {
      ...updateData,
      id: predictionId,
    };
    
    // Use setDoc with merge: true - this will update existing or create new
    await setDoc(predictionRef, docData, { merge: true });
    
    // Verify the update/insert worked by reading back the document
    const verifyDoc = await getDoc(predictionRef);
    if (!verifyDoc.exists()) {
      throw new Error('Failed to save prediction - document not found after save');
    }
    
    // Check if the key fields were actually updated
    const savedData = verifyDoc.data();
    const wasUpdated = isUpdate && (
      savedData.predictedWinnerId === parsed.winnerId &&
      savedData.predictedWinnerName === parsed.winnerName
    );
    
    const action = isUpdate ? 'Updated' : 'Inserted';
    return {
      success: true,
      message: `${action} prediction for ${parsed.email}`,
      backupPath,
      email: parsed.email,
      action,
    };
  } catch (error: any) {
    console.error(`   Error details:`, error);
    return { 
      success: false, 
      message: `Error: ${error.message || 'Unknown error'}`,
      email: csvLine.split(',')[0]?.trim() || 'unknown'
    };
  }
}

async function bulkInsertPredictions(matchNumber: number) {
  console.log(`🎯 Bulk Insert Match ${matchNumber} Predictions\n`);
  console.log('='.repeat(60));
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Get active tournament
    let tournamentId: string | null = null;
    let tournamentName = '';
    
    const testTournamentRef = doc(db, 'tournaments', 'test-tournament-2025');
    const testTournamentSnap = await getDoc(testTournamentRef);
    if (testTournamentSnap.exists()) {
      tournamentId = testTournamentSnap.id;
      tournamentName = testTournamentSnap.data()?.name || tournamentId;
    } else {
      const tournamentsRef = collection(db, 'tournaments');
      const tournamentsSnapshot = await getDocs(tournamentsRef);
      if (!tournamentsSnapshot.empty) {
        const activeTournament = tournamentsSnapshot.docs.find(
          doc => doc.data().status === 'active'
        ) || tournamentsSnapshot.docs[0];
        tournamentId = activeTournament.id;
        tournamentName = activeTournament.data()?.name || tournamentId;
      }
    }
    
    if (!tournamentId) {
      console.log('❌ No tournament found');
      process.exit(1);
    }
    
    console.log(`✅ Tournament: ${tournamentName}\n`);

    // Get match by number
    const match = await getMatchByNumber(tournamentId, matchNumber);
    if (!match) {
      console.log(`❌ Match ${matchNumber} not found`);
      process.exit(1);
    }
    
    console.log(`✅ Match ${matchNumber}: ${match.teamAName} vs ${match.teamBName}`);
    console.log(`   Date: ${match.matchDate.toDate().toLocaleString()}\n`);

    // Get teams and players
    const teams = await getTeams(tournamentId);
    const players = await getMatchPlayers(match);
    
    // Ask for input method
    console.log('Choose input method:');
    console.log('  1. Paste CSV data');
    console.log('  2. Read from file');
    const inputMethod = await askQuestion(rl, '  Enter 1 or 2: ');
    
    let lines: string[] = [];
    
    if (inputMethod === '2') {
      // Read from file
      const filePath = await askQuestion(rl, 'Enter file path: ');
      if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${filePath}`);
        process.exit(1);
      }
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      lines = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    } else {
      // Paste CSV data
      console.log('\n📋 Paste CSV data (one prediction per line):');
      console.log('Format: email,WINNER,TEAM1:SCORE/WICKETS,TEAM2:SCORE/WICKETS,PLAYER_NAME');
      console.log('Example: user@example.com,JNB,KTG:C/10,JNB:C/7,Lahiru Milantha');
      console.log('\n💡 Tip: You can paste all lines at once or one at a time');
      console.log('   When done, press Enter on an empty line\n');
      
      // Read all lines
      lines = await readAllLines(rl);
    }
    
    if (lines.length === 0) {
      console.log('❌ No data provided');
      process.exit(1);
    }
    
    console.log(`\n📊 Received ${lines.length} line(s) to process`);
    console.log('Raw lines captured:');
    lines.forEach((line, idx) => {
      console.log(`   ${idx + 1}. ${line.substring(0, 60)}${line.length > 60 ? '...' : ''}`);
    });
    console.log('='.repeat(60));
    console.log('Processing predictions...\n');
    
    // Process each line
    const results: Array<{ success: boolean; message: string; backupPath?: string; email?: string; action?: string }> = [];
    const backupPaths: string[] = [];
    let processedCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const lineContent = lines[i];
      console.log(`[${lineNum}/${lines.length}] Processing line ${lineNum}...`);
      console.log(`   Raw: ${lineContent.substring(0, 80)}${lineContent.length > 80 ? '...' : ''}`);
      
      try {
        const result = await processPrediction(lineContent, match, matchNumber, teams, players, lineNum);
        results.push(result);
        processedCount++;
        
        if (result.backupPath) {
          backupPaths.push(result.backupPath);
        }
        
        // Enhanced logging
        if (result.success) {
          const action = result.message.includes('Updated') ? '🔄 UPDATED' : '✨ INSERTED';
          console.log(`   ${action}: ${result.email || 'User'}`);
        } else {
          console.log(`   ❌ FAILED: ${result.message}`);
        }
      } catch (error: any) {
        console.log(`   ❌ EXCEPTION: ${error.message || 'Unknown error'}`);
        results.push({
          success: false,
          message: `Exception: ${error.message || 'Unknown error'}`,
          email: lineContent.split(',')[0]?.trim() || 'unknown'
        });
        processedCount++;
      }
      console.log(''); // Empty line for readability
    }
    
    // Summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const updateCount = results.filter(r => r.success && r.message.includes('Updated')).length;
    const insertCount = results.filter(r => r.success && r.message.includes('Inserted')).length;
    
    console.log('='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Total lines received: ${lines.length}`);
    console.log(`   Total lines processed: ${processedCount}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`      - 🔄 Updated: ${updateCount}`);
    console.log(`      - ✨ Inserted: ${insertCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    
    if (backupPaths.length > 0) {
      console.log(`\n💾 ${backupPaths.length} backup(s) created:`);
      backupPaths.forEach(bp => console.log(`   - ${bp}`));
    }
    
    if (match.status === 'completed') {
      console.log(`\n⚠️  Note: Match ${matchNumber} is already completed. You may need to recalculate scores.`);
      console.log(`   Run: npm run recalculate-match ${match.id}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Get match number from command line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.log('Usage: npm run bulk-insert-prediction <matchNumber>');
  console.log('Example: npm run bulk-insert-prediction 2');
  console.log('Example: npm run bulk-insert-prediction 3');
  process.exit(1);
}

const matchNumber = parseInt(args[0], 10);
if (isNaN(matchNumber) || matchNumber < 1) {
  console.log('❌ Invalid match number. Please provide a positive integer.');
  process.exit(1);
}

bulkInsertPredictions(matchNumber);

