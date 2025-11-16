import type { Match, Prediction, ScoringResult, ScoreCategory, MatchType } from '@/types';

/**
 * Get base points for a match type
 */
export function getBasePoints(matchType: MatchType): number {
  const pointsMap = {
    league: 3,
    playoff: 5,
    final: 7,
  };
  return pointsMap[matchType];
}

/**
 * Get penalty fee for a match type
 */
export function getPenaltyFee(matchType: MatchType): number {
  const penaltyMap = {
    league: 2,
    playoff: 3,
    final: 5,
  };
  return penaltyMap[matchType];
}

/**
 * Determine the score category from a score value
 */
export function getScoreCategory(score: number): ScoreCategory {
  if (score <= 100) return 'A';
  if (score <= 130) return 'B';
  if (score <= 160) return 'C';
  if (score <= 190) return 'D';
  if (score <= 220) return 'E';
  return 'F';
}

/**
 * Main scoring function
 * Calculates points for a prediction based on match result and season team
 */
export function calculatePoints(
  prediction: Prediction,
  match: Match,
  seasonTeamId: string
): ScoringResult {
  const basePoints = getBasePoints(match.matchType);
  
  // Initialize result
  const result: ScoringResult = {
    points: 0,
    breakdown: {
      basePoints: 0,
      winnerBonus: 0,
      momBonus: 0,
      scoreBonus: 0,
      wicketsBonus: 0,
      seasonTeamAdjustment: 0,
    },
    isCorrectWinner: false,
    isCorrectPom: false,
    isCorrectScoreCategory: false,
    isCorrectWickets: false,
  };

  // 1. Check if winner prediction is correct
  const isCorrectWinner = prediction.predictedWinnerId === match.winnerId;
  result.isCorrectWinner = isCorrectWinner;
  
  if (isCorrectWinner) {
    result.breakdown.basePoints = basePoints;
  }

  // 2. Season Team Adjustment
  const seasonTeamAdjustment = calculateSeasonTeamAdjustment(
    match,
    seasonTeamId,
    prediction.predictedWinnerId,
    isCorrectWinner
  );
  result.breakdown.seasonTeamAdjustment = seasonTeamAdjustment;

  // 3. Bonus Points (only if innings are valid - not reduced overs)
  const isInningsValid = !match.isReducedOvers;

  // Player of the Match bonus
  if (prediction.predictedMomId && match.momId) {
    const isCorrectPom = prediction.predictedMomId === match.momId;
    result.isCorrectPom = isCorrectPom;
    if (isCorrectPom) {
      result.breakdown.momBonus = 1;
    }
  }

  // Score category bonus (only if innings valid)
  if (isInningsValid && prediction.predictedScoreCategory && match.firstInningsScore !== undefined) {
    const actualCategory = getScoreCategory(match.firstInningsScore);
    const isCorrectScoreCategory = prediction.predictedScoreCategory === actualCategory;
    result.isCorrectScoreCategory = isCorrectScoreCategory;
    if (isCorrectScoreCategory) {
      result.breakdown.scoreBonus = 1;
    }
  }

  // Wickets bonus (only if innings valid)
  if (isInningsValid && prediction.predictedWickets !== undefined && match.firstInningsWickets !== undefined) {
    const isCorrectWickets = prediction.predictedWickets === match.firstInningsWickets;
    result.isCorrectWickets = isCorrectWickets;
    if (isCorrectWickets) {
      result.breakdown.wicketsBonus = 1;
    }
  }

  // Calculate total points
  result.points =
    result.breakdown.basePoints +
    result.breakdown.winnerBonus +
    result.breakdown.momBonus +
    result.breakdown.scoreBonus +
    result.breakdown.wicketsBonus +
    result.breakdown.seasonTeamAdjustment;

  return result;
}

/**
 * Calculate season team adjustment
 * Rules:
 * - If season team wins AND user predicted correctly: +1 bonus
 * - If season team loses: -1 penalty (regardless of user prediction)
 */
function calculateSeasonTeamAdjustment(
  match: Match,
  seasonTeamId: string,
  predictedWinnerId: string,
  isCorrectPrediction: boolean
): number {
  // Check if season team is in this match
  const isSeasonTeamInMatch = seasonTeamId === match.teamAId || seasonTeamId === match.teamBId;
  
  if (!isSeasonTeamInMatch) {
    return 0; // Season team not playing, no adjustment
  }

  // Check if season team won
  const didSeasonTeamWin = seasonTeamId === match.winnerId;

  if (didSeasonTeamWin) {
    // Season team won
    // +1 bonus only if user predicted season team to win
    const didUserPredictSeasonTeam = predictedWinnerId === seasonTeamId;
    return didUserPredictSeasonTeam && isCorrectPrediction ? 1 : 0;
  } else {
    // Season team lost
    // -1 penalty always (regardless of user prediction)
    return -1;
  }
}

