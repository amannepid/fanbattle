/**
 * COMPREHENSIVE SCORING LOGIC TEST SUITE
 * 
 * This script tests the scoring logic against expected outcomes
 * to ensure all rules are correctly implemented.
 * 
 * Usage: npm run test-scoring
 */

import { calculatePoints, getPointsBreakdown, getBasePoints, getPenaltyFee, calculatePenaltyFee } from '../lib/scoring';
import type { Match, Prediction, MatchType } from '../types';
import { Timestamp } from 'firebase/firestore';

interface TestCase {
  name: string;
  match: Match;
  prediction: Prediction;
  seasonTeamId: string;
  expected: {
    points: number;
    breakdown: {
      basePoints: number;
      momBonus: number;
      scoreBonus: number;
      wicketsBonus: number;
      seasonTeamAdjustment: number;
    };
    penaltyFee: number;
    isCorrectWinner: boolean;
    isCorrectPom: boolean;
    isCorrectScoreCategory: boolean;
    isCorrectWickets: boolean;
  };
}

// Helper to create a test match
function createMatch(
  id: string,
  matchType: MatchType,
  matchNumber: number,
  teamAId: string,
  teamBId: string,
  winnerId: string,
  momId: string,
  firstInningsBattingTeamId: string,
  firstInningsScore: number,
  firstInningsWickets: number,
  isReducedOvers: boolean = false
): Match {
  return {
    id,
    tournamentId: 'test-tournament',
    matchNumber,
    matchType,
    teamAId,
    teamBId,
    teamAName: `Team ${teamAId}`,
    teamBName: `Team ${teamBId}`,
    matchDate: Timestamp.now(),
    deadline: Timestamp.now(),
    status: 'completed',
    winnerId,
    winnerName: `Team ${winnerId}`,
    momId,
    momName: `Player ${momId}`,
    firstInningsBattingTeamId,
    firstInningsScore,
    firstInningsWickets,
    isReducedOvers,
  };
}

// Helper to create a test prediction
function createPrediction(
  userId: string,
  matchId: string,
  matchNumber: number,
  predictedWinnerId: string,
  predictedPomId: string | undefined,
  teamAScoreCategory: string | undefined,
  teamAWickets: number | undefined,
  teamBScoreCategory: string | undefined,
  teamBWickets: number | undefined
): Prediction {
  return {
    id: `${userId}_${matchId}`,
    userId,
    matchId,
    matchNumber,
    predictedWinnerId,
    predictedWinnerName: `Team ${predictedWinnerId}`,
    predictedPomId,
    predictedPomName: predictedPomId ? `Player ${predictedPomId}` : undefined,
    teamAScoreCategory: teamAScoreCategory as any,
    teamAWickets,
    teamBScoreCategory: teamBScoreCategory as any,
    teamBWickets,
    submittedAt: Timestamp.now(),
  };
}

