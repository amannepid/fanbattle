import { Match, Prediction } from '@/types';

/**
 * Determines which matches a user can currently predict.
 * 
 * Rule: A match is predictable if ALL matches before it (by date/time) 
 * have already been COMPLETED (finished, not just predicted).
 */
export function getPredictableMatches(
  allMatches: Match[],
  userPredictions: Prediction[]
): Set<string> {
  const now = new Date();
  
  console.log('🔍 getPredictableMatches called');
  console.log('  Total matches:', allMatches.length);
  
  // Get all upcoming matches (not past deadline, sorted by date/time)
  const upcomingMatches = allMatches
    .filter(match => {
      const deadline = match.deadline.toDate();
      const isUpcoming = deadline > now && match.status === 'upcoming';
      if (!isUpcoming) {
        console.log(`  ❌ Match ${match.matchNumber} filtered out: deadline=${deadline.toISOString()}, status=${match.status}`);
      }
      return isUpcoming;
    })
    .sort((a, b) => a.matchDate.toDate().getTime() - b.matchDate.toDate().getTime());

  console.log('  Upcoming matches after filter:', upcomingMatches.length);
  
  if (upcomingMatches.length === 0) {
    console.log('  ⚠️ No upcoming matches found!');
    return new Set();
  }

  const predictableMatchIds = new Set<string>();

  // For each match, check if all previous matches are COMPLETED
  for (let i = 0; i < upcomingMatches.length; i++) {
    const currentMatch = upcomingMatches[i];
    
    // Check if all matches BEFORE this one (by time) are completed
    let allPreviousCompleted = true;
    
    // Check ALL matches in the full list that are earlier than current match
    for (const otherMatch of allMatches) {
      const isEarlier = otherMatch.matchDate.toDate() < currentMatch.matchDate.toDate();
      
      if (isEarlier && otherMatch.status !== 'completed') {
        allPreviousCompleted = false;
        console.log(`  🔒 Match ${currentMatch.matchNumber} locked: Match ${otherMatch.matchNumber} (${otherMatch.status}) is not completed yet`);
        break;
      }
    }
    
    // If all previous matches are completed, this match is predictable
    if (allPreviousCompleted) {
      console.log(`  ✅ Match ${currentMatch.matchNumber} is predictable (all previous matches completed)`);
      predictableMatchIds.add(currentMatch.id);
    }
  }

  console.log('  Final predictable match IDs:', Array.from(predictableMatchIds));
  return predictableMatchIds;
}

/**
 * Checks if a specific match can be predicted by the user
 */
export function canPredictMatch(
  matchId: string,
  allMatches: Match[],
  userPredictions: Prediction[]
): boolean {
  const predictableMatches = getPredictableMatches(allMatches, userPredictions);
  return predictableMatches.has(matchId);
}

/**
 * Gets a message explaining why a match cannot be predicted
 */
export function getUnpredictableReason(
  match: Match,
  allMatches: Match[],
  userPredictions: Prediction[]
): string | null {
  const now = new Date();
  const deadline = match.deadline.toDate();
  
  // Check if deadline has passed
  if (deadline <= now) {
    return 'Prediction deadline has passed';
  }
  
  // Check if match is completed
  if (match.status === 'completed') {
    return 'Match has been completed';
  }
  
  // Check if user has already predicted
  const hasPredicted = userPredictions.some(p => p.matchId === match.id);
  if (hasPredicted) {
    return null; // Already predicted, but can update
  }
  
  // Check if this match is predictable
  const predictableMatches = getPredictableMatches(allMatches, userPredictions);
  if (!predictableMatches.has(match.id)) {
    return 'Wait for earlier matches to finish';
  }
  
  return null;
}

/**
 * Gets the number of days until a locked match becomes available
 * (Not really used anymore with the new logic, but kept for compatibility)
 */
export function getDaysUntilAvailable(
  match: Match,
  allMatches: Match[],
  userPredictions: Prediction[]
): number {
  return 0; // Not applicable with new logic
}
