/**
 * Insert predictions for any match for users
 * 
 * This script allows admins to manually insert predictions for any match
 * for users who need predictions added.
 * 
 * Usage: 
 *   npm run insert-prediction <matchNumber>
 *   npm run insert-prediction 2
 *   npm run insert-prediction 3
 * 
 * The script will prompt for:
 *   - User email or user ID
 *   - Winner prediction
 *   - Player of the Match
 *   - First innings predictions (Team A and Team B)
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
      // Convert Timestamps to ISO strings for JSON serialization
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

// Get user by email or ID
async function getUserByEmailOrId(emailOrId: string): Promise<UserEntry | null> {
  // Try as email first
  const userEntriesRef = collection(db, 'userEntries');
  const q = query(userEntriesRef, where('userEmail', '==', emailOrId));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as UserEntry;
  }
  
  // Try as user ID
  const userDoc = await getDoc(doc(db, 'userEntries', emailOrId));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() } as UserEntry;
  }
  
  return null;
}

// Get all players for a match (both teams)
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

// Display players for selection
function displayPlayers(players: Player[], teams: Team[]): void {
  console.log('\n📋 Available Players:');
  const playersByTeam = new Map<string, Player[]>();
  
  for (const player of players) {
    if (!playersByTeam.has(player.teamId)) {
      playersByTeam.set(player.teamId, []);
    }
    playersByTeam.get(player.teamId)!.push(player);
  }
  
  for (const [teamId, teamPlayers] of playersByTeam.entries()) {
    const team = teams.find(t => t.id === teamId);
    console.log(`\n  ${team?.name || teamId}:`);
    teamPlayers.forEach((player, index) => {
      console.log(`    ${index + 1}. ${player.name} (${player.role})`);
    });
  }
}

// Find player by name (fuzzy match)
function findPlayerByName(players: Player[], name: string): Player | null {
  const lowerName = name.toLowerCase();
  return players.find(p => 
    p.name.toLowerCase().includes(lowerName) || 
    lowerName.includes(p.name.toLowerCase())
  ) || null;
}

async function insertPrediction(matchNumber: number) {
  console.log(`🎯 Insert Match ${matchNumber} Prediction for User\n`);
  console.log('='.repeat(60));
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Get active tournament (check for test tournament first, then regular)
    let tournamentId: string | null = null;
    let tournamentName = '';
    
    // Try test tournament first
    const testTournamentRef = doc(db, 'tournaments', 'test-tournament-2025');
    const testTournamentSnap = await getDoc(testTournamentRef);
    if (testTournamentSnap.exists()) {
      tournamentId = testTournamentSnap.id;
      tournamentName = testTournamentSnap.data()?.name || tournamentId;
    } else {
      // Try regular tournament
      const tournamentsRef = collection(db, 'tournaments');
      const tournamentsSnapshot = await getDocs(tournamentsRef);
      if (!tournamentsSnapshot.empty) {
        // Get the first active tournament, or just the first one
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

    // Get user
    const emailOrId = await askQuestion(rl, 'Enter user email or user ID: ');
    const userEntry = await getUserByEmailOrId(emailOrId);
    
    if (!userEntry) {
      console.log(`❌ User not found: ${emailOrId}`);
      process.exit(1);
    }
    
    console.log(`✅ User: ${userEntry.userName} (${userEntry.userEmail})\n`);

    // Check if prediction already exists
    const predictionId = `${userEntry.userId}_${match.id}`;
    const existingPred = await getDoc(doc(db, 'predictions', predictionId));
    const isUpdate = existingPred.exists();
    
    let backupPath: string | null = null;
    if (isUpdate) {
      console.log('⚠️  Prediction already exists. Will update it.\n');
      // Create backup before updating
      const existingPrediction = { id: existingPred.id, ...existingPred.data() } as Prediction;
      backupPath = saveBackup(predictionId, existingPrediction, userEntry.userEmail);
      console.log(`💾 Backup saved to: ${backupPath}\n`);
    }

    // Get teams and players
    const teams = await getTeams(tournamentId);
    const players = await getMatchPlayers(match);
    
    // Ask for input method
    console.log('\n📊 Prediction Details:');
    console.log('\nChoose input method:');
    console.log('  1. Interactive (step by step)');
    console.log('  2. Paste formatted data');
    const inputMethod = await askQuestion(rl, '  Enter 1 or 2: ');
    
    let predictedWinnerId: string;
    let predictedWinnerName: string;
    let pomPlayer: Player | null = null;
    let teamAScore: string = '';
    let teamAWickets: string = '';
    let teamBScore: string = '';
    let teamBWickets: string = '';
    
    if (inputMethod === '2') {
      // Parse formatted input
      console.log('\n📋 Paste the prediction data in this format:');
      console.log('   <TEAM_A_ID> vs <TEAM_B_ID>');
      console.log('   Winner: <TEAM_ID>');
      console.log('   <TEAM_A_ID>: <SCORE_CATEGORY>/<WICKETS>');
      console.log('   <TEAM_B_ID>: <SCORE_CATEGORY>/<WICKETS>');
      console.log('   <PLAYER_NAME>');
      console.log('\nExample:');
      console.log('   JNB vs KTG');
      console.log('   Winner: JNB');
      console.log('   KTG: C/10');
      console.log('   JNB: C/7');
      console.log('   Lahiru Milantha');
      console.log('\n(Paste all lines, then press Enter twice to finish)');
      
      const lines: string[] = [];
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
      
      // Get team short codes for matching
      const teamA = teams.find(t => t.id === match.teamAId);
      const teamB = teams.find(t => t.id === match.teamBId);
      const teamAShortCode = teamA?.shortCode?.toUpperCase() || '';
      const teamBShortCode = teamB?.shortCode?.toUpperCase() || '';
      
      // Also try to extract from team ID (last part after dash)
      const teamAIdShort = match.teamAId.split('-').pop()?.toUpperCase() || '';
      const teamBIdShort = match.teamBId.split('-').pop()?.toUpperCase() || '';
      
      // Create team name abbreviations (first letters)
      const teamANameAbbr = match.teamAName.split(' ').map(w => w[0]).join('').toUpperCase();
      const teamBNameAbbr = match.teamBName.split(' ').map(w => w[0]).join('').toUpperCase();
      
      // Helper to match team identifier
      const matchesTeam = (identifier: string, teamId: string, teamName: string, shortCode: string, idShort: string, nameAbbr: string): boolean => {
        const upper = identifier.toUpperCase();
        return upper === shortCode || 
               upper === idShort || 
               upper === nameAbbr ||
               teamId.toUpperCase().includes(upper) ||
               teamName.toUpperCase().includes(upper);
      };
      
      let winnerLine = '';
      let teamALine = '';
      let teamBLine = '';
      let pomLine = '';
      
      // Parse lines
      for (const line of lines) {
        const upperLine = line.toUpperCase();
        
        if (upperLine.includes('WINNER:')) {
          winnerLine = line;
        } else if (line.includes('/')) {
          // Extract team identifier before the colon
          const matchResult = line.match(/^(\w+):/);
          if (matchResult) {
            const teamIdentifier = matchResult[1];
            if (matchesTeam(teamIdentifier, match.teamAId, match.teamAName, teamAShortCode, teamAIdShort, teamANameAbbr)) {
              teamALine = line;
            } else if (matchesTeam(teamIdentifier, match.teamBId, match.teamBName, teamBShortCode, teamBIdShort, teamBNameAbbr)) {
              teamBLine = line;
            }
          }
        } else if (!upperLine.includes('VS') && line.trim().length > 0) {
          // Last non-empty line that's not a team prediction is likely POM
          pomLine = line;
        }
      }
      
      // Parse winner
      const winnerMatch = winnerLine.match(/winner:\s*(\w+)/i);
      if (winnerMatch) {
        const winnerId = winnerMatch[1].toUpperCase();
        if (matchesTeam(winnerId, match.teamAId, match.teamAName, teamAShortCode, teamAIdShort, teamANameAbbr)) {
          predictedWinnerId = match.teamAId;
          predictedWinnerName = match.teamAName;
        } else if (matchesTeam(winnerId, match.teamBId, match.teamBName, teamBShortCode, teamBIdShort, teamBNameAbbr)) {
          predictedWinnerId = match.teamBId;
          predictedWinnerName = match.teamBName;
        } else {
          throw new Error(`Could not match winner "${winnerId}" to any team`);
        }
      } else {
        throw new Error('Could not parse winner from input. Expected format: "Winner: <TEAM_ID>"');
      }
      
      // Parse team predictions
      const parseTeamLine = (line: string): { score: string; wickets: string } | null => {
        const matchResult = line.match(/(\w+):\s*([A-F])\/(\d+)/i);
        if (matchResult) {
          const [, , score, wickets] = matchResult;
          return { score: score.toUpperCase(), wickets };
        }
        return null;
      };
      
      const teamAPred = teamALine ? parseTeamLine(teamALine) : null;
      const teamBPred = teamBLine ? parseTeamLine(teamBLine) : null;
      
      if (teamAPred) {
        teamAScore = teamAPred.score;
        teamAWickets = teamAPred.wickets;
      }
      if (teamBPred) {
        teamBScore = teamBPred.score;
        teamBWickets = teamBPred.wickets;
      }
      
      // Parse POM (last non-empty line that's not a prediction line)
      if (pomLine && pomLine.trim()) {
        pomPlayer = findPlayerByName(players, pomLine);
        if (!pomPlayer) {
          console.log(`⚠️  Player "${pomLine}" not found. Continuing without POM...`);
        }
      }
      
      console.log('\n✅ Parsed data:');
      console.log(`   Winner: ${predictedWinnerName}`);
      if (pomPlayer) console.log(`   POM: ${pomPlayer.name}`);
      console.log(`   ${match.teamAName}: ${teamAScore || 'N/A'}/${teamAWickets || 'N/A'}`);
      console.log(`   ${match.teamBName}: ${teamBScore || 'N/A'}/${teamBWickets || 'N/A'}`);
      
    } else {
      // Interactive mode
      console.log(`\n1. Winner (Required):`);
      console.log(`   A. ${match.teamAName}`);
      console.log(`   B. ${match.teamBName}`);
      const winnerChoice = await askQuestion(rl, '   Enter A or B: ');
      
      predictedWinnerId = winnerChoice.toUpperCase() === 'A' ? match.teamAId : match.teamBId;
      predictedWinnerName = winnerChoice.toUpperCase() === 'A' ? match.teamAName : match.teamBName;
      
      // Get Player of the Match
      displayPlayers(players, teams);
      const pomName = await askQuestion(rl, '\n2. Player of the Match (enter player name): ');
      pomPlayer = findPlayerByName(players, pomName);
      
      if (!pomPlayer) {
        console.log(`⚠️  Player "${pomName}" not found. Continuing without POM...`);
      }

      // Get first innings predictions
      console.log('\n3. First Innings Predictions:');
      console.log('   Score Categories: A (<130), B (131-145), C (146-160), D (161-175), E (176-190), F (191+)');
      
      teamAScore = await askQuestion(rl, `   If ${match.teamAName} bats first - Score Category (A-F, or skip): `);
      teamAWickets = await askQuestion(rl, `   If ${match.teamAName} bats first - Wickets (0-10, or skip): `);
      
      teamBScore = await askQuestion(rl, `   If ${match.teamBName} bats first - Score Category (A-F, or skip): `);
      teamBWickets = await askQuestion(rl, `   If ${match.teamBName} bats first - Wickets (0-10, or skip): `);
    }

    // Calculate submittedAt as current time (since game hasn't started)
    const submittedAtTimestamp = Timestamp.now();

    // Create prediction
    const prediction: Omit<Prediction, 'id'> = {
      userId: userEntry.userId,
      matchId: match.id,
      matchNumber: matchNumber,
      predictedWinnerId,
      predictedWinnerName,
      predictedPomId: pomPlayer?.id,
      predictedPomName: pomPlayer?.name,
      teamAScoreCategory: teamAScore && ['A', 'B', 'C', 'D', 'E', 'F'].includes(teamAScore.toUpperCase()) 
        ? teamAScore.toUpperCase() as any 
        : undefined,
      teamAWickets: teamAWickets && !isNaN(Number(teamAWickets)) 
        ? Number(teamAWickets) 
        : undefined,
      teamBScoreCategory: teamBScore && ['A', 'B', 'C', 'D', 'E', 'F'].includes(teamBScore.toUpperCase()) 
        ? teamBScore.toUpperCase() as any 
        : undefined,
      teamBWickets: teamBWickets && !isNaN(Number(teamBWickets)) 
        ? Number(teamBWickets) 
        : undefined,
      submittedAt: submittedAtTimestamp,
    };

    // Save or update prediction
    // Use merge: true to preserve existing scoring fields if match is already completed
    await setDoc(doc(db, 'predictions', predictionId), {
      ...prediction,
      id: predictionId,
    }, { merge: true });

    console.log(`\n✅ Prediction ${isUpdate ? 'updated' : 'inserted'} successfully!`);
    console.log(`   Prediction ID: ${predictionId}`);
    console.log(`   Winner: ${predictedWinnerName}`);
    if (pomPlayer) {
      console.log(`   POM: ${pomPlayer.name}`);
    }
    console.log(`   Team A: ${teamAScore || 'N/A'} / ${teamAWickets || 'N/A'} wickets`);
    console.log(`   Team B: ${teamBScore || 'N/A'} / ${teamBWickets || 'N/A'} wickets`);
    console.log(`   Submitted At: ${submittedAtTimestamp.toDate().toLocaleString()} (current time)`);
    
    if (isUpdate && match.status === 'completed') {
      console.log(`\n⚠️  Note: Match ${matchNumber} is already completed. You may need to recalculate scores.`);
      console.log(`   Run: npm run recalculate-match ${match.id}`);
    }
    
    if (backupPath) {
      console.log(`\n💾 Backup available at: ${backupPath}`);
      console.log('   To restore: npm run restore-prediction ' + path.basename(backupPath));
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
  console.log('Usage: npm run insert-prediction <matchNumber>');
  console.log('Example: npm run insert-prediction 2');
  console.log('Example: npm run insert-prediction 3');
  process.exit(1);
}

const matchNumber = parseInt(args[0], 10);
if (isNaN(matchNumber) || matchNumber < 1) {
  console.log('❌ Invalid match number. Please provide a positive integer.');
  process.exit(1);
}

insertPrediction(matchNumber);