// Test cases
const testCases: TestCase[] = [
  // ========== LEAGUE MATCHES ==========
  
  // Test 1: League - Perfect prediction (all correct)
  {
    name: 'League: Perfect prediction (winner, POM, score, wickets, season team wins)',
    match: createMatch('match-1', 'league', 1, 'team-a', 'team-b', 'team-a', 'pom-1', 'team-a', 150, 7),
    prediction: createPrediction('user-1', 'match-1', 1, 'team-a', 'pom-1', 'C', 7, 'D', 8),
    seasonTeamId: 'team-a',
    expected: {
      points: 3 + 1 + 1 + 1 + 1, // base(3) + score(1) + wickets(1) + pom(1) + season(1)
      breakdown: {
        basePoints: 3,
        momBonus: 1,
        scoreBonus: 1,
        wicketsBonus: 1,
        seasonTeamAdjustment: 1,
      },
      penaltyFee: 0,
      isCorrectWinner: true,
      isCorrectPom: true,
      isCorrectScoreCategory: true,
      isCorrectWickets: true,
    },
  },

  // Test 2: League - Wrong winner (penalty applies, but bonuses still count)
  {
    name: 'League: Wrong winner (penalty $2, season team loses, but score/wickets match)',
    match: createMatch('match-2', 'league', 2, 'team-a', 'team-b', 'team-b', 'pom-2', 'team-a', 140, 6),
    prediction: createPrediction('user-1', 'match-2', 2, 'team-a', 'pom-2', 'B', 6, 'C', 7), // Score B/6 matches
    seasonTeamId: 'team-a',
    expected: {
      points: 0 + 1 + 1 + 1 - 1, // base(0) + score(1) + wickets(1) + pom(1) + season(-1) = 2
      breakdown: {
        basePoints: 0,
        momBonus: 1, // POM matches
        scoreBonus: 1, // Score matches (B = 131-145, actual = 140)
        wicketsBonus: 1, // Wickets match (6)
        seasonTeamAdjustment: -1,
      },
      penaltyFee: 2,
      isCorrectWinner: false,
      isCorrectPom: true, // POM matches
      isCorrectScoreCategory: true, // Score matches
      isCorrectWickets: true, // Wickets match
    },
  },

  // Test 3: League - Correct winner, wrong bonuses, season team not in match
  {
    name: 'League: Correct winner, wrong bonuses, season team not playing',
    match: createMatch('match-3', 'league', 3, 'team-c', 'team-d', 'team-c', 'pom-3', 'team-c', 160, 8),
    prediction: createPrediction('user-1', 'match-3', 3, 'team-c', 'pom-1', 'D', 7, 'E', 8),
    seasonTeamId: 'team-a', // Season team not in this match
    expected: {
      points: 3 + 0 + 0 + 0 + 0, // base(3) + score(0) + wickets(0) + pom(0) + season(0)
      breakdown: {
        basePoints: 3,
        momBonus: 0,
        scoreBonus: 0,
        wicketsBonus: 0,
        seasonTeamAdjustment: 0,
      },
      penaltyFee: 0,
      isCorrectWinner: true,
      isCorrectPom: false,
      isCorrectScoreCategory: false,
      isCorrectWickets: false,
    },
  },

  // Test 4: League - Wrong winner, season team wins but user predicted against
  {
    name: 'League: Season team wins, but user predicted against (no season bonus, but bonuses count)',
    match: createMatch('match-4', 'league', 4, 'team-a', 'team-b', 'team-a', 'pom-4', 'team-a', 145, 6),
    prediction: createPrediction('user-1', 'match-4', 4, 'team-b', 'pom-4', 'B', 6, 'C', 7), // Score B/6 matches
    seasonTeamId: 'team-a',
    expected: {
      points: 0 + 1 + 1 + 1 + 0, // base(0) + score(1) + wickets(1) + pom(1) + season(0) = 3
      breakdown: {
        basePoints: 0,
        momBonus: 1, // POM matches
        scoreBonus: 1, // Score matches (B = 131-145, actual = 145)
        wicketsBonus: 1, // Wickets match (6)
        seasonTeamAdjustment: 0, // No bonus because user predicted against
      },
      penaltyFee: 2,
      isCorrectWinner: false,
      isCorrectPom: true,
      isCorrectScoreCategory: true,
      isCorrectWickets: true,
    },
  },

  // ========== PLAYOFF MATCHES ==========
  
  // Test 5: Qualifier - Perfect prediction
  {
    name: 'Qualifier: Perfect prediction (all correct)',
    match: createMatch('match-5', 'qualifier', 5, 'team-a', 'team-b', 'team-a', 'pom-5', 'team-a', 175, 5),
    prediction: createPrediction('user-1', 'match-5', 5, 'team-a', 'pom-5', 'D', 5, 'E', 6),
    seasonTeamId: 'team-a',
    expected: {
      points: 5 + 1 + 1 + 1 + 1, // base(5) + score(1) + wickets(1) + pom(1) + season(1)
      breakdown: {
        basePoints: 5,
        momBonus: 1,
        scoreBonus: 1,
        wicketsBonus: 1,
        seasonTeamAdjustment: 1,
      },
      penaltyFee: 0,
      isCorrectWinner: true,
      isCorrectPom: true,
      isCorrectScoreCategory: true,
      isCorrectWickets: true,
    },
  },

  // Test 6: Eliminator - Wrong winner (penalty $3, but bonuses still count)
  {
    name: 'Eliminator: Wrong winner (penalty $3, season team loses, but score/wickets match)',
    match: createMatch('match-6', 'eliminator', 6, 'team-a', 'team-b', 'team-b', 'pom-6', 'team-a', 130, 8),
    prediction: createPrediction('user-1', 'match-6', 6, 'team-a', 'pom-6', 'A', 8, 'B', 7), // Score A/8 matches
    seasonTeamId: 'team-a',
    expected: {
      points: 0 + 1 + 1 + 1 - 1, // base(0) + score(1) + wickets(1) + pom(1) + season(-1) = 2
      breakdown: {
        basePoints: 0,
        momBonus: 1, // POM matches
        scoreBonus: 1, // Score matches (A = <130, actual = 130)
        wicketsBonus: 1, // Wickets match (8)
        seasonTeamAdjustment: -1,
      },
      penaltyFee: 3,
      isCorrectWinner: false,
      isCorrectPom: true,
      isCorrectScoreCategory: true,
      isCorrectWickets: true,
    },
  },

  // ========== FINAL MATCH ==========
  
  // Test 7: Final - Perfect prediction
  {
    name: 'Final: Perfect prediction (all correct)',
    match: createMatch('match-7', 'final', 7, 'team-a', 'team-b', 'team-a', 'pom-7', 'team-a', 190, 4),
    prediction: createPrediction('user-1', 'match-7', 7, 'team-a', 'pom-7', 'E', 4, 'F', 3),
    seasonTeamId: 'team-a',
    expected: {
      points: 7 + 1 + 1 + 1 + 1, // base(7) + score(1) + wickets(1) + pom(1) + season(1)
      breakdown: {
        basePoints: 7,
        momBonus: 1,
        scoreBonus: 1,
        wicketsBonus: 1,
        seasonTeamAdjustment: 1,
      },
      penaltyFee: 0,
      isCorrectWinner: true,
      isCorrectPom: true,
      isCorrectScoreCategory: true,
      isCorrectWickets: true,
    },
  },

  // Test 8: Final - Wrong winner (penalty $5, but bonuses still count)
  {
    name: 'Final: Wrong winner (penalty $5, season team loses, but score/wickets match)',
    match: createMatch('match-8', 'final', 8, 'team-a', 'team-b', 'team-b', 'pom-8', 'team-a', 200, 3),
    prediction: createPrediction('user-1', 'match-8', 8, 'team-a', 'pom-8', 'F', 3, 'E', 4), // Score F/3 matches
    seasonTeamId: 'team-a',
    expected: {
      points: 0 + 1 + 1 + 1 - 1, // base(0) + score(1) + wickets(1) + pom(1) + season(-1) = 2
      breakdown: {
        basePoints: 0,
        momBonus: 1, // POM matches
        scoreBonus: 1, // Score matches (F = 191+, actual = 200)
        wicketsBonus: 1, // Wickets match (3)
        seasonTeamAdjustment: -1,
      },
      penaltyFee: 5,
      isCorrectWinner: false,
      isCorrectPom: true,
      isCorrectScoreCategory: true,
      isCorrectWickets: true,
    },
  },

  // ========== EDGE CASES ==========
  
  // Test 9: Reduced overs (no score/wickets bonuses)
  {
    name: 'League: Reduced overs (no score/wickets bonuses, but POM counts)',
    match: createMatch('match-9', 'league', 9, 'team-a', 'team-b', 'team-a', 'pom-9', 'team-a', 100, 5, true),
    prediction: createPrediction('user-1', 'match-9', 9, 'team-a', 'pom-9', 'A', 5, 'B', 6),
    seasonTeamId: 'team-a',
    expected: {
      points: 3 + 1 + 0 + 0 + 1, // base(3) + pom(1) + score(0) + wickets(0) + season(1)
      breakdown: {
        basePoints: 3,
        momBonus: 1,
        scoreBonus: 0, // No bonus for reduced overs
        wicketsBonus: 0, // No bonus for reduced overs
        seasonTeamAdjustment: 1,
      },
      penaltyFee: 0,
      isCorrectWinner: true,
      isCorrectPom: true,
      isCorrectScoreCategory: false, // Should be false for reduced overs
      isCorrectWickets: false, // Should be false for reduced overs
    },
  },

  // Test 10: Team B bats first (check prediction matching)
  {
    name: 'League: Team B bats first (should match Team B prediction)',
    match: createMatch('match-10', 'league', 10, 'team-a', 'team-b', 'team-a', 'pom-10', 'team-b', 155, 6),
    prediction: createPrediction('user-1', 'match-10', 10, 'team-a', 'pom-10', 'C', 7, 'C', 6), // Team B: C/6
    seasonTeamId: 'team-a',
    expected: {
      points: 3 + 1 + 1 + 1 + 1, // base(3) + score(1) + wickets(1) + pom(1) + season(1)
      breakdown: {
        basePoints: 3,
        momBonus: 1,
        scoreBonus: 1, // Team B prediction matches
        wicketsBonus: 1, // Team B prediction matches
        seasonTeamAdjustment: 1,
      },
      penaltyFee: 0,
      isCorrectWinner: true,
      isCorrectPom: true,
      isCorrectScoreCategory: true,
      isCorrectWickets: true,
    },
  },

  // Test 11: Score category edge cases (130 = A, 131 = B)
  {
    name: 'League: Score category edge case (130 = A, 131 = B)',
    match: createMatch('match-11', 'league', 11, 'team-a', 'team-b', 'team-a', 'pom-11', 'team-a', 130, 7),
    prediction: createPrediction('user-1', 'match-11', 11, 'team-a', 'pom-11', 'A', 7, 'B', 8),
    seasonTeamId: 'team-a',
    expected: {
      points: 3 + 1 + 1 + 1 + 1, // base(3) + score(1) + wickets(1) + pom(1) + season(1)
      breakdown: {
        basePoints: 3,
        momBonus: 1,
        scoreBonus: 1, // 130 should match category A
        wicketsBonus: 1,
        seasonTeamAdjustment: 1,
      },
      penaltyFee: 0,
      isCorrectWinner: true,
      isCorrectPom: true,
      isCorrectScoreCategory: true,
      isCorrectWickets: true,
    },
  },

  // Test 12: Partial bonuses (only score, not wickets)
  {
    name: 'League: Only score bonus (no wickets bonus)',
    match: createMatch('match-12', 'league', 12, 'team-a', 'team-b', 'team-a', 'pom-12', 'team-a', 150, 7),
    prediction: createPrediction('user-1', 'match-12', 12, 'team-a', 'pom-12', 'C', 8, 'D', 7), // Score C matches, wickets 8 != 7
    seasonTeamId: 'team-a',
    expected: {
      points: 3 + 1 + 1 + 0 + 1, // base(3) + score(1) + wickets(0) + pom(1) + season(1)
      breakdown: {
        basePoints: 3,
        momBonus: 1,
        scoreBonus: 1,
        wicketsBonus: 0, // Wickets don't match
        seasonTeamAdjustment: 1,
      },
      penaltyFee: 0,
      isCorrectWinner: true,
      isCorrectPom: true,
      isCorrectScoreCategory: true,
      isCorrectWickets: false,
    },
  },
];

