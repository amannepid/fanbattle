import { Match, Prediction } from '@/types';

/**
 * Helper function to get the start of day for a date
 */
function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Determines which matches a user can currently predict.
 * 
 * Rules:
 * 1. A match is predictable if it's less than 24 hours away, OR
 * 2. All matches from previous days are completed
 * 3. If matches are on the same day, they should all be available if any one of them is available
 * 4. If a match has an incomplete match before it AND it's NOT on the same day, it should NOT be available
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
  
  // Group matches by day
  const matchesByDay = new Map<string, Match[]>();
  for (const match of upcomingMatches) {
    const matchDate = match.matchDate.toDate();
    const dayKey = getStartOfDay(matchDate).toISOString();
    
    if (!matchesByDay.has(dayKey)) {
      matchesByDay.set(dayKey, []);
    }
    matchesByDay.get(dayKey)!.push(match);
  }
  
  // Sort days chronologically
  const sortedDays = Array.from(matchesByDay.keys()).sort();
  
  console.log(`  📅 Found ${sortedDays.length} unique days with matches`);
  
  // SPECIAL CASE: Match 1 is always available if within 18 hours (production requirement)
  const match1 = allMatches.find(m => m.matchNumber === 1 && m.status === 'upcoming');
  if (match1) {
    const match1Date = match1.matchDate.toDate();
    const hoursUntilMatch1 = (match1Date.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilMatch1 > 0 && hoursUntilMatch1 <= 18) {
      predictableMatchIds.add(match1.id);
      console.log(`  🎯 Match 1 special case: Available for ${hoursUntilMatch1.toFixed(1)} hours (18-hour window)`);
    }
  }
  
  // Process each day
  for (let dayIndex = 0; dayIndex < sortedDays.length; dayIndex++) {
    const dayKey = sortedDays[dayIndex];
    const dayMatches = matchesByDay.get(dayKey)!;
    const dayDate = new Date(dayKey);
    
    console.log(`  📆 Processing day ${dayKey} with ${dayMatches.length} match(es)`);
    
    // Check if this day should be unlocked
    let isDayUnlocked = false;
    
    // Rule 1: Check if first match of this day is less than 24 hours away
    // SPECIAL CASE: First match (Match 1) is available for 18 hours instead of 24
    const firstMatchOfDay = dayMatches[0];
    const firstMatchDate = firstMatchOfDay.matchDate.toDate();
    const hoursUntilMatch = (firstMatchDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Special handling for Match 1: allow predictions for 18 hours
    const isFirstMatch = firstMatchOfDay.matchNumber === 1;
    const hoursThreshold = isFirstMatch ? 18 : 24;
    
    if (hoursUntilMatch < hoursThreshold && hoursUntilMatch > 0) {
      isDayUnlocked = true;
      console.log(`    ✅ Day unlocked: First match is ${hoursUntilMatch.toFixed(1)} hours away (< ${hoursThreshold} hours${isFirstMatch ? ' - Match 1 special case' : ''})`);
    } else {
      // Rule 2: Check if all matches from previous days are completed
      let allPreviousDaysCompleted = true;
      
      // Check all matches from previous days
      for (let prevDayIndex = 0; prevDayIndex < dayIndex; prevDayIndex++) {
        const prevDayKey = sortedDays[prevDayIndex];
        const prevDayMatches = matchesByDay.get(prevDayKey)!;
        
        // Check if all matches from this previous day are completed
        for (const prevMatch of prevDayMatches) {
          if (prevMatch.status !== 'completed') {
            allPreviousDaysCompleted = false;
            console.log(`    🔒 Day locked: Match ${prevMatch.matchNumber} from previous day (${prevDayKey}) is not completed`);
            break;
          }
        }
        
        if (!allPreviousDaysCompleted) {
          break;
        }
      }
      
      // Also check all matches from allMatches that are before this day (not just from upcomingMatches)
      if (allPreviousDaysCompleted) {
        for (const match of allMatches) {
          const matchDate = match.matchDate.toDate();
          const matchDayStart = getStartOfDay(matchDate);
          
          // If this match is from a previous day and not completed
          if (matchDayStart < dayDate && match.status !== 'completed') {
            allPreviousDaysCompleted = false;
            console.log(`    🔒 Day locked: Match ${match.matchNumber} from ${matchDayStart.toISOString()} is not completed`);
            break;
          }
        }
      }
      
      if (allPreviousDaysCompleted) {
        isDayUnlocked = true;
        console.log(`    ✅ Day unlocked: All previous days' matches are completed`);
      }
    }
    
    // If day is unlocked, all matches on that day are predictable
    if (isDayUnlocked) {
      for (const match of dayMatches) {
        predictableMatchIds.add(match.id);
        console.log(`    ✅ Match ${match.matchNumber} is predictable (same day as unlocked match)`);
      }
    } else {
      console.log(`    🔒 Day locked: Matches ${dayMatches.map(m => m.matchNumber).join(', ')} are not available`);
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
