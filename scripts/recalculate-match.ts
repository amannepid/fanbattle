/**
 * Recalculate scores for a specific match
 * 
 * This script recalculates scores for a match without requiring admin UI access.
 * Useful when a match cannot be edited due to later matches being completed.
 * 
 * Usage: npm run recalculate-match <matchId>
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, getDocs, collection, query, where, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
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

// Helper functions (duplicated from firestore.ts to avoid auth dependency)
async function getMatches(tournamentId: string): Promise<Match[]> {
  const q = query(
    collection(db, 'matches'),
    where('tournamentId', '==', tournamentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
}

async function getUserEntry(userId: string): Promise<UserEntry | null> {
  const docRef = doc(db, 'userEntries', userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as UserEntry : null;
}

async function updateUserEntry(userId: string, data: Partial<UserEntry>): Promise<void> {
  const docRef = doc(db, 'userEntries', userId);
  await updateDoc(docRef, data);
}

async function getLeaderboard(tournamentId: string): Promise<UserEntry[]> {
  const q = query(
    collection(db, 'userEntries'),
    where('tournamentId', '==', tournamentId)
  );
  const snapshot = await getDocs(q);
  const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserEntry));
  // Sort by totalPoints descending, then by createdAt ascending
  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return (b.totalPoints || 0) - (a.totalPoints || 0);
    }
    const aTime = a.createdAt?.toMillis() || 0;
    const bTime = b.createdAt?.toMillis() || 0;
    return aTime - bTime;
  });
  return entries;
}

async function updatePrediction(predictionId: string, data: Partial<Prediction>): Promise<void> {
  const docRef = doc(db, 'predictions', predictionId);
  await updateDoc(docRef, data);
}

async function recalculateMatch(matchId: string) {
  console.log(`🔄 Recalculating scores for match: ${matchId}\n`);

  try {
    // 1. Get the match
    const matchDoc = await getDoc(doc(db, 'matches', matchId));
    if (!matchDoc.exists()) {
      console.log('❌ Match not found');
      return;
    }
    const match = { id: matchDoc.id, ...matchDoc.data() } as Match;
    
    console.log(`📋 Match: ${match.teamAName} vs ${match.teamBName}`);
    console.log(`   Type: ${match.matchType}, Number: ${match.matchNumber}\n`);

    if (match.status !== 'completed') {
      console.log('⚠️  Match is not completed. Cannot recalculate scores.');
      return;
    }

    // 2. Get all predictions for this match
    const predictionsSnapshot = await getDocs(query(
      collection(db, 'predictions'),
      where('matchId', '==', matchId)
    ));
    const predictions = predictionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Prediction));

    console.log(`📊 Found ${predictions.length} predictions to recalculate\n`);

    // 3. Get all matches to recalculate penalties
    const allMatches = await getMatches(match.tournamentId);
    const matchMap = new Map(allMatches.map((m) => [m.id, m]));

    // 4. Recalculate scores for each prediction
    for (const prediction of predictions) {
      const userEntry = await getUserEntry(prediction.userId);
      if (!userEntry) {
        console.log(`⚠️  User entry not found for user: ${prediction.userId}`);
        continue;
      }

      // Calculate new scores
      const scoringResult = calculatePoints(prediction, match, userEntry.seasonTeamId);
      const penaltyFee = calculatePenaltyFee(prediction, match);

      console.log(`👤 ${userEntry.userName}:`);
      console.log(`   Old Points: ${prediction.pointsEarned || 0}`);
      console.log(`   New Points: ${scoringResult.points}`);
      console.log(`   Breakdown: Base=${scoringResult.breakdown.basePoints}, Score=${scoringResult.breakdown.scoreBonus}, Wickets=${scoringResult.breakdown.wicketsBonus}, POM=${scoringResult.breakdown.momBonus}, Season=${scoringResult.breakdown.seasonTeamAdjustment}`);
      console.log(`   Old Penalty: $${prediction.penaltyFee || 0}`);
      console.log(`   New Penalty: $${penaltyFee}`);

      // Update prediction
      const updateData: any = {
        pointsEarned: scoringResult.points,
        isCorrectWinner: scoringResult.isCorrectWinner,
        isCorrectPom: scoringResult.isCorrectPom,
        isCorrectScoreCategory: scoringResult.isCorrectScoreCategory,
        isCorrectWickets: scoringResult.isCorrectWickets,
        seasonTeamAdjustment: scoringResult.breakdown.seasonTeamAdjustment,
        scoredAt: Timestamp.now(),
      };
      
      if (penaltyFee !== undefined && penaltyFee !== null) {
        updateData.penaltyFee = penaltyFee;
      }

      await updatePrediction(prediction.id, updateData);

      // Calculate new total points for user
      const allUserPredictions = await getDocs(query(
        collection(db, 'predictions'),
        where('userId', '==', prediction.userId)
      ));
      
      let newTotalPoints = 0;
      for (const predDoc of allUserPredictions.docs) {
        const pred = { id: predDoc.id, ...predDoc.data() } as Prediction;
        const predMatch = matchMap.get(pred.matchId);
        if (predMatch && predMatch.status === 'completed' && pred.pointsEarned !== undefined) {
          newTotalPoints += pred.pointsEarned;
        }
      }

      // Add tournament bonuses if they exist
      if (userEntry.tournamentBonuses) {
        const bonusTotal = 
          (userEntry.tournamentBonuses.seasonTeamWinsTitle || 0) +
          (userEntry.tournamentBonuses.playerOfTournament || 0) +
          (userEntry.tournamentBonuses.highestRunScorer || 0) +
          (userEntry.tournamentBonuses.highestWicketTaker || 0);
        newTotalPoints += bonusTotal;
      }

      // Recalculate total penalties
      let newTotalPenalties = 0;
      for (const predDoc of allUserPredictions.docs) {
        const pred = { id: predDoc.id, ...predDoc.data() } as Prediction;
        const predMatch = matchMap.get(pred.matchId);
        if (predMatch && predMatch.status === 'completed' && pred.penaltyFee) {
          newTotalPenalties += pred.penaltyFee;
        }
      }

      await updateUserEntry(prediction.userId, {
        totalPoints: newTotalPoints,
        totalPenalties: newTotalPenalties,
        netPoints: newTotalPoints - newTotalPenalties,
      });

      console.log(`   ✅ Updated: Total Points = ${newTotalPoints}, Total Penalties = $${newTotalPenalties}\n`);
    }

    // 5. Recalculate leaderboard ranks
    console.log('📊 Recalculating leaderboard ranks...');
    const leaderboard = await getLeaderboard(match.tournamentId);
    for (let i = 0; i < leaderboard.length; i++) {
      await updateUserEntry(leaderboard[i].userId, {
        currentRank: i + 1,
      });
    }
    console.log('✅ Leaderboard ranks updated\n');

    console.log('✅ Match recalculation completed!');

  } catch (error) {
    console.error('❌ Error recalculating match:', error);
    throw error;
  }
}

// Get match ID from command line argument
const matchId = process.argv[2];

if (!matchId) {
  console.log('❌ Please provide a match ID');
  console.log('Usage: npm run recalculate-match <matchId>');
  console.log('Example: npm run recalculate-match test-match-qualifier');
  process.exit(1);
}

recalculateMatch(matchId)
  .then(() => {
    console.log('\n✅ Recalculation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Recalculation failed:', error);
    process.exit(1);
  });

