'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { getActiveTournament, getUserEntry, getUserPredictions, getMatches } from '@/lib/firestore';
import { Loader2, Trophy, Target, CheckCircle, XCircle, Clock, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import type { Tournament, UserEntry, Prediction, Match } from '@/types';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [userEntry, setUserEntry] = useState<UserEntry | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [matches, setMatches] = useState<Map<string, Match>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedPredictions, setExpandedPredictions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, authLoading, router]);

  async function loadData() {
    try {
      if (!user) return;

      const entry = await getUserEntry(user.uid);
      if (!entry) {
        router.push('/register');
        return;
      }
      setUserEntry(entry);

      const activeTournament = await getActiveTournament();
      if (!activeTournament) {
        setLoading(false);
        return;
      }
      setTournament(activeTournament);

      const predictionsData = await getUserPredictions(user.uid);
      setPredictions(predictionsData);

      const matchesData = await getMatches(activeTournament.id);
      const matchMap = new Map(matchesData.map((m) => [m.id, m]));
      setMatches(matchMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!userEntry || !tournament) {
    return null;
  }

  const totalMatches = 31;
  const predictedMatches = predictions.length;
  const scoredPredictions = predictions.filter((p) => p.scoredAt);
  const correctPredictions = scoredPredictions.filter((p) => p.isCorrectWinner).length;
  const accuracy = scoredPredictions.length > 0 
    ? Math.round((correctPredictions / scoredPredictions.length) * 100) 
    : 0;

  // Group predictions by status
  const upcomingPredictions = predictions.filter((p) => {
    const match = matches.get(p.matchId);
    return match && match.status === 'upcoming';
  });

  const completedPredictions = predictions.filter((p) => {
    const match = matches.get(p.matchId);
    return match && match.status === 'completed';
  }).sort((a, b) => b.matchNumber - a.matchNumber);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">My Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="h-8 w-8 text-primary-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {userEntry.totalPoints}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Points</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            #{userEntry.currentRank || '-'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Current Rank</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="h-8 w-8 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {predictedMatches}/{totalMatches}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Predictions</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {accuracy}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
        </div>
      </div>

      {/* Tournament Predictions */}
      <div className="bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-400 dark:border-primary-600 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-bold text-primary-900 dark:text-primary-200 mb-4">
          Your Tournament Predictions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-primary-800 dark:text-primary-300 mb-1">Season Team</p>
            <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
              {userEntry.seasonTeamName}
            </p>
            <p className="text-xs text-primary-700 dark:text-primary-400 mt-1">
              +1 when they win (if you predicted correctly) • -1 when they lose
            </p>
          </div>
          {userEntry.playerOfTournamentName && (
            <div>
              <p className="text-sm text-primary-800 dark:text-primary-300 mb-1">Player of The Tournament</p>
              <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                {userEntry.playerOfTournamentName}
              </p>
            </div>
          )}
          {userEntry.highestRunScorerName && (
            <div>
              <p className="text-sm text-primary-800 dark:text-primary-300 mb-1">Highest Run Scorer</p>
              <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                {userEntry.highestRunScorerName}
              </p>
            </div>
          )}
          {userEntry.highestWicketTakerName && (
            <div>
              <p className="text-sm text-primary-800 dark:text-primary-300 mb-1">Highest Wicket Taker</p>
              <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                {userEntry.highestWicketTakerName}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Predictions */}
      {upcomingPredictions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Upcoming Matches
          </h2>
          <div className="space-y-3">
            {upcomingPredictions.slice(0, 5).map((prediction) => {
              const match = matches.get(prediction.matchId);
              if (!match) return null;

              const deadline = match.deadline.toDate();
              const canEdit = new Date() < deadline;

              return (
                <div key={prediction.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Match {prediction.matchNumber}
                      </span>
                    </div>
                    {canEdit && (
                      <Link
                        href={`/predict/${match.id}`}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Edit Prediction
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white">{match.teamAName}</h4>
                    </div>
                    <div className="px-4 text-gray-400">vs</div>
                    <div className="flex-1 text-right">
                      <h4 className="font-bold text-gray-900 dark:text-white">{match.teamBName}</h4>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {format(match.matchDate.toDate(), 'MMM dd, h:mm a')}
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Winner: </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {prediction.predictedWinnerName}
                        </span>
                      </div>
                      {prediction.predictedPomName && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Player of Match: </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {prediction.predictedPomName}
                          </span>
                        </div>
                      )}
                      {prediction.teamAScoreCategory && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">If {match.teamAName} bats: </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {prediction.teamAScoreCategory}/{prediction.teamAWickets} wickets
                          </span>
                        </div>
                      )}
                      {prediction.teamBScoreCategory && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">If {match.teamBName} bats: </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {prediction.teamBScoreCategory}/{prediction.teamBWickets} wickets
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end mt-3">
                      {canEdit ? (
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          {formatDistanceToNow(deadline, { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Predictions closed</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Predictions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Prediction History ({completedPredictions.length})
        </h2>
        {completedPredictions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No completed predictions yet. Results will appear here after matches are played.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedPredictions.map((prediction) => {
              const match = matches.get(prediction.matchId);
              if (!match) return null;

              const actualScore = match.firstInningsScore;
              const actualWickets = match.firstInningsWickets;
              const actualPom = match.momName;
              
              // Get predicted score/wickets based on which team batted first
              const firstInningsBattingTeam = match.firstInningsBattingTeamId;
              const predictedScoreCategory = firstInningsBattingTeam === match.teamAId 
                ? prediction.teamAScoreCategory 
                : prediction.teamBScoreCategory;
              const predictedWickets = firstInningsBattingTeam === match.teamAId 
                ? prediction.teamAWickets 
                : prediction.teamBWickets;

              // Score category mapping
              // A: Under 130 (0-129)
              // B: 131-145
              // C: 146-160
              // D: 161-175
              // E: 176-190
              // F: 191 and above
              const getScoreCategory = (score: number | undefined): string => {
                if (score === undefined) return '-';
                if (score < 130) return 'A';                    // 0-129 (Under 130)
                if (score === 130) return 'A';                  // Edge case: 130 treated as A
                if (score >= 131 && score <= 145) return 'B';  // 131-145
                if (score >= 146 && score <= 160) return 'C';  // 146-160
                if (score >= 161 && score <= 175) return 'D';  // 161-175
                if (score >= 176 && score <= 190) return 'E';  // 176-190
                return 'F';                                    // 191+
              };
              
              // Get score range for a category
              const getScoreRange = (category: string | undefined): string => {
                if (!category) return '-';
                switch (category) {
                  case 'A':
                    return '0-129 runs';
                  case 'B':
                    return '131-145 runs';
                  case 'C':
                    return '146-160 runs';
                  case 'D':
                    return '161-175 runs';
                  case 'E':
                    return '176-190 runs';
                  case 'F':
                    return '191+ runs';
                  default:
                    return '-';
                }
              };
              
              const actualScoreCategory = match.isReducedOvers ? '-' : getScoreCategory(actualScore);
              const isExpanded = expandedPredictions.has(prediction.id);

              const toggleExpand = () => {
                setExpandedPredictions((prev) => {
                  const newSet = new Set(prev);
                  if (newSet.has(prediction.id)) {
                    newSet.delete(prediction.id);
                  } else {
                    newSet.add(prediction.id);
                  }
                  return newSet;
                });
              };

              return (
                <div
                  key={prediction.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border-l-4 ${
                    prediction.isCorrectWinner
                      ? 'border-green-500'
                      : 'border-red-500'
                  }`}
                >
                  {/* Collapsible Header */}
                  <button
                    onClick={toggleExpand}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {prediction.isCorrectWinner ? (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      )}
                      <div className="text-left flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          Match {prediction.matchNumber} • {match.matchType}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {format(match.matchDate.toDate(), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
                          {match.teamAName} vs {match.teamBName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className={`text-xl font-bold ${
                          (prediction.pointsEarned || 0) > 0 
                            ? 'text-green-600' 
                            : (prediction.pointsEarned || 0) < 0
                            ? 'text-red-600'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {prediction.pointsEarned !== undefined 
                            ? (prediction.pointsEarned > 0 ? '+' : '') + prediction.pointsEarned 
                            : '-'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">points</div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-6 space-y-4">
                      {/* Match Teams */}
                      <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 text-center">
                            <div className="font-bold text-gray-900 dark:text-white text-lg">
                              {match.teamAName}
                            </div>
                            {match.winnerId === match.teamAId && (
                              <div className="text-xs text-green-600 font-medium mt-1">Winner</div>
                            )}
                          </div>
                          <div className="px-4 text-gray-400 font-bold">vs</div>
                          <div className="flex-1 text-center">
                            <div className="font-bold text-gray-900 dark:text-white text-lg">
                              {match.teamBName}
                            </div>
                            {match.winnerId === match.teamBId && (
                              <div className="text-xs text-green-600 font-medium mt-1">Winner</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Predictions vs Results */}
                      <div className="space-y-4">
                        {/* Winner Prediction vs Result */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Winner</span>
                            {prediction.isCorrectWinner ? (
                              <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-bold text-green-700 dark:text-green-400">
                                  +{match.matchType === 'league' ? '3' : match.matchType === 'playoff' ? '5' : '7'}
                                </span>
                              </div>
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your Prediction</div>
                              <div className={`font-medium ${prediction.isCorrectWinner ? 'text-green-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                {prediction.predictedWinnerName}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Actual Result</div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {match.winnerName || '-'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Player of the Match */}
                        {(prediction.predictedPomName || actualPom) && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Player of the Match</span>
                              {prediction.isCorrectPom ? (
                                <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-bold text-green-700 dark:text-green-400">+1</span>
                                </div>
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your Prediction</div>
                                <div className={`font-medium ${prediction.isCorrectPom ? 'text-green-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {prediction.predictedPomName || '-'}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Actual Result</div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {actualPom || '-'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* First Innings Predictions (only if not reduced overs) */}
                        {!match.isReducedOvers && (actualScore !== undefined || prediction.teamAScoreCategory || prediction.teamBScoreCategory) && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                First Innings Predictions
                              </span>
                              {(() => {
                                const scorePoints = prediction.isCorrectScoreCategory ? 1 : 0;
                                const wicketsPoints = prediction.isCorrectWickets ? 1 : 0;
                                const total = scorePoints + wicketsPoints;
                                
                                if (total === 0) {
                                  return <XCircle className="h-5 w-5 text-red-600" />;
                                }
                                
                                return (
                                  <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-bold text-green-700 dark:text-green-400">
                                      {scorePoints > 0 && wicketsPoints > 0 ? '1 + 1' : '1'}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {/* Your Predictions */}
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Your Prediction</div>
                                <div className="space-y-2">
                                  {/* Team A Prediction */}
                                  {(prediction.teamAScoreCategory !== undefined || prediction.teamAWickets !== undefined) && (() => {
                                    // Check if this prediction matches the actual result (only if this team batted first)
                                    const isTeamAUsed = firstInningsBattingTeam === match.teamAId;
                                    const teamAMatchesScore = isTeamAUsed && prediction.teamAScoreCategory === actualScoreCategory;
                                    const teamAMatchesWickets = isTeamAUsed && prediction.teamAWickets !== undefined && prediction.teamAWickets === actualWickets;
                                    const teamAMatches = teamAMatchesScore || teamAMatchesWickets;
                                    
                                    return (
                                      <div className={`font-medium text-sm p-2 rounded ${teamAMatches ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700' : ''}`}>
                                        <span className="font-semibold">{match.teamAName}</span>
                                        {' / '}
                                        {prediction.teamAScoreCategory ? (
                                          <span className={teamAMatchesScore ? 'text-green-700 dark:text-green-400 font-semibold' : ''}>
                                            {prediction.teamAScoreCategory} <span className="text-xs font-normal">({getScoreRange(prediction.teamAScoreCategory)})</span>
                                          </span>
                                        ) : '-'}
                                        {prediction.teamAScoreCategory && prediction.teamAWickets !== undefined ? ' / ' : ''}
                                        {prediction.teamAWickets !== undefined ? (
                                          <span className={teamAMatchesWickets ? 'text-green-700 dark:text-green-400 font-semibold' : ''}>
                                            {prediction.teamAWickets} Wickets
                                          </span>
                                        ) : ''}
                                      </div>
                                    );
                                  })()}

                                  {/* Team B Prediction */}
                                  {(prediction.teamBScoreCategory !== undefined || prediction.teamBWickets !== undefined) && (() => {
                                    // Check if this prediction matches the actual result (only if this team batted first)
                                    const isTeamBUsed = firstInningsBattingTeam === match.teamBId;
                                    const teamBMatchesScore = isTeamBUsed && prediction.teamBScoreCategory === actualScoreCategory;
                                    const teamBMatchesWickets = isTeamBUsed && prediction.teamBWickets !== undefined && prediction.teamBWickets === actualWickets;
                                    const teamBMatches = teamBMatchesScore || teamBMatchesWickets;
                                    
                                    return (
                                      <div className={`font-medium text-sm p-2 rounded ${teamBMatches ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700' : ''}`}>
                                        <span className="font-semibold">{match.teamBName}</span>
                                        {' / '}
                                        {prediction.teamBScoreCategory ? (
                                          <span className={teamBMatchesScore ? 'text-green-700 dark:text-green-400 font-semibold' : ''}>
                                            {prediction.teamBScoreCategory} <span className="text-xs font-normal">({getScoreRange(prediction.teamBScoreCategory)})</span>
                                          </span>
                                        ) : '-'}
                                        {prediction.teamBScoreCategory && prediction.teamBWickets !== undefined ? ' / ' : ''}
                                        {prediction.teamBWickets !== undefined ? (
                                          <span className={teamBMatchesWickets ? 'text-green-700 dark:text-green-400 font-semibold' : ''}>
                                            {prediction.teamBWickets} Wickets
                                          </span>
                                        ) : ''}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Match Result */}
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Match Result</div>
                                {actualScore !== undefined && (
                                  <div className="space-y-2">
                                    <div className="font-medium text-sm text-gray-900 dark:text-white p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                      <span className="font-semibold">
                                        {firstInningsBattingTeam === match.teamAId ? match.teamAName : match.teamBName}
                                      </span>
                                      {' / '}
                                      {actualScoreCategory} <span className="text-xs font-normal">({actualScore} runs)</span>
                                      {actualWickets !== undefined && ` / ${actualWickets} Wickets`}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Reduced Overs Notice */}
                        {match.isReducedOvers && (
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 rounded-lg p-3">
                            <div className="text-xs text-yellow-800 dark:text-yellow-200">
                              ⚠️ Reduced Overs Match - Score/Wickets predictions not counted
                            </div>
                          </div>
                        )}

                        {/* Season Team Adjustment */}
                        {prediction.seasonTeamAdjustment !== undefined && prediction.seasonTeamAdjustment !== 0 && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-400 dark:border-blue-600 rounded-lg p-3">
                            <div className="text-sm flex justify-between items-center">
                              <span className="text-gray-700 dark:text-gray-300">Season Team Adjustment:</span>
                              <div className={`flex items-center space-x-1 px-3 py-1 rounded-full font-bold ${
                                prediction.seasonTeamAdjustment > 0 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              }`}>
                                {prediction.seasonTeamAdjustment > 0 ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span>
                                  {prediction.seasonTeamAdjustment > 0 ? '+' : ''}{prediction.seasonTeamAdjustment}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

