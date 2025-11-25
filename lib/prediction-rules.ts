import { Match, Prediction } from '@/types';

/**
 * Check if current time is past 7 PM CST
 * Users can make/update predictions until 7 PM CST daily
 * After 7 PM CST, predictions for matches on the same Nepal day are blocked
 */
export function isPast8PMCST(): boolean {
  const now = new Date();
  
  // Get current time in Central Time (CST/CDT)
  // Use Intl.DateTimeFormat to get the time in America/Chicago timezone
  const centralTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);
  
  const hour = parseInt(centralTime.find(part => part.type === 'hour')?.value || '0', 10);
  const minute = parseInt(centralTime.find(part => part.type === 'minute')?.value || '0', 10);
  
  // Check if it's 7 PM (19:00) or later in Central Time
  return hour >= 19;
}

/**
 * Get the Nepal day (start of day in Nepal timezone) for a given date
 * Nepal is UTC+5:45
 * Returns a Date object representing midnight (00:00:00) in Nepal Time for the given date
 */
export function getNepalDay(date: Date): Date {
  // Convert to Nepal timezone and get the year, month, day
  const nepalTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  
  const year = parseInt(nepalTime.find(part => part.type === 'year')?.value || '2025', 10);
  const month = parseInt(nepalTime.find(part => part.type === 'month')?.value || '1', 10) - 1;
  const day = parseInt(nepalTime.find(part => part.type === 'day')?.value || '1', 10);
  
  // Create date at start of day in Nepal timezone (UTC+5:45)
  // Nepal midnight (00:00:00 NPT) = 18:15:00 UTC previous day
  // So for Nov 21, 2025 00:00:00 NPT, we need Nov 20, 2025 18:15:00 UTC
  // We create Nov 21, 2025 00:00:00 UTC, then subtract 5:45 hours
  const nepalDayStart = new Date(Date.UTC(year, month, day, 0, 0, 0));
  // Subtract 5 hours and 45 minutes to get the UTC time that represents Nepal midnight
  nepalDayStart.setUTCHours(nepalDayStart.getUTCHours() - 5);
  nepalDayStart.setUTCMinutes(nepalDayStart.getUTCMinutes() - 45);
  
  return nepalDayStart;
}

/**
 * Get the cutoff time (7 PM CST on previous CST day) for matches on a given Nepal day
 * Since Nepal is ahead (UTC+5:45), midnight Nepal = 6:15 PM CST previous day
 * So cutoff (7 PM CST) is always on the previous CST day
 */
function getCutoffTimeForNepalDay(nepalDay: Date): Date {
  // Get the CST date when this Nepal day starts
  // Nepal day starts at midnight Nepal time = 6:15 PM CST the previous day
  // But when formatted, it shows as the CST day (e.g., Nov 18 midnight Nepal = Nov 17 12:15 PM CST)
  const cstDateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(nepalDay);
  
  const [month, day, year] = cstDateStr.split('/').map(Number);
  
  // The cutoff is always 7 PM CST on the CST day when the Nepal day starts
  // Example: Nov 18 Nepal day starts at Nov 17 12:15 PM CST
  //          Cutoff is Nov 17 7:00 PM CST (same CST day)
  let cutoffYear = year;
  let cutoffMonth = month - 1; // JavaScript months are 0-indexed  
  let cutoffDay = day;
  
  // Create Date object for 7 PM CST on the cutoff day
  // CST is UTC-6, so 7 PM CST = 1 AM UTC next day
  // For Nov 17 7:00 PM CST: Nov 17 19:00 CST = Nov 18 01:00 UTC
  // So we create a UTC date for the next day at 01:00 UTC
  const cutoffDate = new Date(Date.UTC(cutoffYear, cutoffMonth, cutoffDay));
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() + 1);
  cutoffDate.setUTCHours(1, 0, 0, 0);
  
  return cutoffDate;
}

/**
 * Get the "next" match (earliest upcoming match that hasn't started)
 * This is used to determine which match should be blocked at 8 PM CST
 */
export function getNextMatch(allMatches: Match[]): Match | null {
  const now = new Date();
  
  // Filter for upcoming matches that haven't started
  const upcomingMatches = allMatches
    .filter(match => {
      const matchDate = match.matchDate.toDate();
      return match.status === 'upcoming' && matchDate > now;
    })
    .sort((a, b) => a.matchDate.toDate().getTime() - b.matchDate.toDate().getTime());
  
  return upcomingMatches.length > 0 ? upcomingMatches[0] : null;
}

/**
 * Get all matches on the same Nepal day as the "next" match
 * This accounts for same-day matches - all matches on the same Nepal day as the earliest match
 * should be treated together for the 8 PM CST cutoff
 */
