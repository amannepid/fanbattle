import { getLeaderboard, updateUserEntry } from './firestore';
import type { Tournament, UserEntry } from '@/types';

/**
 * Calculate tournament end bonuses for a user
 * 
 * Bonuses:
 * - Season team wins title: +5 points
 * - Player of Tournament: +5 points if correct
 * - Highest Run Scorer: +5 points if correct
 * - Highest Wicket Taker: +5 points if correct
 */
export function calculateTournamentBonuses(
  userEntry: UserEntry,
  tournament: Tournament
): {
  seasonTeamWinsTitle: number;
  playerOfTournament: number;
  highestRunScorer: number;
  highestWicketTaker: number;
  total: number;
} {
  const bonuses = {
    seasonTeamWinsTitle: 0,
    playerOfTournament: 0,
    highestRunScorer: 0,
    highestWicketTaker: 0,
    total: 0,
  };

  // 1. Season team wins title bonus: +5 points
  if (tournament.winnerTeamId && userEntry.seasonTeamId === tournament.winnerTeamId) {
    bonuses.seasonTeamWinsTitle = 5;
  }

  // 2. Player of Tournament bonus: +5 points if correct
  if (
    tournament.playerOfTournamentId &&
    userEntry.playerOfTournamentId &&
    tournament.playerOfTournamentId === userEntry.playerOfTournamentId
  ) {
    bonuses.playerOfTournament = 5;
  }

  // 3. Highest Run Scorer bonus: +5 points if correct
  if (
    tournament.highestRunScorerId &&
    userEntry.highestRunScorerId &&
    tournament.highestRunScorerId === userEntry.highestRunScorerId
  ) {
    bonuses.highestRunScorer = 5;
  }

  // 4. Highest Wicket Taker bonus: +5 points if correct
  if (
    tournament.highestWicketTakerId &&
    userEntry.highestWicketTakerId &&
    tournament.highestWicketTakerId === userEntry.highestWicketTakerId
  ) {
    bonuses.highestWicketTaker = 5;
  }

  // Calculate total
  bonuses.total =
    bonuses.seasonTeamWinsTitle +
    bonuses.playerOfTournament +
    bonuses.highestRunScorer +
    bonuses.highestWicketTaker;

  return bonuses;
}

/**
 * Calculate and apply tournament bonuses to all users
 * This should be called when tournament ends and results are set
 */
export async function applyTournamentBonuses(tournament: Tournament): Promise<void> {
  // Get all users in the tournament
  const leaderboard = await getLeaderboard(tournament.id);

  // Calculate and apply bonuses for each user
  for (const userEntry of leaderboard) {
    const bonuses = calculateTournamentBonuses(userEntry, tournament);
    
    // Get old tournament bonuses if they exist
    const oldBonuses = userEntry.tournamentBonuses;
    const oldTotal = oldBonuses 
      ? oldBonuses.seasonTeamWinsTitle + oldBonuses.playerOfTournament + 
        oldBonuses.highestRunScorer + oldBonuses.highestWicketTaker
      : 0;

    // Update user entry with new bonuses and adjust total points
    await updateUserEntry(userEntry.userId, {
      tournamentBonuses: bonuses,
      totalPoints: (userEntry.totalPoints || 0) - oldTotal + bonuses.total,
    });
  }

  // Recalculate leaderboard ranks after updating all points
  const updatedLeaderboard = await getLeaderboard(tournament.id);
  for (let i = 0; i < updatedLeaderboard.length; i++) {
    await updateUserEntry(updatedLeaderboard[i].userId, {
      currentRank: i + 1,
    });
  }
}

