# Leaderboard and Ranking Logic Review

## Current Issues Found

### 1. **Ranking Display Mismatch**
- **Problem**: Leaderboard page uses `index + 1` instead of `entry.currentRank`
- **Location**: `app/leaderboard/page.tsx` line 213, 299
- **Impact**: If data isn't perfectly sorted, ranks won't match stored values

### 2. **Tournament Bonuses Don't Update Ranks**
- **Problem**: When tournament bonuses are applied, `totalPoints` is updated but ranks are not recalculated
- **Location**: `lib/tournament-bonuses.ts` `applyTournamentBonuses()` function
- **Impact**: After tournament ends, rankings won't reflect the new total points with bonuses

### 3. **Ranking Logic Consistency**
- **Current**: `getLeaderboard()` sorts by `totalPoints DESC, createdAt ASC`
- **Admin**: Updates `currentRank` based on sorted order from `getLeaderboard()`
- **Display**: Uses array index instead of stored `currentRank`
- **Issue**: Should use stored `currentRank` for consistency

## Fixes Needed

1. Update leaderboard page to use `entry.currentRank` instead of `index + 1`
2. Add rank recalculation after tournament bonuses are applied
3. Ensure ranking logic is consistent across all functions

