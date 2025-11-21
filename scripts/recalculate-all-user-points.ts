/**
 * Recalculate all user points from completed matches only
 * 
 * This script recalculates total points for all users by summing points
 * from their predictions for completed matches only.
 * 
 * Usage: npm run recalculate-all-user-points
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, getDocs, collection, query, where, updateDoc, Timestamp, orderBy } from 'firebase/firestore';
import { config } from 'dotenv';
import type { Match, Prediction, UserEntry, Tournament } from '../types';
import { TEST_USER_IDS } from '../lib/test-mode';

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

const COLLECTIONS = {
  tournaments: 'tournaments',
  matches: 'matches',
  userEntries: 'userEntries',
  predictions: 'predictions',
};

async function getActiveTournament(): Promise<Tournament | null> {
  const q = query(
    collection(db, COLLECTIONS.tournaments),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Tournament;
}

async function getMatches(tournamentId: string): Promise<Match[]> {
  const q = query(
    collection(db, COLLECTIONS.matches),
    where('tournamentId', '==', tournamentId),
    orderBy('matchNumber', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
}

async function getLeaderboard(tournamentId: string): Promise<UserEntry[]> {
  const q = query(
    collection(db, COLLECTIONS.userEntries),
    where('tournamentId', '==', tournamentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserEntry));
}

async function getUserPredictions(userId: string): Promise<Prediction[]> {
  const q = query(
    collection(db, COLLECTIONS.predictions),
    where('userId', '==', userId),
    orderBy('matchNumber', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prediction));
}

async function updateUserEntry(userId: string, data: Partial<UserEntry>): Promise<void> {
  // Prevent test users from being updated in Firestore
  const testUserIds = Object.values(TEST_USER_IDS);
  if (testUserIds.includes(userId)) {
    console.warn(`⚠️  Skipping test user: ${userId}`);
    return;
  }
  
  const docRef = doc(db, COLLECTIONS.userEntries, userId);
  await updateDoc(docRef, data);
}

async function recalculateAllUserPoints() {
  console.log('🔄 Recalculating all user points from completed matches only...\n');

  try {
    // 1. Get active tournament
    const tournament = await getActiveTournament();
    if (!tournament) {
      console.log('❌ No active tournament found');
      process.exit(1);
    }

    console.log(`📋 Tournament: ${tournament.name}\n`);

    // 2. Get all matches
    const matches = await getMatches(tournament.id);
    const matchMap = new Map(matches.map(m => [m.id, m]));
    
    // Filter completed matches
    const completedMatches = matches.filter(m => m.status === 'completed' && m.winnerId);
    console.log(`📊 Total matches: ${matches.length}`);
    console.log(`✅ Completed matches: ${completedMatches.length}\n`);

    // 3. Get all users
    const users = await getLeaderboard(tournament.id);
    console.log(`👥 Total users: ${users.length}\n`);

    // 4. Recalculate points for each user
    const updates: Array<{ userId: string; userName: string; oldPoints: number; newPoints: number; oldPenalties: number; newPenalties: number }> = [];

    for (const user of users) {
      // Skip test users
      const testUserIds = Object.values(TEST_USER_IDS);
      if (testUserIds.includes(user.userId)) {
        console.log(`⏭️  Skipping test user: ${user.userName}`);
        continue;
      }

      // Get all predictions for this user
      const predictions = await getUserPredictions(user.userId);
      
      // Calculate total points from completed matches only
      let newTotalPoints = 0;
      let newTotalPenalties = 0;
      
      for (const prediction of predictions) {
        const match = matchMap.get(prediction.matchId);
        
        // Only count points from completed matches
        if (match && match.status === 'completed' && match.winnerId) {
          // Use stored pointsEarned if available, otherwise 0
          if (prediction.pointsEarned !== undefined && prediction.pointsEarned !== null) {
            newTotalPoints += prediction.pointsEarned;
          }
          
          // Sum penalties from completed matches
          if (prediction.penaltyFee !== undefined && prediction.penaltyFee !== null) {
            newTotalPenalties += prediction.penaltyFee;
          }
        }
      }

      // Add tournament bonuses if tournament is completed
      if (tournament.status === 'completed' && user.tournamentBonuses) {
        const bonusTotal = 
          (user.tournamentBonuses.seasonTeamWinsTitle || 0) +
          (user.tournamentBonuses.playerOfTournament || 0) +
          (user.tournamentBonuses.highestRunScorer || 0) +
          (user.tournamentBonuses.highestWicketTaker || 0);
        newTotalPoints += bonusTotal;
      }

      const oldPoints = user.totalPoints || 0;
      const oldPenalties = user.totalPenalties || 0;

      // Update user entry
      await updateUserEntry(user.userId, {
        totalPoints: newTotalPoints,
        totalPenalties: newTotalPenalties,
        netPoints: newTotalPoints - newTotalPenalties,
      });

      updates.push({
        userId: user.userId,
        userName: user.userName,
        oldPoints,
        newPoints: newTotalPoints,
        oldPenalties,
        newPenalties: newTotalPenalties,
      });

      if (oldPoints !== newTotalPoints || oldPenalties !== newTotalPenalties) {
        console.log(`👤 ${user.userName}:`);
        console.log(`   Points: ${oldPoints} → ${newTotalPoints} (${newTotalPoints - oldPoints >= 0 ? '+' : ''}${newTotalPoints - oldPoints})`);
        console.log(`   Penalties: $${oldPenalties} → $${newTotalPenalties} (${newTotalPenalties - oldPenalties >= 0 ? '+' : ''}${newTotalPenalties - oldPenalties})`);
      }
    }

    // 5. Recalculate leaderboard ranks
    console.log('\n📊 Recalculating leaderboard ranks...');
    const updatedUsers = await getLeaderboard(tournament.id);
    
    // Sort by totalPoints descending, then by createdAt ascending
    updatedUsers.sort((a, b) => {
      const aPoints = a.totalPoints || 0;
      const bPoints = b.totalPoints || 0;
      if (bPoints !== aPoints) {
        return bPoints - aPoints;
      }
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return aTime - bTime;
    });

    for (let i = 0; i < updatedUsers.length; i++) {
      const user = updatedUsers[i];
      const testUserIds = Object.values(TEST_USER_IDS);
      if (testUserIds.includes(user.userId)) {
        continue; // Skip test users
      }
      
      await updateUserEntry(user.userId, {
        currentRank: i + 1,
      });
    }
    console.log('✅ Leaderboard ranks updated\n');

    // 6. Summary
    console.log('📊 Summary:');
    const changedUsers = updates.filter(u => u.oldPoints !== u.newPoints || u.oldPenalties !== u.newPenalties);
    console.log(`   Total users processed: ${updates.length}`);
    console.log(`   Users with changes: ${changedUsers.length}`);
    
    if (changedUsers.length > 0) {
      console.log('\n   Changes:');
      changedUsers.forEach(u => {
        console.log(`   - ${u.userName}: Points ${u.oldPoints} → ${u.newPoints}, Penalties $${u.oldPenalties} → $${u.newPenalties}`);
      });
    }

    console.log('\n✅ All user points recalculated successfully!');

  } catch (error) {
    console.error('❌ Error recalculating user points:', error);
    throw error;
  }
}

recalculateAllUserPoints()
  .then(() => {
    console.log('\n✅ Recalculation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Recalculation failed:', error);
    process.exit(1);
  });