// Run tests
function runTests() {
  console.log('🧪 Running Scoring Logic Test Suite\n');
  console.log('='.repeat(80));
  
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  testCases.forEach((testCase, index) => {
    const testNum = index + 1;
    console.log(`\n📋 Test ${testNum}: ${testCase.name}`);
    console.log('-'.repeat(80));

    try {
      // Calculate points using centralized function
      const result = calculatePoints(
        testCase.prediction,
        testCase.match,
        testCase.seasonTeamId
      );

      // Calculate penalty fee
      const penaltyFee = calculatePenaltyFee(testCase.prediction, testCase.match);

      // Check all expected values
      const checks = {
        points: result.points === testCase.expected.points,
        basePoints: result.breakdown.basePoints === testCase.expected.breakdown.basePoints,
        momBonus: result.breakdown.momBonus === testCase.expected.breakdown.momBonus,
        scoreBonus: result.breakdown.scoreBonus === testCase.expected.breakdown.scoreBonus,
        wicketsBonus: result.breakdown.wicketsBonus === testCase.expected.breakdown.wicketsBonus,
        seasonTeamAdjustment: result.breakdown.seasonTeamAdjustment === testCase.expected.breakdown.seasonTeamAdjustment,
        penaltyFee: penaltyFee === testCase.expected.penaltyFee,
        isCorrectWinner: result.isCorrectWinner === testCase.expected.isCorrectWinner,
        isCorrectPom: result.isCorrectPom === testCase.expected.isCorrectPom,
        isCorrectScoreCategory: result.isCorrectScoreCategory === testCase.expected.isCorrectScoreCategory,
        isCorrectWickets: result.isCorrectWickets === testCase.expected.isCorrectWickets,
      };

      const allPassed = Object.values(checks).every(v => v === true);

      if (allPassed) {
        console.log('✅ PASSED');
        passed++;
      } else {
        console.log('❌ FAILED');
        failed++;
        
        // Show detailed failure
        const failedChecks = Object.entries(checks)
          .filter(([_, passed]) => !passed)
          .map(([key, _]) => key);
        
        failures.push(`Test ${testNum}: ${testCase.name}`);
        failures.push(`  Failed checks: ${failedChecks.join(', ')}`);
        failures.push(`  Expected points: ${testCase.expected.points}, Got: ${result.points}`);
        failures.push(`  Expected breakdown:`, JSON.stringify(testCase.expected.breakdown, null, 2));
        failures.push(`  Got breakdown:`, JSON.stringify(result.breakdown, null, 2));
        failures.push('');
      }

      // Show detailed results
      console.log(`  Points: ${result.points} (expected: ${testCase.expected.points})`);
      console.log(`  Breakdown:`);
      console.log(`    Base: ${result.breakdown.basePoints} (expected: ${testCase.expected.breakdown.basePoints})`);
      console.log(`    POM: ${result.breakdown.momBonus} (expected: ${testCase.expected.breakdown.momBonus})`);
      console.log(`    Score: ${result.breakdown.scoreBonus} (expected: ${testCase.expected.breakdown.scoreBonus})`);
      console.log(`    Wickets: ${result.breakdown.wicketsBonus} (expected: ${testCase.expected.breakdown.wicketsBonus})`);
      console.log(`    Season: ${result.breakdown.seasonTeamAdjustment} (expected: ${testCase.expected.breakdown.seasonTeamAdjustment})`);
      console.log(`  Penalty: $${penaltyFee} (expected: $${testCase.expected.penaltyFee})`);
      console.log(`  Flags: Winner=${result.isCorrectWinner}, POM=${result.isCorrectPom}, Score=${result.isCorrectScoreCategory}, Wickets=${result.isCorrectWickets}`);

    } catch (error) {
      console.log('❌ ERROR');
      failed++;
      failures.push(`Test ${testNum}: ${testCase.name}`);
      failures.push(`  Error: ${error}`);
      failures.push('');
      console.error('  Error:', error);
    }
  });

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${passed}/${testCases.length}`);
  console.log(`❌ Failed: ${failed}/${testCases.length}`);
  console.log(`📈 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.log('\n❌ FAILURE DETAILS:');
    console.log('='.repeat(80));
    failures.forEach(f => console.log(f));
  }

  console.log('\n' + '='.repeat(80));
  
  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runTests();

