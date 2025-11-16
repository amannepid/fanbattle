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
} from 'firebase/firestore';
import { db } from './firebase';
import type { Tournament, Team, Player, Match, UserEntry, Prediction } from '@/types';

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
  const q = query(
    collection(db, COLLECTIONS.tournaments),
    where('status', '==', 'active'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Tournament;
}

// Teams
export async function getTeams(tournamentId: string): Promise<Team[]> {
  const q = query(
    collection(db, COLLECTIONS.teams),
    where('tournamentId', '==', tournamentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
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
  // Get all teams first
  const teams = await getTeams(tournamentId);
  const teamIds = teams.map(t => t.id);
  
  // Get all players for these teams
  const allPlayers: Player[] = [];
  for (const teamId of teamIds) {
    const players = await getPlayers(teamId);
    allPlayers.push(...players);
  }
  return allPlayers;
}

// Matches
export async function getMatches(tournamentId: string): Promise<Match[]> {
  const q = query(
    collection(db, COLLECTIONS.matches),
    where('tournamentId', '==', tournamentId),
    orderBy('matchNumber', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
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
  const docRef = doc(db, COLLECTIONS.userEntries, userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as UserEntry : null;
}

export async function createUserEntry(userEntry: Omit<UserEntry, 'id'>): Promise<void> {
  const docRef = doc(db, COLLECTIONS.userEntries, userEntry.userId);
  await setDoc(docRef, userEntry);
}

export async function updateUserEntry(userId: string, data: Partial<UserEntry>): Promise<void> {
  const docRef = doc(db, COLLECTIONS.userEntries, userId);
  await updateDoc(docRef, data);
}

export async function getLeaderboard(tournamentId: string): Promise<UserEntry[]> {
  const q = query(
    collection(db, COLLECTIONS.userEntries),
    where('tournamentId', '==', tournamentId),
    orderBy('totalPoints', 'desc'),
    orderBy('createdAt', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc, index) => ({
    id: doc.id,
    ...doc.data(),
    currentRank: index + 1,
  } as UserEntry));
}

// Predictions
export async function getPrediction(userId: string, matchId: string): Promise<Prediction | null> {
  const predictionId = `${userId}_${matchId}`;
  const docRef = doc(db, COLLECTIONS.predictions, predictionId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Prediction : null;
}

export async function getUserPredictions(userId: string): Promise<Prediction[]> {
  const q = query(
    collection(db, COLLECTIONS.predictions),
    where('userId', '==', userId),
    orderBy('matchNumber', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prediction));
}

export async function getMatchPredictions(matchId: string): Promise<Prediction[]> {
  const q = query(
    collection(db, COLLECTIONS.predictions),
    where('matchId', '==', matchId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prediction));
}

export async function getAllPredictions(tournamentId: string): Promise<Prediction[]> {
  const q = query(
    collection(db, COLLECTIONS.predictions),
    where('tournamentId', '==', tournamentId),
    orderBy('matchNumber', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prediction));
}

export async function createPrediction(prediction: Omit<Prediction, 'id'>): Promise<void> {
  const predictionId = `${prediction.userId}_${prediction.matchId}`;
  const docRef = doc(db, COLLECTIONS.predictions, predictionId);
  await setDoc(docRef, { ...prediction, id: predictionId });
}

export async function updatePrediction(predictionId: string, data: Partial<Prediction>): Promise<void> {
  const docRef = doc(db, COLLECTIONS.predictions, predictionId);
  await updateDoc(docRef, data);
}