/**
 * Calculate penalty fee based on match result
 */
export function calculatePenaltyFee(
  prediction: Prediction,
  match: Match
): number {
  const isCorrectWinner = prediction.predictedWinnerId === match.winnerId;
  
  // Penalty only if prediction was wrong
  if (isCorrectWinner) {
    return 0;
  }
  
  return getPenaltyFee(match.matchType);
}

/**
 * Test scenarios for validation
 */
export const testScenarios = [
  {
    name: 'League match: Correct winner, season team wins, predicted correctly',
    match: {
      matchType: 'league' as MatchType,
      winnerId: 'team-a',
      teamAId: 'team-a',
      teamBId: 'team-b',
      momId: 'player-1',
      firstInningsScore: 150,
      firstInningsWickets: 7,
      isReducedOvers: false,
    },
    prediction: {
      predictedWinnerId: 'team-a',
      predictedMomId: 'player-1',
      predictedScoreCategory: 'C' as ScoreCategory,
      predictedWickets: 7,
    },
    seasonTeamId: 'team-a',
    expectedPoints: 3 + 1 + 1 + 1 + 1, // base + season + mom + score + wickets = 7
  },
  {
    name: 'League match: Correct winner, season team loses',
    match: {
      matchType: 'league' as MatchType,
      winnerId: 'team-b',
      teamAId: 'team-a',
      teamBId: 'team-b',
      momId: 'player-2',
      firstInningsScore: 150,
      firstInningsWickets: 7,
      isReducedOvers: false,
    },
    prediction: {
      predictedWinnerId: 'team-b',
      predictedMomId: 'player-2',
      predictedScoreCategory: 'C' as ScoreCategory,
      predictedWickets: 7,
    },
    seasonTeamId: 'team-a', // Season team lost
    expectedPoints: 3 - 1 + 1 + 1 + 1, // base - season penalty + bonuses = 5
  },
  {
    name: 'Playoff match: User predicted against season team, season team lost',
    match: {
      matchType: 'playoff' as MatchType,
      winnerId: 'team-b',
      teamAId: 'team-a',
      teamBId: 'team-b',
      momId: 'player-2',
      firstInningsScore: 150,
      firstInningsWickets: 7,
      isReducedOvers: false,
    },
    prediction: {
      predictedWinnerId: 'team-b', // Predicted against season team
      predictedMomId: 'player-2',
      predictedScoreCategory: 'C' as ScoreCategory,
      predictedWickets: 7,
    },
    seasonTeamId: 'team-a', // Season team lost
    expectedPoints: 5 - 1 + 1 + 1 + 1, // base - season penalty + bonuses = 7 (no season team bonus since predicted against)
  },
  {
    name: 'Reduced overs match: Score and wickets dont count',
    match: {
      matchType: 'league' as MatchType,
      winnerId: 'team-a',
      teamAId: 'team-a',
      teamBId: 'team-b',
      momId: 'player-1',
      firstInningsScore: 150,
      firstInningsWickets: 7,
      isReducedOvers: true, // Reduced overs
    },
    prediction: {
      predictedWinnerId: 'team-a',
      predictedMomId: 'player-1',
      predictedScoreCategory: 'C' as ScoreCategory,
      predictedWickets: 7,
    },
    seasonTeamId: 'team-c', // Not in match
    expectedPoints: 3 + 1, // base + mom only (no score/wickets) = 4
  },
  {
    name: 'Final match: Wrong prediction',
    match: {
      matchType: 'final' as MatchType,
      winnerId: 'team-b',
      teamAId: 'team-a',
      teamBId: 'team-b',
      momId: 'player-2',
      firstInningsScore: 150,
      firstInningsWickets: 7,
      isReducedOvers: false,
    },
    prediction: {
      predictedWinnerId: 'team-a', // Wrong prediction
      predictedMomId: 'player-1',
      predictedScoreCategory: 'C' as ScoreCategory,
      predictedWickets: 7,
    },
    seasonTeamId: 'team-c', // Not in match
    expectedPoints: 0, // No points for wrong winner
    expectedPenaltyFee: 5, // $5 penalty for final
  },
];

