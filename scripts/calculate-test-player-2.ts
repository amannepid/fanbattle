/**
 * Calculate Test Player 2's Final Result
 * 
 * This script calculates the total points, penalties, and bonuses for Test Player 2
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { config } from 'dotenv';
import { calculatePoints, calculatePenaltyFee } from '../lib/scoring';
import type { Match, Prediction, UserEntry } from '../types';

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

const TEST_USER_ID = 'test-user-2-id';
const TEST_TOURNAMENT_ID = 'test-tournament-2025';

async function calculateTestPlayer2Result() {
  console.log('🧮 Calculating Test Player 2 Final Result...\n');

  try {
    // 1. Get user entry
    const userEntryDoc = await getDoc(doc(db, 'userEntries', TEST_USER_ID));
    if (!userEntryDoc.exists()) {
      console.log('❌ Test Player 2 entry not found');
      return;
    }
    const userEntry = { id: userEntryDoc.id, ...userEntryDoc.data() } as UserEntry;
    console.log('📋 User Entry:');
    console.log(`   Name: ${userEntry.userName}`);
    console.log(`   Season Team: ${userEntry.seasonTeamName}`);
    console.log(`   Current Total Points: ${userEntry.totalPoints || 0}`);
    console.log(`   Current Total Penalties: ${userEntry.totalPenalties || 0}`);
    console.log('');

    // 2. Get all matches
    const matchesSnapshot = await getDocs(query(
      collection(db, 'matches'),
      where('tournamentId', '==', TEST_TOURNAMENT_ID)
    ));
    const matches = matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Match));
    
    // Sort by match number
    matches.sort((a, b) => a.matchNumber - b.matchNumber);
    
    console.log(`📊 Found ${matches.length} matches:`);
    matches.forEach(m => {
      console.log(`   Match ${m.matchNumber} (${m.matchType}): ${m.teamAName} vs ${m.teamBName} - Status: ${m.status}`);
      if (m.status === 'completed') {
        console.log(`      Winner: ${m.winnerName}`);
        console.log(`      First Innings: ${m.firstInningsScore} runs / ${m.firstInningsWickets} wickets (${m.firstInningsBattingTeamId === m.teamAId ? m.teamAName : m.teamBName})`);
        console.log(`      POM: ${m.momName}`);
      }
    });
    console.log('');

    // 3. Get all predictions for Test Player 2
    const predictionsSnapshot = await getDocs(query(
      collection(db, 'predictions'),
      where('userId', '==', TEST_USER_ID)
    ));
    const predictions = predictionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Prediction));

    console.log(`🎯 Found ${predictions.length} predictions:`);
    predictions.forEach(p => {
      const match = matches.find(m => m.id === p.matchId);
      console.log(`   Match ${p.matchNumber} (${match?.matchType || 'unknown'}):`);
      console.log(`      Predicted Winner: ${p.predictedWinnerName}`);
      console.log(`      Predicted POM: ${p.predictedPomName || 'Not set'}`);
      if (p.teamAScoreCategory || p.teamAWickets !== undefined) {
        console.log(`      ${match?.teamAName || 'Team A'}: ${p.teamAScoreCategory || '-'} / ${p.teamAWickets !== undefined ? p.teamAWickets : '-'} wickets`);
      }
      if (p.teamBScoreCategory || p.teamBWickets !== undefined) {
        console.log(`      ${match?.teamBName || 'Team B'}: ${p.teamBScoreCategory || '-'} / ${p.teamBWickets !== undefined ? p.teamBWickets : '-'} wickets`);
      }
    });
    console.log('');

    // 4. Calculate points for each completed match
    const completedMatches = matches.filter(m => m.status === 'completed');
    console.log(`📈 Calculating points for ${completedMatches.length} completed matches:\n`);

    let totalPoints = 0;
    let totalPenalties = 0;
    const matchResults: Array<{
      matchNumber: number;
      matchType: string;
      teams: string;
      prediction: string;
      actual: string;
      points: number;
      penalty: number;
      breakdown: any;
    }> = [];

    for (const match of completedMatches) {
      const prediction = predictions.find(p => p.matchId === match.id);
      
      if (!prediction) {
        console.log(`⚠️  Match ${match.matchNumber}: No prediction found`);
        continue;
      }

      // Calculate points
      const scoringResult = calculatePoints(prediction, match, userEntry.seasonTeamId);
      const penaltyFee = calculatePenaltyFee(prediction, match);

      totalPoints += scoringResult.points;
      totalPenalties += penaltyFee;

      matchResults.push({
        matchNumber: match.matchNumber,
        matchType: match.matchType,
        teams: `${match.teamAName} vs ${match.teamBName}`,
        prediction: prediction.predictedWinnerName || 'Unknown',
        actual: match.winnerName || 'Unknown',
        points: scoringResult.points,
        penalty: penaltyFee,
        breakdown: scoringResult.breakdown,
      });

      console.log(`Match ${match.matchNumber} (${match.matchType}): ${match.teamAName} vs ${match.teamBName}`);
      console.log(`   Predicted: ${prediction.predictedWinnerName}`);
      console.log(`   Actual: ${match.winnerName}`);
      console.log(`   Winner Correct: ${scoringResult.isCorrectWinner ? '✅' : '❌'}`);
      console.log(`   POM Correct: ${scoringResult.isCorrectPom ? '✅' : '❌'}`);
      console.log(`   Score Category Correct: ${scoringResult.isCorrectScoreCategory ? '✅' : '❌'}`);
      console.log(`   Wickets Correct: ${scoringResult.isCorrectWickets ? '✅' : '❌'}`);
      console.log(`   Points Breakdown:`);
      console.log(`      Base Points: ${scoringResult.breakdown.basePoints}`);
      console.log(`      POM Bonus: ${scoringResult.breakdown.momBonus}`);
      console.log(`      Score Bonus: ${scoringResult.breakdown.scoreBonus}`);
      console.log(`      Wickets Bonus: ${scoringResult.breakdown.wicketsBonus}`);
      console.log(`      Season Team Adjustment: ${scoringResult.breakdown.seasonTeamAdjustment}`);
      console.log(`   Total Points: ${scoringResult.points}`);
      console.log(`   Penalty: $${penaltyFee}`);
      console.log('');
    }

    // 5. Check tournament bonuses
    const tournamentDoc = await getDoc(doc(db, 'tournaments', TEST_TOURNAMENT_ID));
    const tournament = tournamentDoc.exists() ? tournamentDoc.data() : null;
    
    let tournamentBonuses = 0;
    if (tournament) {
      console.log('🏆 Tournament End Results:');
      console.log(`   Winner: ${tournament.winnerTeamName || 'Not set'}`);
      console.log(`   Player of Tournament: ${tournament.playerOfTournamentName || 'Not set'}`);
      console.log(`   Highest Run Scorer: ${tournament.highestRunScorerName || 'Not set'}`);
      console.log(`   Highest Wicket Taker: ${tournament.highestWicketTakerName || 'Not set'}`);
      console.log('');

      // Calculate tournament bonuses
      if (tournament.winnerTeamId && userEntry.seasonTeamId === tournament.winnerTeamId) {
        tournamentBonuses += 5;
        console.log('✅ Season Team Wins Title: +5 points');
      }
      if (tournament.playerOfTournamentId && userEntry.playerOfTournamentId === tournament.playerOfTournamentId) {
        tournamentBonuses += 5;
        console.log('✅ Player of Tournament: +5 points');
      }
      if (tournament.highestRunScorerId && userEntry.highestRunScorerId === tournament.highestRunScorerId) {
        tournamentBonuses += 5;
        console.log('✅ Highest Run Scorer: +5 points');
      }
      if (tournament.highestWicketTakerId && userEntry.highestWicketTakerId === tournament.highestWicketTakerId) {
        tournamentBonuses += 5;
        console.log('✅ Highest Wicket Taker: +5 points');
      }
      console.log('');
    }

    // 6. Final Summary
    const netPoints = totalPoints + tournamentBonuses;
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 FINAL RESULT FOR TEST PLAYER 2');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Player: ${userEntry.userName}`);
    console.log(`Season Team: ${userEntry.seasonTeamName}`);
    console.log('');
    console.log('Match Points:');
    matchResults.forEach(mr => {
      console.log(`   Match ${mr.matchNumber} (${mr.matchType}): ${mr.points} points, $${mr.penalty} penalty`);
    });
    console.log('');
    console.log(`Total Match Points: ${totalPoints}`);
    console.log(`Tournament Bonuses: ${tournamentBonuses}`);
    console.log(`Total Penalties: $${totalPenalties}`);
    console.log('');
    console.log(`NET POINTS: ${netPoints}`);
    console.log(`TOTAL PENALTIES: $${totalPenalties}`);
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error calculating result:', error);
    throw error;
  }
}

calculateTestPlayer2Result()
  .then(() => {
    console.log('\n✅ Calculation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Calculation failed:', error);
    process.exit(1);
  });

