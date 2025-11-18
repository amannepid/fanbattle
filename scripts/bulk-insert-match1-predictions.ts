/**
 * Bulk insert/update Match 1 predictions from CSV format
 * 
 * Format: emailaddress,WINNER,TEAM1:SCORE/WICKETS,TEAM2:SCORE/WICKETS,PLAYER_NAME
 * Example: user@example.com,JNB,KTG:C/10,JNB:C/7,Lahiru Milantha
 * 
 * Usage: 
 *   npm run bulk-insert-match1-predictions
 * 
 * The script will:
 *   1. Ask if you want to paste data or read from file
 *   2. Process each line
 *   3. Create/update predictions
 *   4. Show summary
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
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

// Get Match 1
async function getMatch1(tournamentId: string): Promise<Match | null> {
  const matchesRef = collection(db, 'matches');
  const q = query(
    matchesRef,
    where('tournamentId', '==', tournamentId),
    where('matchNumber', '==', 1)
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
  match1: Match, 
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
  const parts = line.split(',').map(p => p.trim());
  
  if (parts.length < 2) {
    return null;
  }
  
  const email = parts[0];
  const winner = parts[1];
  
  // Get team short codes
  const teamA = teams.find(t => t.id === match1.teamAId);
  const teamB = teams.find(t => t.id === match1.teamBId);
  const teamAShortCode = teamA?.shortCode?.toUpperCase() || '';
  const teamBShortCode = teamB?.shortCode?.toUpperCase() || '';
  const teamAIdShort = match1.teamAId.split('-').pop()?.toUpperCase() || '';
  const teamBIdShort = match1.teamBId.split('-').pop()?.toUpperCase() || '';
  const teamANameAbbr = match1.teamAName.split(' ').map(w => w[0]).join('').toUpperCase();
  const teamBNameAbbr = match1.teamBName.split(' ').map(w => w[0]).join('').toUpperCase();
  
  // Determine winner
  let winnerId: string;
  let winnerName: string;
  
  if (matchesTeam(winner, match1.teamAId, match1.teamAName, teamAShortCode, teamAIdShort, teamANameAbbr)) {
    winnerId = match1.teamAId;
    winnerName = match1.teamAName;
  } else if (matchesTeam(winner, match1.teamBId, match1.teamBName, teamBShortCode, teamBIdShort, teamBNameAbbr)) {
    winnerId = match1.teamBId;
    winnerName = match1.teamBName;
  } else {
    throw new Error(`Could not match winner "${winner}" to any team`);
  }
  
  // Parse team predictions
  let teamAScore: string | undefined;
  let teamAWickets: string | undefined;
  let teamBScore: string | undefined;
  let teamBWickets: string | undefined;
  let pomName: string | undefined;
  
  for (let i = 2; i < parts.length; i++) {
    const part = parts[i];
    
    // Check if it's a team prediction (format: TEAM:SCORE/WICKETS)
    const teamPredMatch = part.match(/^(\w+):([A-F])\/(\d+)$/i);
    if (teamPredMatch) {
      const [, teamId, score, wickets] = teamPredMatch;
      if (matchesTeam(teamId, match1.teamAId, match1.teamAName, teamAShortCode, teamAIdShort, teamANameAbbr)) {
        teamAScore = score.toUpperCase();
        teamAWickets = wickets;
      } else if (matchesTeam(teamId, match1.teamBId, match1.teamBName, teamBShortCode, teamBIdShort, teamBNameAbbr)) {
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
  match1: Match,
  teams: Team[],
  players: Player[],
  lineNumber: number
): Promise<{ success: boolean; message: string; backupPath?: string }> {
  try {
    const parsed = parseCSVLine(csvLine, match1, teams);
    if (!parsed) {
      return { success: false, message: `Line ${lineNumber}: Invalid format` };
    }
    
    // Get user
    const userEntry = await getUserByEmail(parsed.email);
    if (!userEntry) {
      return { success: false, message: `Line ${lineNumber}: User not found: ${parsed.email}` };
    }
    
    // Check if prediction exists
    const predictionId = `${userEntry.userId}_${match1.id}`;
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
    }
    
    // Calculate submittedAt
    const matchStartTime = match1.matchDate.toDate();
    const submittedAtDate = new Date(matchStartTime.getTime() - (6.5 * 60 * 60 * 1000));
    const submittedAtTimestamp = Timestamp.fromDate(submittedAtDate);
    
    // Create prediction
    const prediction: Omit<Prediction, 'id'> = {
      userId: userEntry.userId,
      matchId: match1.id,
      matchNumber: 1,
      predictedWinnerId: parsed.winnerId,
      predictedWinnerName: parsed.winnerName,
      predictedPomId: pomPlayer?.id,
      predictedPomName: pomPlayer?.name,
      teamAScoreCategory: parsed.teamAScore && ['A', 'B', 'C', 'D', 'E', 'F'].includes(parsed.teamAScore.toUpperCase()) 
        ? parsed.teamAScore.toUpperCase() as any 
        : undefined,
      teamAWickets: parsed.teamAWickets && !isNaN(Number(parsed.teamAWickets)) 
        ? Number(parsed.teamAWickets) 
        : undefined,
      teamBScoreCategory: parsed.teamBScore && ['A', 'B', 'C', 'D', 'E', 'F'].includes(parsed.teamBScore.toUpperCase()) 
        ? parsed.teamBScore.toUpperCase() as any 
        : undefined,
      teamBWickets: parsed.teamBWickets && !isNaN(Number(parsed.teamBWickets)) 
        ? Number(parsed.teamBWickets) 
        : undefined,
      submittedAt: submittedAtTimestamp,
    };
    
    // Save prediction
    await setDoc(doc(db, 'predictions', predictionId), {
      ...prediction,
      id: predictionId,
    }, { merge: true });
    
    return {
      success: true,
      message: `Line ${lineNumber}: ${isUpdate ? 'Updated' : 'Inserted'} prediction for ${parsed.email}`,
      backupPath,
    };
  } catch (error: any) {
    return { success: false, message: `Line ${lineNumber}: ${error.message || 'Unknown error'}` };
  }
}

async function bulkInsertPredictions() {
  console.log('🎯 Bulk Insert Match 1 Predictions\n');
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

    // Get Match 1
    const match1 = await getMatch1(tournamentId);
    if (!match1) {
      console.log('❌ Match 1 not found');
      process.exit(1);
    }
    
    console.log(`✅ Match 1: ${match1.teamAName} vs ${match1.teamBName}`);
    console.log(`   Date: ${match1.matchDate.toDate().toLocaleString()}\n`);

    // Get teams and players
    const teams = await getTeams(tournamentId);
    const players = await getMatchPlayers(match1);
    
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
      console.log('\n(Paste all lines, then press Enter twice to finish)\n');
      
      let emptyCount = 0;
      while (true) {
        const line = await askQuestion(rl, lines.length === 0 ? 'Paste data:\n' : '');
        if (line.trim() === '') {
          emptyCount++;
          if (emptyCount >= 2 || lines.length > 0) break;
        } else {
          emptyCount = 0;
          lines.push(line.trim());
        }
      }
    }
    
    if (lines.length === 0) {
      console.log('❌ No data provided');
      process.exit(1);
    }
    
    console.log(`\n📊 Processing ${lines.length} predictions...\n`);
    
    // Process each line
    const results: Array<{ success: boolean; message: string; backupPath?: string }> = [];
    const backupPaths: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const result = await processPrediction(lines[i], match1, teams, players, i + 1);
      results.push(result);
      if (result.backupPath) {
        backupPaths.push(result.backupPath);
      }
      console.log(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
    }
    
    // Summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    
    if (backupPaths.length > 0) {
      console.log(`\n💾 ${backupPaths.length} backup(s) created:`);
      backupPaths.forEach(bp => console.log(`   - ${bp}`));
    }
    
    if (match1.status === 'completed') {
      console.log('\n⚠️  Note: Match 1 is already completed. You may need to recalculate scores.');
      console.log('   Run: npm run recalculate-match match-1');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

bulkInsertPredictions();