export function getNextMatchDayMatches(allMatches: Match[]): Match[] {
  const nextMatch = getNextMatch(allMatches);
  if (!nextMatch) {
    return [];
  }
  
  // Get the Nepal day of the next match
  const nextMatchDate = nextMatch.matchDate.toDate();
  const nextMatchNepalDay = getNepalDay(nextMatchDate);
  const nextMatchNepalDayKey = nextMatchNepalDay.toISOString();
  
  // Find all matches on the same Nepal day as the next match
  const now = new Date();
  return allMatches.filter(match => {
    if (match.status !== 'upcoming') return false;
    
    const matchDate = match.matchDate.toDate();
    if (matchDate <= now) return false; // Already started
    
    const matchNepalDay = getNepalDay(matchDate);
    const matchNepalDayKey = matchNepalDay.toISOString();
    
    return matchNepalDayKey === nextMatchNepalDayKey;
  });
}

/**
 * Check if a specific match should be blocked by the 7 PM CST cutoff
 * All matches on the same Nepal day as the "next" match are blocked at 7 PM CST
 */
export function shouldBlockMatchAt8PMCST(match: Match, allMatches: Match[]): boolean {
  const nextMatch = getNextMatch(allMatches);
  if (!nextMatch) {
    return false;
  }
  
  // Get the Nepal day of the next match
  const nextMatchDate = nextMatch.matchDate.toDate();
  const nextMatchNepalDay = getNepalDay(nextMatchDate);
  
  // Get the Nepal day of this match
  const matchDate = match.matchDate.toDate();
  const matchNepalDay = getNepalDay(matchDate);
  
  // Check if this match is on the same Nepal day as the next match
  const isSameNepalDay = nextMatchNepalDay.toISOString() === matchNepalDay.toISOString();
  if (!isSameNepalDay) {
    return false;
  }
  
  // Get the cutoff time for this Nepal day (7 PM CST on previous CST day)
  const cutoffTime = getCutoffTimeForNepalDay(nextMatchNepalDay);
  const now = new Date();
  
  // Block if current time is past the cutoff
  return now >= cutoffTime;
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

  // Group matches by Nepal day (not local day)
  const matchesByDay = new Map<string, Match[]>();
  for (const match of upcomingMatches) {
    const matchDate = match.matchDate.toDate();
    const dayKey = getNepalDay(matchDate).toISOString();
    
    if (!matchesByDay.has(dayKey)) {
      matchesByDay.set(dayKey, []);
    }
    matchesByDay.get(dayKey)!.push(match);
  }
  
  // Sort days chronologically
  const sortedDays = Array.from(matchesByDay.keys()).sort();
  
  console.log(`  📅 Found ${sortedDays.length} unique days with matches`);
  
  // Process each day
  for (let dayIndex = 0; dayIndex < sortedDays.length; dayIndex++) {
    const dayKey = sortedDays[dayIndex];
    const dayMatches = matchesByDay.get(dayKey)!;
    const dayDate = new Date(dayKey);
    
    console.log(`  📆 Processing day ${dayKey} with ${dayMatches.length} match(es)`);
    
    // Check if this day should be unlocked
    let isDayUnlocked = false;
    
    // Rule 1: Check if first match of this day is less than 24 hours away
    const firstMatchOfDay = dayMatches[0];
    const firstMatchDate = firstMatchOfDay.matchDate.toDate();
    const hoursUntilMatch = (firstMatchDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilMatch < 24 && hoursUntilMatch > 0) {
      isDayUnlocked = true;
      console.log(`    ✅ Day unlocked: First match is ${hoursUntilMatch.toFixed(1)} hours away (< 24 hours)`);
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
          const matchDayStart = getNepalDay(matchDate);
          
          // If this match is from a previous Nepal day and not completed
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
  
  // For all matches, use the stored deadline
  const deadline = match.deadline.toDate();
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

/**
 * Calculate when a scheduled prediction should become active
 * Returns the cutoff time (7 PM CST or 6 hours before first match, whichever applies)
 * 
 * This works for both locked and unlocked matches, allowing users to schedule
 * predictions for future matches while traveling. The activation time follows
 * the same rules as regular prediction visibility (7 PM CST or 6 hours before match).
 */
export function getActivationTime(match: Match, allMatches: Match[]): Date {
  const now = new Date();
  
  // Get the Nepal day of this match
  const matchDate = match.matchDate.toDate();
  const matchNepalDay = getNepalDay(matchDate);
  const matchNepalDayKey = matchNepalDay.toISOString();
  
  // Check if match is on the same Nepal day as the "next" match
  // Most matches become visible at 7 PM CST, so we use that as the activation time
  const nextMatch = getNextMatch(allMatches);
  
  if (nextMatch) {
    // Get the Nepal day of the next match
    const nextMatchDate = nextMatch.matchDate.toDate();
    const nextMatchNepalDay = getNepalDay(nextMatchDate);
    const nextMatchNepalDayKey = nextMatchNepalDay.toISOString();
    
    // Check if this match is on the same Nepal day as the next match
    // This works even if the match is locked (status might not be 'upcoming' yet)
    const isSameNepalDay = matchNepalDayKey === nextMatchNepalDayKey;
    
    if (isSameNepalDay) {
      // Use 7 PM CST cutoff for matches on the same Nepal day as the next match
      // This matches when regular predictions become visible (7 PM CST)
      return getCutoffTimeForNepalDay(matchNepalDay);
    }
  } else {
    // If there's no "next" match, this match IS the next match (or all earlier matches are completed)
    // In this case, use 7 PM CST cutoff as well (matches become visible at 7 PM CST)
    // This handles the case where user schedules for the earliest upcoming match
    return getCutoffTimeForNepalDay(matchNepalDay);
  }
  
  // For matches on different Nepal days than the next match
  // Check if this match would be the earliest match on its Nepal day
  // If so, use 7 PM CST (since it would become visible at 7 PM CST when it becomes the "next" match)
  const dayKey = matchNepalDayKey;
  
  // Get all matches on the same Nepal day (including this match if it's in allMatches)
  const sameDayMatches = allMatches.filter((m) => {
    const mDate = m.matchDate.toDate();
    const mDayKey = getNepalDay(mDate).toISOString();
    return mDayKey === dayKey;
  });
  
  // Always include the current match in the check (in case it's not in allMatches yet)
  const allSameDayMatches = [...sameDayMatches];
  if (!allSameDayMatches.some(m => m.id === match.id)) {
    allSameDayMatches.push(match);
  }
  
  if (allSameDayMatches.length === 0) {
    // No matches on this day - use 7 PM CST (this match will be the next match)
    return getCutoffTimeForNepalDay(matchNepalDay);
  }
  
  // Sort by match date and get the first one
  allSameDayMatches.sort((a, b) => 
    a.matchDate.toDate().getTime() - b.matchDate.toDate().getTime()
  );
  
  const firstMatchOfDay = allSameDayMatches[0];
  const isThisMatchFirst = firstMatchOfDay.id === match.id;
  
  // If this match is the first match of its Nepal day, use 7 PM CST
  // (it will become visible at 7 PM CST when it becomes the "next" match)
  if (isThisMatchFirst) {
    return getCutoffTimeForNepalDay(matchNepalDay);
  }
  
  // If this match is not the first of the day, check if 7 PM CST would be before 6-hour cutoff
  const firstMatchStartTime = firstMatchOfDay.matchDate.toDate();
  
  // If first match is already completed or started, use current time (shouldn't happen for scheduling)
  if (firstMatchOfDay.status === 'completed' || now >= firstMatchStartTime) {
    return now;
  }
  
  // Calculate 6 hours before first match
  const editCutoffTime = new Date(firstMatchStartTime);
  editCutoffTime.setHours(editCutoffTime.getHours() - 6);
  
  // Calculate 7 PM CST for this match's Nepal day
  const sevenPMCST = getCutoffTimeForNepalDay(matchNepalDay);
  
  // Use whichever is earlier: 7 PM CST or 6 hours before first match
  // Since most matches become visible at 7 PM CST, prefer that unless 6-hour is significantly earlier
  // If 7 PM CST is before or equal to 6-hour cutoff, use 7 PM CST
  if (sevenPMCST <= editCutoffTime) {
    return sevenPMCST;
  }
  
  // Otherwise, use 6 hours before first match (for matches far in the future)
  return editCutoffTime;
}

/**
 * Check if a scheduled prediction should be activated
 * Primary check is done in Firestore query, this is a validation
 */
export function shouldActivateScheduledPrediction(
  prediction: Prediction,
  allMatches: Match[]
): boolean {
  if (!prediction.scheduledFor) {
    return false; // Not a scheduled prediction
  }
  
  const now = new Date();
  const scheduledTime = prediction.scheduledFor.toDate();
  
  // Check if scheduled time has passed
  if (scheduledTime > now) {
    return false; // Not yet time to activate
  }
  
  // Optional: Verify match cutoff time has passed (double-check)
  // Find the match
  const match = allMatches.find(m => m.id === prediction.matchId);
  if (!match) {
    return true; // Can't verify, but scheduled time has passed
  }
  
  // Verify that cutoff has actually passed
  const activationTime = getActivationTime(match, allMatches);
  return now >= activationTime;
}
