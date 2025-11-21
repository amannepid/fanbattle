import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { calculatePointsTable } from './points-table';
import { getMatches, getTeams } from './firestore';
import { cache, CACHE_KEYS } from './cache';
import type { Match, Team } from '@/types';

const COLLECTIONS = {
  matches: 'matches',
};

/**
 * Update playoff match teams based on standings and previous match results
 * Automatically called after admin submits match results
 * 
 * Update logic:
 * - After last league match completes → Update Qualifier 1 and Eliminator teams
 * - After Qualifier 1 completes → Update Qualifier 2 Team A (Loser Q1) and Final Team A (Winner Q1)
 * - After Eliminator completes → Update Qualifier 2 Team B (Winner Eliminator)
 * - After Qualifier 2 completes → Update Final Team B (Winner Q2)
 */
export async function updatePlayoffMatchTeams(tournamentId: string): Promise<void> {
  const [matches, teams] = await Promise.all([
    getMatches(tournamentId),
    getTeams(tournamentId),
  ]);

  // Calculate points table for league standings
  const standings = calculatePointsTable(matches, teams);

  // Find playoff matches by matchNumber (they are in order: Q1, Eliminator, Q2, Final)
  const qualifiers = matches.filter(m => m.matchType === 'qualifier').sort((a, b) => a.matchNumber - b.matchNumber);
  const qualifier1 = qualifiers[0]; // First qualifier by match number
  const qualifier2 = qualifiers[1]; // Second qualifier by match number
  const eliminator = matches.find(m => m.matchType === 'eliminator');
  const final = matches.find(m => m.matchType === 'final');

  // Helper to update a match with teams (only if teams are still TBD)
  async function updateMatchTeams(match: Match, teamAId: string, teamAName: string, teamBId: string, teamBName: string) {
    // Only update if teams are still TBD
    if (match.teamAId !== 'tbd' && match.teamAName !== 'TBD') {
      return; // Already assigned
    }

    const teamA = teams.find(t => t.id === teamAId);
    const teamB = teams.find(t => t.id === teamBId);

    if (!teamA || !teamB) {
      return; // Teams not found
    }

    const matchRef = doc(db, COLLECTIONS.matches, match.id);
    await updateDoc(matchRef, {
      teamAId,
      teamAName,
      teamBId,
      teamBName,
      teamALogoUrl: teamA?.logoUrl || '',
      teamBLogoUrl: teamB?.logoUrl || '',
    });

    // Invalidate matches cache
    cache.delete(CACHE_KEYS.matches(tournamentId));
    cache.delete(CACHE_KEYS.match(match.id));
  }

  // Helper to update a single team in a match (for partial updates)
  async function updateMatchTeam(match: Match, isTeamA: boolean, teamId: string, teamName: string) {
    // Only update if team is still TBD
    const currentTeamId = isTeamA ? match.teamAId : match.teamBId;
    const currentTeamName = isTeamA ? match.teamAName : match.teamBName;
    
    if (currentTeamId !== 'tbd' && currentTeamName !== 'TBD') {
      return; // Already assigned
    }

    const team = teams.find(t => t.id === teamId);
    if (!team) {
      return; // Team not found
    }

    const matchRef = doc(db, COLLECTIONS.matches, match.id);
    const updateData: any = {};
    
    if (isTeamA) {
      updateData.teamAId = teamId;
      updateData.teamAName = teamName;
      updateData.teamALogoUrl = team.logoUrl || '';
    } else {
      updateData.teamBId = teamId;
      updateData.teamBName = teamName;
      updateData.teamBLogoUrl = team.logoUrl || '';
    }

    await updateDoc(matchRef, updateData);

    // Invalidate matches cache
    cache.delete(CACHE_KEYS.matches(tournamentId));
    cache.delete(CACHE_KEYS.match(match.id));
  }

  // Check if all league matches are completed
  const leagueMatches = matches.filter(m => m.matchType === 'league');
  const allLeagueMatchesCompleted = leagueMatches.length > 0 && leagueMatches.every(m => m.status === 'completed');

  // Update Qualifier 1: 1st vs 2nd (after all league matches complete)
  if (qualifier1 && allLeagueMatchesCompleted && standings.length >= 2) {
    const first = standings[0];
    const second = standings[1];
    await updateMatchTeams(qualifier1, first.teamId, first.teamName, second.teamId, second.teamName);
  }

  // Update Eliminator: 3rd vs 4th (after all league matches complete)
  if (eliminator && allLeagueMatchesCompleted && standings.length >= 4) {
    const third = standings[2];
    const fourth = standings[3];
    await updateMatchTeams(eliminator, third.teamId, third.teamName, fourth.teamId, fourth.teamName);
  }

  // Update Qualifier 2 and Final based on Qualifier 1 result
  if (qualifier1 && qualifier1.status === 'completed' && qualifier1.winnerId) {
    const q1WinnerId = qualifier1.winnerId;
    const q1WinnerName = qualifier1.winnerName!;
    const q1LoserId = qualifier1.winnerId === qualifier1.teamAId ? qualifier1.teamBId : qualifier1.teamAId;
    const q1LoserName = qualifier1.winnerId === qualifier1.teamAId ? qualifier1.teamBName : qualifier1.teamAName;

    // Update Qualifier 2 Team A: Loser Q1
    if (qualifier2) {
      await updateMatchTeam(qualifier2, true, q1LoserId, q1LoserName);
    }

    // Update Final Team A: Winner Q1
    if (final) {
      await updateMatchTeam(final, true, q1WinnerId, q1WinnerName);
    }
  }

  // Update Qualifier 2 Team B: Winner Eliminator (after Eliminator completes)
  if (eliminator && eliminator.status === 'completed' && eliminator.winnerId && qualifier2) {
    const eliminatorWinnerId = eliminator.winnerId;
    const eliminatorWinnerName = eliminator.winnerName!;
    await updateMatchTeam(qualifier2, false, eliminatorWinnerId, eliminatorWinnerName);
  }

  // Update Final Team B: Winner Q2 (after Qualifier 2 completes)
  if (qualifier2 && qualifier2.status === 'completed' && qualifier2.winnerId && final) {
    const q2WinnerId = qualifier2.winnerId;
    const q2WinnerName = qualifier2.winnerName!;
    await updateMatchTeam(final, false, q2WinnerId, q2WinnerName);
  }
}

