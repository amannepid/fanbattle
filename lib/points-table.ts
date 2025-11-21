import type { Match, Team } from '@/types';

export interface TeamStanding {
  position: number;
  teamId: string;
  teamName: string;
  teamShortCode: string;
  teamLogoUrl?: string;
  matches: number; // M - Matches played
  won: number; // W - Wins
  lost: number; // L - Losses
  points: number; // Pts - Points
}

/**
 * Calculate points table from completed league matches
 * @param matches - All matches in the tournament
 * @param teams - All teams in the tournament
 * @returns Array of team standings sorted by position
 */
export function calculatePointsTable(matches: Match[], teams: Team[]): TeamStanding[] {
  // Handle empty inputs
  if (!matches || matches.length === 0 || !teams || teams.length === 0) {
    return [];
  }

  // Filter only completed league matches with valid team IDs
  const completedLeagueMatches = matches.filter(
    (match) => 
      match.matchType === 'league' && 
      match.status === 'completed' && 
      match.winnerId &&
      match.teamAId &&
      match.teamBId &&
      match.teamAId !== 'tbd' &&
      match.teamBId !== 'tbd'
  );

  // Initialize standings for all teams
  const standingsMap = new Map<string, TeamStanding>();

  // Initialize all teams with zero stats
  for (const team of teams) {
    if (!team.id) continue; // Skip teams without IDs
    standingsMap.set(team.id, {
      position: 0,
      teamId: team.id,
      teamName: team.name,
      teamShortCode: team.shortCode,
      teamLogoUrl: team.logoUrl,
      matches: 0,
      won: 0,
      lost: 0,
      points: 0,
    });
  }

  // Calculate stats from completed league matches
  for (const match of completedLeagueMatches) {
    const teamAStanding = standingsMap.get(match.teamAId);
    const teamBStanding = standingsMap.get(match.teamBId);

    // Skip if teams not found in standings (shouldn't happen, but defensive)
    if (!teamAStanding || !teamBStanding) {
      console.warn(`Team not found in standings for match ${match.id}: teamAId=${match.teamAId}, teamBId=${match.teamBId}`);
      continue;
    }

    // Both teams played a match
    teamAStanding.matches++;
    teamBStanding.matches++;

    // Determine winner and loser
    if (match.winnerId === match.teamAId) {
      teamAStanding.won++;
      teamBStanding.lost++;
      teamAStanding.points += 2; // 2 points for a win
    } else if (match.winnerId === match.teamBId) {
      teamBStanding.won++;
      teamAStanding.lost++;
      teamBStanding.points += 2; // 2 points for a win
    }
  }

  // Convert to array and sort
  const standings = Array.from(standingsMap.values());

  // Sort by: Points (descending), then Wins (descending), then alphabetically by team name
  standings.sort((a, b) => {
    // First by points
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    // Then by wins
    if (b.won !== a.won) {
      return b.won - a.won;
    }
    // Finally alphabetically by team name
    return a.teamName.localeCompare(b.teamName);
  });

  // Assign positions
  standings.forEach((standing, index) => {
    standing.position = index + 1;
  });

  return standings;
}

