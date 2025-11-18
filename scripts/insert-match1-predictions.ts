/**
 * Insert Match 1 predictions for users who signed up after the deadline
 * 
 * This script allows admins to manually insert predictions for Match 1
 * for users who registered after the prediction deadline.
 * 
 * Usage: 
 *   npm run insert-match1-predictions
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

// Restore from backup
async function restoreFromBackup(backupPath: string): Promise<void> {
  try {
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    const { prediction } = backupData;
    
    // Convert ISO strings back to Timestamps
    const restoredPrediction = {
      ...prediction,
      submittedAt: prediction.submittedAt ? Timestamp.fromDate(new Date(prediction.submittedAt)) : undefined,
      scoredAt: prediction.scoredAt ? Timestamp.fromDate(new Date(prediction.scoredAt)) : undefined,
    };
    
    await setDoc(doc(db, 'predictions', prediction.id), restoredPrediction);
    console.log(`✅ Prediction restored from backup: ${backupPath}`);
  } catch (error) {
    console.error('❌ Error restoring backup:', error);
    throw error;
  }
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

async function insertPrediction() {
  console.log('🎯 Insert Match 1 Prediction for User\n');
  console.log('=' .repeat(60));
  
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

    // Get Match 1
    const match1 = await getMatch1(tournamentId);
    if (!match1) {
      console.log('❌ Match 1 not found');
      process.exit(1);
    }
    
    console.log(`✅ Match 1: ${match1.teamAName} vs ${match1.teamBName}`);
    console.log(`   Date: ${match1.matchDate.toDate().toLocaleString()}\n`);

    // Get user
    const emailOrId = await askQuestion(rl, 'Enter user email or user ID: ');
    const userEntry = await getUserByEmailOrId(emailOrId);
    
    if (!userEntry) {
      console.log(`❌ User not found: ${emailOrId}`);
      process.exit(1);
    }
    
    console.log(`✅ User: ${userEntry.userName} (${userEntry.userEmail})\n`);

    // Check if prediction already exists
    const predictionId = `${userEntry.userId}_${match1.id}`;
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
    const players = await getMatchPlayers(match1);
    
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
      const teamA = teams.find(t => t.id === match1.teamAId);
      const teamB = teams.find(t => t.id === match1.teamBId);
      const teamAShortCode = teamA?.shortCode?.toUpperCase() || '';
      const teamBShortCode = teamB?.shortCode?.toUpperCase() || '';
      
      // Also try to extract from team ID (last part after dash)
      const teamAIdShort = match1.teamAId.split('-').pop()?.toUpperCase() || '';
      const teamBIdShort = match1.teamBId.split('-').pop()?.toUpperCase() || '';
      
      // Create team name abbreviations (first letters)
      const teamANameAbbr = match1.teamAName.split(' ').map(w => w[0]).join('').toUpperCase();
      const teamBNameAbbr = match1.teamBName.split(' ').map(w => w[0]).join('').toUpperCase();
      
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
          const match = line.match(/^(\w+):/);
          if (match) {
            const teamIdentifier = match[1];
            if (matchesTeam(teamIdentifier, match1.teamAId, match1.teamAName, teamAShortCode, teamAIdShort, teamANameAbbr)) {
              teamALine = line;
            } else if (matchesTeam(teamIdentifier, match1.teamBId, match1.teamBName, teamBShortCode, teamBIdShort, teamBNameAbbr)) {
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
        if (matchesTeam(winnerId, match1.teamAId, match1.teamAName, teamAShortCode, teamAIdShort, teamANameAbbr)) {
          predictedWinnerId = match1.teamAId;
          predictedWinnerName = match1.teamAName;
        } else if (matchesTeam(winnerId, match1.teamBId, match1.teamBName, teamBShortCode, teamBIdShort, teamBNameAbbr)) {
          predictedWinnerId = match1.teamBId;
          predictedWinnerName = match1.teamBName;
        } else {
          throw new Error(`Could not match winner "${winnerId}" to any team`);
        }
      } else {
        throw new Error('Could not parse winner from input. Expected format: "Winner: <TEAM_ID>"');
      }
      
      // Parse team predictions
      const parseTeamLine = (line: string): { score: string; wickets: string } | null => {
        const match = line.match(/(\w+):\s*([A-F])\/(\d+)/i);
        if (match) {
          const [, , score, wickets] = match;
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
      console.log(`   ${match1.teamAName}: ${teamAScore || 'N/A'}/${teamAWickets || 'N/A'}`);
      console.log(`   ${match1.teamBName}: ${teamBScore || 'N/A'}/${teamBWickets || 'N/A'}`);
      
    } else {
      // Interactive mode (original)
      console.log(`\n1. Winner (Required):`);
      console.log(`   A. ${match1.teamAName}`);
      console.log(`   B. ${match1.teamBName}`);
      const winnerChoice = await askQuestion(rl, '   Enter A or B: ');
      
      predictedWinnerId = winnerChoice.toUpperCase() === 'A' ? match1.teamAId : match1.teamBId;
      predictedWinnerName = winnerChoice.toUpperCase() === 'A' ? match1.teamAName : match1.teamBName;
      
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
      
      teamAScore = await askQuestion(rl, `   If ${match1.teamAName} bats first - Score Category (A-F, or skip): `);
      teamAWickets = await askQuestion(rl, `   If ${match1.teamAName} bats first - Wickets (0-10, or skip): `);
      
      teamBScore = await askQuestion(rl, `   If ${match1.teamBName} bats first - Score Category (A-F, or skip): `);
      teamBWickets = await askQuestion(rl, `   If ${match1.teamBName} bats first - Wickets (0-10, or skip): `);
    }

    // Calculate submittedAt as 6+ hours before match start time
    const matchStartTime = match1.matchDate.toDate();
    const submittedAtDate = new Date(matchStartTime.getTime() - (6.5 * 60 * 60 * 1000)); // 6.5 hours before match start
    const submittedAtTimestamp = Timestamp.fromDate(submittedAtDate);

    // Create prediction
    const prediction: Omit<Prediction, 'id'> = {
      userId: userEntry.userId,
      matchId: match1.id,
      matchNumber: 1,
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
    console.log(`   Submitted At: ${submittedAtDate.toLocaleString()} (6.5 hours before match start)`);
    
    if (isUpdate && match1.status === 'completed') {
      console.log('\n⚠️  Note: Match 1 is already completed. You may need to recalculate scores.');
      console.log('   Run: npm run recalculate-match match-1');
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

insertPrediction();

