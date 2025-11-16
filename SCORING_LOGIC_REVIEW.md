# Scoring Logic Review

## Current Implementation vs Rules

### ✅ Season Team Adjustment Logic

**Rules:**
- If season team wins AND user predicted season team: +1 bonus
- If season team wins AND user predicted against season team: 0 (no bonus, no penalty)
- If season team loses: -1 penalty (regardless of prediction)

**Current Implementation:** ✅ CORRECT
```typescript
if (didSeasonTeamWin) {
  const didUserPredictSeasonTeam = predictedWinnerId === seasonTeamId;
  return didUserPredictSeasonTeam && isCorrectPrediction ? 1 : 0;
} else {
  return -1; // Always -1 if season team loses
}
```

**Example Verification:**
- Season team: Karnali
- User predicted: Pokhara (against season team)
- **If Pokhara wins (playoff):**
  - Base points: 5 (playoff win)
  - Season team adjustment: -1 (season team lost)
  - Total: 5 - 1 = **4 points** ✅
  - *Note: User's example says 3, but rules say playoff = 5, so 5-1=4*
- **If Karnali wins:**
  - Base points: 0 (wrong prediction)
  - Season team adjustment: 0 (predicted against, so no bonus)
  - Total: 0 ✅

### ✅ Player of the Match

**Rules:** Can choose from any team. Correct = +1 bonus

**Current Implementation:** ✅ CORRECT
- POM can be selected from any team ✅
- Correct prediction = +1 bonus ✅

### ✅ First Innings Score Category

**Rules:**
- Score category match: +1 bonus
- No match: 0 (no negative)
- Only first innings counts
- Reduced overs: doesn't count

**Current Implementation:** ✅ CORRECT
- Score category match = +1 bonus ✅
- No match = 0 (no negative) ✅
- Only checks team that batted first ✅
- Reduced overs check: `!match.isReducedOvers` ✅

### ✅ First Innings Wickets

**Rules:**
- Wickets match: +1 bonus
- No match: 0 (no negative)
- Only first innings counts
- Reduced overs: doesn't count

**Current Implementation:** ✅ CORRECT
- Wickets match = +1 bonus ✅
- No match = 0 (no negative) ✅
- Only checks team that batted first ✅
- Reduced overs check: `!match.isReducedOvers` ✅

### ✅ Base Points

**Rules:**
- League: 3 points for win, 0 for loss
- Playoff: 5 points for win, 0 for loss
- Final: 7 points for win, 0 for loss

**Current Implementation:** ✅ CORRECT
```typescript
league: 3,
playoff: 5,
final: 7
```
- Only awarded if winner prediction is correct ✅

### ✅ Penalty Fees

**Rules:**
- League: $2 for wrong prediction
- Playoff: $3 for wrong prediction
- Final: $5 for wrong prediction

**Current Implementation:** ✅ CORRECT
```typescript
league: 2,
playoff: 3,
final: 5
```
- Only charged if winner prediction is wrong ✅

### ⚠️ Tournament End Bonuses (NOT YET IMPLEMENTED)

**Rules:**
- Season team wins title: +5 points
- Highest run getter: +5 points
- Highest wicket taker: +5 points
- Player of tournament: +5 points

**Current Implementation:** ❌ NOT IMPLEMENTED
- These bonuses are not yet calculated or stored

### ✅ Match Rules

**Rules:**
- Draw/cancelled/reduced overs: first innings doesn't count
- Super over/DWL: winning team gets points

**Current Implementation:** ✅ PARTIALLY CORRECT
- Reduced overs check: `!match.isReducedOvers` ✅
- Draw/cancelled: Need to verify if handled
- Super over/DWL: Need to verify if handled

## Summary

✅ **Correctly Implemented:**
- Season team adjustment logic
- POM bonus
- Score category bonus
- Wickets bonus
- Base points (3/5/7)
- Penalty fees ($2/$3/$5)
- Reduced overs handling

❌ **Missing:**
- Tournament end bonuses (title winner, highest run/wicket, POT)

⚠️ **Needs Verification:**
- Draw/cancelled match handling
- Super over/DWL method handling

