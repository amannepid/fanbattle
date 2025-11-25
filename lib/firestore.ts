import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  deleteField,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Tournament, Team, Player, Match, UserEntry, Prediction } from '@/types';
import { cache, CACHE_KEYS } from './cache';
import { TEST_USER_IDS } from './test-mode';

// Check if test mode is enabled (works on both client and server)
const isTestModeEnabled = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === 'true';
  }
  // Server-side: check environment variable
  return process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === 'true';
};

// Collections
const COLLECTIONS = {
  tournaments: 'tournaments',
  teams: 'teams',
  players: 'players',
  matches: 'matches',
  userEntries: 'userEntries',
  predictions: 'predictions',
};

// Tournaments
export async function getTournament(id: string): Promise<Tournament | null> {
  const docRef = doc(db, COLLECTIONS.tournaments, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Tournament : null;
}

export async function getActiveTournament(): Promise<Tournament | null> {
  // Check cache first
  const cached = cache.get<Tournament | null>(CACHE_KEYS.activeTournament);
  if (cached !== null) {
    return cached;
  }

  // In test mode, prioritize test tournament
  if (isTestModeEnabled()) {
    const testTournamentRef = doc(db, COLLECTIONS.tournaments, 'test-tournament-2025');
    const testTournamentSnap = await getDoc(testTournamentRef);
    if (testTournamentSnap.exists()) {
      const testTournament = { id: testTournamentSnap.id, ...testTournamentSnap.data() } as Tournament;
      console.log('🧪 Test mode: Using test tournament', testTournament.id);
      // Cache for 10 minutes (tournament doesn't change often)
      cache.set(CACHE_KEYS.activeTournament, testTournament, 10 * 60 * 1000);
      return testTournament;
    }
  }

  const q = query(
    collection(db, COLLECTIONS.tournaments),
    where('status', '==', 'active'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  const result = snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Tournament;
  
  // Cache for 10 minutes (tournament doesn't change often)
  cache.set(CACHE_KEYS.activeTournament, result, 10 * 60 * 1000);
  return result;
}

// Teams
export async function getTeams(tournamentId: string): Promise<Team[]> {
  // Check cache first
  const cacheKey = CACHE_KEYS.teams(tournamentId);
  const cached = cache.get<Team[]>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const q = query(
    collection(db, COLLECTIONS.teams),
    where('tournamentId', '==', tournamentId)
  );
  const snapshot = await getDocs(q);
  const result = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
  
  // Cache for 10 minutes (teams don't change often)
  cache.set(cacheKey, result, 10 * 60 * 1000);
  return result;
}

export async function getTeam(id: string): Promise<Team | null> {
  const docRef = doc(db, COLLECTIONS.teams, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Team : null;
}

// Players
export async function getPlayers(teamId: string): Promise<Player[]> {
  const q = query(
    collection(db, COLLECTIONS.players),
    where('teamId', '==', teamId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
}

export async function getAllPlayers(tournamentId: string): Promise<Player[]> {
  // Check cache first
  const cacheKey = CACHE_KEYS.allPlayers(tournamentId);
  const cached = cache.get<Player[]>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Get all teams first
  const teams = await getTeams(tournamentId);
  const teamIds = teams.map(t => t.id);
  
  // Fetch all players in parallel instead of sequentially
  const playerPromises = teamIds.map(teamId => getPlayers(teamId));
  const playerArrays = await Promise.all(playerPromises);
  const allPlayers = playerArrays.flat();
  
  // Cache for 10 minutes (players don't change often)
  cache.set(cacheKey, allPlayers, 10 * 60 * 1000);
  return allPlayers;
}

// Matches
export async function getMatches(tournamentId: string): Promise<Match[]> {
  // Check cache first
  const cacheKey = CACHE_KEYS.matches(tournamentId);
  const cached = cache.get<Match[]>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const q = query(
    collection(db, COLLECTIONS.matches),
    where('tournamentId', '==', tournamentId),
    orderBy('matchNumber', 'asc')
  );
  const snapshot = await getDocs(q);
  const result = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
  
  // Cache for 5 minutes (matches can change when results are entered)
  cache.set(cacheKey, result, 5 * 60 * 1000);
  return result;
}

export async function getMatch(id: string): Promise<Match | null> {
  const docRef = doc(db, COLLECTIONS.matches, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Match : null;
}

export async function getUpcomingMatches(tournamentId: string, limitCount = 5): Promise<Match[]> {
  const now = Timestamp.now();
  const q = query(
    collection(db, COLLECTIONS.matches),
    where('tournamentId', '==', tournamentId),
    where('status', '==', 'upcoming'),
    where('matchDate', '>', now),
    orderBy('matchDate', 'asc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
}

// User Entries
export async function getUserEntry(userId: string): Promise<UserEntry | null> {
  // Check cache first
  const cacheKey = CACHE_KEYS.userEntry(userId);
  const cached = cache.get<UserEntry | null>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Check for test user entry in localStorage (for test mode)
  const testUserIds = Object.values(TEST_USER_IDS);
  if (testUserIds.includes(userId) && typeof window !== 'undefined') {
    const testUserEntryStr = localStorage.getItem(`testUserEntry_${userId}`);
    if (testUserEntryStr) {
      try {
        const parsed = JSON.parse(testUserEntryStr);
        // Convert ISO string back to Timestamp
        const testUserEntry: UserEntry = {
          ...parsed,
          createdAt: parsed.createdAt ? Timestamp.fromDate(new Date(parsed.createdAt)) : Timestamp.now(),
        };
        cache.set(cacheKey, testUserEntry, 2 * 60 * 1000);
        return testUserEntry;
      } catch (e) {
        console.error('Error parsing test user entry:', e);
      }
    }
  }

  const docRef = doc(db, COLLECTIONS.userEntries, userId);
  const docSnap = await getDoc(docRef);
  const result = docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as UserEntry : null;
  
  // Cache for 2 minutes (user entries change when scores are calculated)
  cache.set(cacheKey, result, 2 * 60 * 1000);
  return result;
}

export async function createUserEntry(userEntry: Omit<UserEntry, 'id'>): Promise<void> {
  const testUserIds = Object.values(TEST_USER_IDS);
  
  // For test users, store in localStorage instead of Firestore
  if (testUserIds.includes(userEntry.userId)) {
    if (typeof window !== 'undefined') {
      const entryWithId: UserEntry = { ...userEntry, id: userEntry.userId };
      // Convert Timestamp to serializable format for localStorage
      const serializableEntry = {
        ...entryWithId,
        createdAt: entryWithId.createdAt?.toDate?.()?.toISOString() || entryWithId.createdAt,
      };
      localStorage.setItem(`testUserEntry_${userEntry.userId}`, JSON.stringify(serializableEntry));
      console.log('✅ Test user entry saved to localStorage:', userEntry.userId);
    }
    // Invalidate cache
    cache.delete(CACHE_KEYS.userEntry(userEntry.userId));
    return;
  }
  
  const docRef = doc(db, COLLECTIONS.userEntries, userEntry.userId);
  await setDoc(docRef, userEntry);
  
  // Invalidate cache
  cache.delete(CACHE_KEYS.userEntry(userEntry.userId));
}

export async function updateUserEntry(userId: string, data: Partial<UserEntry>): Promise<void> {
  const testUserIds = Object.values(TEST_USER_IDS);
  
  // For test users, update localStorage instead of Firestore
  if (testUserIds.includes(userId)) {
    if (typeof window !== 'undefined') {
      const testUserEntryStr = localStorage.getItem(`testUserEntry_${userId}`);
      if (testUserEntryStr) {
        try {
          const parsed = JSON.parse(testUserEntryStr);
          const existingEntry: UserEntry = {
            ...parsed,
            createdAt: parsed.createdAt ? Timestamp.fromDate(new Date(parsed.createdAt)) : Timestamp.now(),
          };
          const updatedEntry = { ...existingEntry, ...data };
          // Convert Timestamp to serializable format
          const serializableEntry = {
            ...updatedEntry,
            createdAt: updatedEntry.createdAt?.toDate?.()?.toISOString() || updatedEntry.createdAt,
          };
          localStorage.setItem(`testUserEntry_${userId}`, JSON.stringify(serializableEntry));
          console.log('✅ Test user entry updated in localStorage:', userId);
        } catch (e) {
          console.error('Error updating test user entry:', e);
        }
      }
    }
    // Invalidate cache
    cache.delete(CACHE_KEYS.userEntry(userId));
    return;
  }
  
  const docRef = doc(db, COLLECTIONS.userEntries, userId);
  await updateDoc(docRef, data);
  
  // Invalidate cache
  cache.delete(CACHE_KEYS.userEntry(userId));
  
  // Invalidate cache for this user entry and leaderboard (since ranks may change)
  cache.delete(CACHE_KEYS.userEntry(userId));
  // Note: We can't invalidate leaderboard cache without tournamentId, but TTL will handle it
}

export async function updateTournament(id: string, data: Partial<Tournament>): Promise<void> {
  const docRef = doc(db, COLLECTIONS.tournaments, id);
  await updateDoc(docRef, data);
  
  // Invalidate tournament caches
  cache.delete(CACHE_KEYS.activeTournament);
  cache.delete(CACHE_KEYS.tournament(id));
}

export async function getLeaderboard(tournamentId: string): Promise<UserEntry[]> {
  // Check cache first
  const cacheKey = CACHE_KEYS.leaderboard(tournamentId);
  const cached = cache.get<UserEntry[]>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const q = query(
    collection(db, COLLECTIONS.userEntries),
    where('tournamentId', '==', tournamentId),
    orderBy('totalPoints', 'desc'),
    orderBy('createdAt', 'asc')
  );
  const snapshot = await getDocs(q);
  const result = snapshot.docs.map((doc, index) => ({
    id: doc.id,
    ...doc.data(),
    currentRank: index + 1,
  } as UserEntry));
  
  // Cache for 2 minutes (leaderboard changes when scores are calculated)
  cache.set(cacheKey, result, 2 * 60 * 1000);
  return result;
}

// Predictions
export async function getPrediction(userId: string, matchId: string): Promise<Prediction | null> {
  const predictionId = `${userId}_${matchId}`;
  
  // Check for test user prediction in localStorage (for test mode)
  const testUserIds = Object.values(TEST_USER_IDS);
  if (testUserIds.includes(userId) && typeof window !== 'undefined') {
    const testPredictionsStr = localStorage.getItem(`testPredictions_${userId}`);
    if (testPredictionsStr) {
      try {
        const parsed = JSON.parse(testPredictionsStr);
        const prediction = parsed.find((p: any) => p.id === predictionId);
        if (prediction) {
          // Convert ISO strings back to Timestamps
          return {
            ...prediction,
            submittedAt: prediction.submittedAt ? Timestamp.fromDate(new Date(prediction.submittedAt)) : Timestamp.now(),
            scoredAt: prediction.scoredAt ? Timestamp.fromDate(new Date(prediction.scoredAt)) : undefined,
            scheduledFor: prediction.scheduledFor ? Timestamp.fromDate(new Date(prediction.scheduledFor)) : undefined,
            scheduledAt: prediction.scheduledAt ? Timestamp.fromDate(new Date(prediction.scheduledAt)) : undefined,
          } as Prediction;
        }
      } catch (e) {
        console.error('Error parsing test user predictions:', e);
      }
    }
    return null;
  }
  
  const docRef = doc(db, COLLECTIONS.predictions, predictionId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Prediction : null;
}

export async function getUserPredictions(userId: string): Promise<Prediction[]> {
  // Check cache first
  const cacheKey = CACHE_KEYS.userPredictions(userId);
  const cached = cache.get<Prediction[]>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Check for test user predictions in localStorage (for test mode)
  const testUserIds = Object.values(TEST_USER_IDS);
  if (testUserIds.includes(userId) && typeof window !== 'undefined') {
    const testPredictionsStr = localStorage.getItem(`testPredictions_${userId}`);
    if (testPredictionsStr) {
      try {
        const parsed = JSON.parse(testPredictionsStr);
        // Convert ISO strings back to Timestamps
        const testPredictions: Prediction[] = parsed.map((p: any) => ({
          ...p,
          submittedAt: p.submittedAt ? Timestamp.fromDate(new Date(p.submittedAt)) : Timestamp.now(),
          scoredAt: p.scoredAt ? Timestamp.fromDate(new Date(p.scoredAt)) : undefined,
          scheduledFor: p.scheduledFor ? Timestamp.fromDate(new Date(p.scheduledFor)) : undefined,
          scheduledAt: p.scheduledAt ? Timestamp.fromDate(new Date(p.scheduledAt)) : undefined,
        }));
        cache.set(cacheKey, testPredictions, 2 * 60 * 1000);
        return testPredictions;
      } catch (e) {
        console.error('Error parsing test user predictions:', e);
      }
    } else {
      // No predictions yet for test user, return empty array
      cache.set(cacheKey, [], 2 * 60 * 1000);
      return [];
    }
  }

  const q = query(
    collection(db, COLLECTIONS.predictions),
    where('userId', '==', userId),
    orderBy('matchNumber', 'asc')
  );
  const snapshot = await getDocs(q);
  const result = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prediction));
  
  // Cache for 2 minutes (predictions change when user submits/updates)
  cache.set(cacheKey, result, 2 * 60 * 1000);
  return result;
}

export async function getMatchPredictions(matchId: string): Promise<Prediction[]> {
  // Check cache first
  const cacheKey = CACHE_KEYS.matchPredictions(matchId);
  const cached = cache.get<Prediction[]>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const q = query(
    collection(db, COLLECTIONS.predictions),
    where('matchId', '==', matchId)
  );
  const snapshot = await getDocs(q);
  const result = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prediction));
  
  // Cache for 2 minutes (predictions change when users submit/update)
  cache.set(cacheKey, result, 2 * 60 * 1000);
  return result;
}

export async function getAllPredictions(tournamentId: string): Promise<Prediction[]> {
  // Predictions don't have tournamentId field, so we filter by matchIds from the tournament
  // First, get all matches for this tournament
  const matches = await getMatches(tournamentId);
  if (matches.length === 0) {
    return [];
  }
  
  const matchIds = matches.map(m => m.id);
  
  // Firestore 'in' query supports up to 10 items, so we need to batch if there are more
  const MAX_IN_QUERY = 10;
  const allPredictions: Prediction[] = [];
  
  // Process in batches of 10
  for (let i = 0; i < matchIds.length; i += MAX_IN_QUERY) {
    const batchMatchIds = matchIds.slice(i, i + MAX_IN_QUERY);
    const q = query(
      collection(db, COLLECTIONS.predictions),
      where('matchId', 'in', batchMatchIds),
      orderBy('matchNumber', 'asc')
    );
    const snapshot = await getDocs(q);
    const batchPredictions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prediction));
    allPredictions.push(...batchPredictions);
  }
  
  // Sort all predictions by match number (in case batches returned unsorted)
  allPredictions.sort((a, b) => a.matchNumber - b.matchNumber);
  
  return allPredictions;
}

export async function createPrediction(prediction: Omit<Prediction, 'id'>): Promise<void> {
  const testUserIds = Object.values(TEST_USER_IDS);
  
  // For test users, store in localStorage instead of Firestore
  if (testUserIds.includes(prediction.userId)) {
    if (typeof window !== 'undefined') {
      const predictionId = `${prediction.userId}_${prediction.matchId}`;
      const predictionWithId: Prediction = { ...prediction, id: predictionId };
      
      // Get existing predictions for this test user
      const existingStr = localStorage.getItem(`testPredictions_${prediction.userId}`);
      let existingPredictions: any[] = [];
      if (existingStr) {
        try {
          existingPredictions = JSON.parse(existingStr);
        } catch (e) {
          console.error('Error parsing existing test predictions:', e);
        }
      }
      
      // Remove existing prediction for this match (if updating)
      const filtered = existingPredictions.filter((p: any) => p.matchId !== prediction.matchId);
      
      // Convert Timestamps to serializable format
      const serializablePrediction = {
        ...predictionWithId,
        submittedAt: predictionWithId.submittedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        scoredAt: predictionWithId.scoredAt?.toDate?.()?.toISOString() || undefined,
        scheduledFor: predictionWithId.scheduledFor?.toDate?.()?.toISOString() || undefined,
        scheduledAt: predictionWithId.scheduledAt?.toDate?.()?.toISOString() || undefined,
      };
      
      // Add new/updated prediction
      filtered.push(serializablePrediction);
      
      // Sort by match number
      filtered.sort((a: any, b: any) => a.matchNumber - b.matchNumber);
      
      localStorage.setItem(`testPredictions_${prediction.userId}`, JSON.stringify(filtered));
      console.log('✅ Test user prediction saved to localStorage:', predictionId);
    }
    // Invalidate caches
    cache.delete(CACHE_KEYS.userPredictions(prediction.userId));
    cache.delete(CACHE_KEYS.matchPredictions(prediction.matchId));
    return;
  }
  
  const predictionId = `${prediction.userId}_${prediction.matchId}`;
  const docRef = doc(db, COLLECTIONS.predictions, predictionId);
  await setDoc(docRef, { ...prediction, id: predictionId });
  
  // Invalidate caches
  cache.delete(CACHE_KEYS.userPredictions(prediction.userId));
  cache.delete(CACHE_KEYS.matchPredictions(prediction.matchId));
}

export async function updatePrediction(predictionId: string, data: Partial<Prediction>): Promise<void> {
  const testUserIds = Object.values(TEST_USER_IDS);
  const userId = predictionId.split('_')[0];
  const matchId = predictionId.split('_').slice(1).join('_');
  
  // For test users, update localStorage instead of Firestore
  if (testUserIds.includes(userId)) {
    if (typeof window !== 'undefined') {
      const testPredictionsStr = localStorage.getItem(`testPredictions_${userId}`);
      if (testPredictionsStr) {
        try {
          const parsed = JSON.parse(testPredictionsStr);
          const predictionIndex = parsed.findIndex((p: any) => p.id === predictionId);
          
          if (predictionIndex >= 0) {
            // Update existing prediction
            const existing = parsed[predictionIndex];
            const updated = { ...existing, ...data };
            
            // Convert Timestamps to serializable format
            const serializableUpdated = {
              ...updated,
              submittedAt: updated.submittedAt?.toDate?.()?.toISOString() || existing.submittedAt,
              scoredAt: updated.scoredAt?.toDate?.()?.toISOString() || existing.scoredAt,
              scheduledFor: updated.scheduledFor?.toDate?.()?.toISOString() || existing.scheduledFor,
              scheduledAt: updated.scheduledAt?.toDate?.()?.toISOString() || existing.scheduledAt,
            };
            
            parsed[predictionIndex] = serializableUpdated;
            localStorage.setItem(`testPredictions_${userId}`, JSON.stringify(parsed));
            console.log('✅ Test user prediction updated in localStorage:', predictionId);
          } else {
            console.warn('⚠️  Test prediction not found for update:', predictionId);
          }
        } catch (e) {
          console.error('Error updating test user prediction:', e);
        }
      }
    }
    // Invalidate caches
    cache.delete(CACHE_KEYS.userPredictions(userId));
    if (matchId) {
      cache.delete(CACHE_KEYS.matchPredictions(matchId));
    }
    return;
  }
  
  const docRef = doc(db, COLLECTIONS.predictions, predictionId);
  await updateDoc(docRef, data);
  
  // Invalidate caches
  cache.delete(CACHE_KEYS.userPredictions(userId));
  if (matchId) {
    cache.delete(CACHE_KEYS.matchPredictions(matchId));
  }
}

// Scheduled Predictions Helper Functions

/**
 * Client-side utility function to filter scheduled predictions
 * Zero Firestore reads - works on already-fetched data
 */
export function filterScheduledPredictions(predictions: Prediction[]): Prediction[] {
  const now = new Date();
  return predictions
    .filter(p => p.scheduledFor && p.scheduledFor.toDate() > now)
    .sort((a, b) => {
      const aTime = a.scheduledFor!.toDate().getTime();
      const bTime = b.scheduledFor!.toDate().getTime();
      return aTime - bTime;
    });
}

/**
 * Client-side utility function to filter active (non-scheduled) predictions
 * Zero Firestore reads - works on already-fetched data
 */
export function filterActivePredictions(predictions: Prediction[]): Prediction[] {
  return predictions.filter(p => !p.scheduledFor);
}

/**
 * Activate a scheduled prediction by removing scheduled fields
 */
export async function activateScheduledPrediction(predictionId: string): Promise<boolean> {
  try {
    const userId = predictionId.split('_')[0];
    const matchId = predictionId.split('_').slice(1).join('_');
    const testUserIds = Object.values(TEST_USER_IDS);
    
    // For test users, update localStorage
    if (testUserIds.includes(userId)) {
      if (typeof window !== 'undefined') {
        const testPredictionsStr = localStorage.getItem(`testPredictions_${userId}`);
        if (testPredictionsStr) {
          try {
            const parsed = JSON.parse(testPredictionsStr);
            const predictionIndex = parsed.findIndex((p: any) => p.id === predictionId);
            
            if (predictionIndex >= 0) {
              const prediction = parsed[predictionIndex];
              if (!prediction.scheduledFor) {
                // Already activated
                return true;
              }
              
              // Remove scheduled fields
              const { scheduledFor, scheduledAt, ...updated } = prediction;
              parsed[predictionIndex] = updated;
              
              localStorage.setItem(`testPredictions_${userId}`, JSON.stringify(parsed));
              console.log('✅ Test user scheduled prediction activated in localStorage:', predictionId);
              
              // Invalidate caches
              cache.delete(CACHE_KEYS.userPredictions(userId));
              if (matchId) {
                cache.delete(CACHE_KEYS.matchPredictions(matchId));
              }
              return true;
            } else {
              console.warn(`Test prediction ${predictionId} does not exist`);
              return false;
            }
          } catch (e) {
            console.error('Error activating test user scheduled prediction:', e);
            return false;
          }
        }
      }
      return false;
    }
    
    // For real users, update Firestore
    const predictionRef = doc(db, COLLECTIONS.predictions, predictionId);
    const predictionSnap = await getDoc(predictionRef);
    
    if (!predictionSnap.exists()) {
      console.warn(`Prediction ${predictionId} does not exist`);
      return false;
    }
    
    const predictionData = predictionSnap.data() as Prediction;
    if (!predictionData.scheduledFor) {
      // Already activated or not a scheduled prediction
      return true; // Consider it successful (idempotent)
    }
    
    // Remove scheduled fields
    await updateDoc(predictionRef, {
      scheduledFor: deleteField(),
      scheduledAt: deleteField(),
    });
    
    // Invalidate caches
    cache.delete(CACHE_KEYS.userPredictions(userId));
    if (matchId) {
      cache.delete(CACHE_KEYS.matchPredictions(matchId));
    }
    
    return true;
  } catch (error) {
    console.error(`Error activating scheduled prediction ${predictionId}:`, error);
    return false;
  }
}

/**
 * Get all scheduled predictions that are ready to be activated
 * This is the ONLY new Firestore query for scheduled predictions (used by cron job)
 */
export async function getScheduledPredictionsToActivate(): Promise<Prediction[]> {
  const now = Timestamp.now();
  
  const q = query(
    collection(db, COLLECTIONS.predictions),
    where('scheduledFor', '<=', now),
    orderBy('scheduledFor', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prediction));
}

