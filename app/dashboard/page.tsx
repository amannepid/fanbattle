'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { getActiveTournament, getUserEntry, getUserPredictions, getMatches, getTeams, filterScheduledPredictions, filterActivePredictions } from '@/lib/firestore';
import { shouldBlockMatchAt8PMCST, getNepalDay } from '@/lib/prediction-rules';
import { getBasePoints } from '@/lib/scoring';
import { Loader2, Trophy, Target, CheckCircle, XCircle, Clock, TrendingUp, ChevronDown, ChevronUp, Copy, CheckCircle2, Calendar } from 'lucide-react';
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
  const [teams, setTeams] = useState<Map<string, { name: string; shortCode: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedPredictions, setExpandedPredictions] = useState<Set<string>>(new Set());
  const [copiedPredictionId, setCopiedPredictionId] = useState<string | null>(null);

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

      // Fetch user entry first to check if registered
      const entry = await getUserEntry(user.uid);
      if (!entry) {
        router.push('/register');
        return;
      }
      setUserEntry(entry);

      // Fetch tournament first to get tournamentId
      const activeTournament = await getActiveTournament();
      if (!activeTournament) {
        setLoading(false);
        return;
      }
      setTournament(activeTournament);

      // Fetch remaining data in parallel (cache will prevent duplicate reads)
      const [predictionsData, matchesData, teamsData] = await Promise.all([
        getUserPredictions(user.uid),
        getMatches(activeTournament.id),
        getTeams(activeTournament.id)
      ]);

      setPredictions(predictionsData);
      const matchMap = new Map(matchesData.map((m) => [m.id, m]));
      setMatches(matchMap);
      const teamMap = new Map(teamsData.map((t) => [t.id, { name: t.name, shortCode: t.shortCode }]));
      setTeams(teamMap);
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
  
  // Filter active and scheduled predictions (client-side, zero Firestore reads)
  const activePredictions = filterActivePredictions(predictions);
  const scheduledPredictions = filterScheduledPredictions(predictions);
  
  const predictedMatches = activePredictions.length;
  const scoredPredictions = activePredictions.filter((p) => p.scoredAt);
  const correctPredictions = scoredPredictions.filter((p) => p.isCorrectWinner).length;
  const accuracy = scoredPredictions.length > 0 
    ? Math.round((correctPredictions / scoredPredictions.length) * 100) 
    : 0;

  // Group active predictions by status (exclude scheduled)
  const upcomingPredictions = activePredictions.filter((p) => {
    const match = matches.get(p.matchId);
    return match && match.status === 'upcoming';
  });

  const completedPredictions = activePredictions.filter((p) => {
    const match = matches.get(p.matchId);
    return match && match.status === 'completed';
  }).sort((a, b) => b.matchNumber - a.matchNumber);

  // Helper function to get first match of the day for a given match (using Nepal Time)
  function getFirstMatchOfDay(match: Match): Match | null {
    const matchDate = match.matchDate.toDate();
    const dayKey = getNepalDay(matchDate).toISOString();
    
    // Get all matches and find the first one on the same Nepal day
    // Include both upcoming and completed matches to get the actual first match of the day
    const allMatches = Array.from(matches.values());
    const sameDayMatches = allMatches.filter((m) => {
      const mDate = m.matchDate.toDate();
      const mDayKey = getNepalDay(mDate).toISOString();
      return mDayKey === dayKey;
    });
    
    if (sameDayMatches.length === 0) return null;
    
    // Sort by match date and return the first one (regardless of status)
    sameDayMatches.sort((a, b) => 
      a.matchDate.toDate().getTime() - b.matchDate.toDate().getTime()
    );
    
    return sameDayMatches[0];
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Dashboard</h1>
        <Link
          href="/dashboard/schedule"
          className="px-4 py-2 bg-purple-500 text-white rounded-button hover:bg-purple-400 transition font-bold shadow-md hover:shadow-lg min-h-[44px] text-sm sm:text-base flex items-center space-x-2"
        >
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Schedule Prediction</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary-600 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {userEntry.totalPoints}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Points</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-600 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            #{userEntry.currentRank || '-'}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Current Rank</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {predictedMatches}/{totalMatches}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Predictions</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-600 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {accuracy}%
          </div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
        </div>
      </div>

      {/* Tournament Predictions */}
      <div className="bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-400 dark:border-primary-600 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-bold text-primary-900 dark:text-primary-200 mb-3 sm:mb-4">
          Your Tournament Predictions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-primary-800 dark:text-primary-300 mb-1">Season Team</p>
            <p className="text-lg sm:text-xl font-bold text-primary-600 dark:text-primary-400 truncate">
              {userEntry.seasonTeamName}
            </p>
            <p className="text-[10px] sm:text-xs text-primary-700 dark:text-primary-400 mt-1">
              +1 when they win (if you predicted correctly) • -1 when they lose
            </p>
          </div>
          {userEntry.playerOfTournamentName && (
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-primary-800 dark:text-primary-300 mb-1">Player of The Tournament</p>
              <p className="text-lg sm:text-xl font-bold text-primary-600 dark:text-primary-400 truncate">
                {userEntry.playerOfTournamentName}
              </p>
            </div>
          )}
          {userEntry.highestRunScorerName && (
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-primary-800 dark:text-primary-300 mb-1">Highest Run Scorer</p>
              <p className="text-lg sm:text-xl font-bold text-primary-600 dark:text-primary-400 truncate">
                {userEntry.highestRunScorerName}
              </p>
            </div>
          )}
          {userEntry.highestWicketTakerName && (
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-primary-800 dark:text-primary-300 mb-1">Highest Wicket Taker</p>
              <p className="text-lg sm:text-xl font-bold text-primary-600 dark:text-primary-400 truncate">
                {userEntry.highestWicketTakerName}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scheduled Predictions */}
      {scheduledPredictions.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Scheduled Predictions ({scheduledPredictions.length})
          </h2>
          <div className="space-y-3">
            {scheduledPredictions.map((prediction) => {
              const match = matches.get(prediction.matchId);
              if (!match) return null;

              const now = new Date();
              const scheduledTime = prediction.scheduledFor!.toDate();
              const canEdit = now < scheduledTime;

              return (
                <div key={prediction.id} className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        Match {prediction.matchNumber}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-yellow-700 dark:text-yellow-300">
                        (Scheduled)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">{match.teamAName}</h4>
                    </div>
                    <div className="px-2 sm:px-4 text-xs sm:text-sm text-gray-400">vs</div>
                    <div className="flex-1 text-right min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">{match.teamBName}</h4>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
                    {format(match.matchDate.toDate(), 'MMM dd, h:mm a')}
                  </div>
                  <div className="bg-yellow-100 dark:bg-yellow-800/30 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3">
                    <div className="text-xs sm:text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Will activate at: {format(scheduledTime, 'MMM dd, h:mm a')}
                    </div>
                    <div className="text-[10px] sm:text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      {formatDistanceToNow(scheduledTime, { addSuffix: true })}
                    </div>
                  </div>
                  <div className="border-t pt-2 sm:pt-3 mt-2 sm:mt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm">
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
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-3 sm:mt-4 gap-2 sm:gap-3 pt-3 border-t border-yellow-300 dark:border-yellow-700">
                    {/* Copy Prediction Button */}
                    <button
                      type="button"
                      onClick={async () => {
                        const teamA = teams.get(match.teamAId);
                        const teamB = teams.get(match.teamBId);
                        const winnerTeam = teams.get(prediction.predictedWinnerId);
                        
                        const teamAShortCode = teamA?.shortCode || match.teamAName;
                        const teamBShortCode = teamB?.shortCode || match.teamBName;
                        const winnerShortCode = winnerTeam?.shortCode || prediction.predictedWinnerName || 'N/A';
                        
                        const matchType = match.matchType;
                        
                        let content = `Match ${prediction.matchNumber} . ${matchType}\n`;
                        content += `${teamAShortCode} vs ${teamBShortCode}\n`;
                        content += `Winner: ${winnerShortCode}\n`;
                        
                        // Team A prediction
                        if (prediction.teamAScoreCategory || prediction.teamAWickets !== undefined) {
                          const scoreCat = prediction.teamAScoreCategory || '-';
                          const wickets = prediction.teamAWickets !== undefined ? prediction.teamAWickets : '-';
                          content += `${teamAShortCode} / ${scoreCat} / ${wickets}\n`;
                        }
                        
                        // Team B prediction
                        if (prediction.teamBScoreCategory || prediction.teamBWickets !== undefined) {
                          const scoreCat = prediction.teamBScoreCategory || '-';
                          const wickets = prediction.teamBWickets !== undefined ? prediction.teamBWickets : '-';
                          content += `${teamBShortCode} / ${scoreCat} / ${wickets}\n`;
                        }
                        
                        // MoM
                        if (prediction.predictedPomName) {
                          content += `MoM: ${prediction.predictedPomName}`;
                        }
                        
                        try {
                          await navigator.clipboard.writeText(content);
                          setCopiedPredictionId(prediction.id);
                          setTimeout(() => setCopiedPredictionId(null), 2000);
                        } catch (err) {
                          console.error('Failed to copy:', err);
                        }
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium min-h-[44px]"
                    >
                      {copiedPredictionId === prediction.id ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Prediction
                        </>
                      )}
                    </button>
                    
                    {/* Update Schedule Button */}
                    {canEdit && (
                      <Link
                        href={`/dashboard/schedule?matchId=${match.id}`}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium min-h-[44px]"
                      >
                        <Calendar className="h-4 w-4" />
                        Update Schedule
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Predictions */}
      {upcomingPredictions.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Upcoming Matches
          </h2>
          <div className="space-y-3">
            {upcomingPredictions.slice(0, 5).map((prediction) => {
              const match = matches.get(prediction.matchId);
              if (!match) return null;

              // Get first match of the day
              const firstMatchOfDay = getFirstMatchOfDay(match);
              if (!firstMatchOfDay) return null;

              const now = new Date();
              
              // Check 7 PM CST cutoff for matches on the same Nepal day as the "next" match
              const shouldBlock = shouldBlockMatchAt8PMCST(match, Array.from(matches.values()));
              
              const firstMatchStartTime = firstMatchOfDay.matchDate.toDate();
              
              // Edit button: visible until 6 hours before first match start time
              // Also block if first match is already completed or started
              // Also block if this match is on the same Nepal day and past 7 PM CST cutoff
              const editCutoffTime = new Date(firstMatchStartTime);
              editCutoffTime.setHours(editCutoffTime.getHours() - 6);
              const canEdit = !shouldBlock && 
                             now < editCutoffTime && 
                             firstMatchOfDay.status !== 'completed' && 
                             now < firstMatchStartTime;
              
              // Copy button: visible until 4 hours before first match start time
              const copyCutoffTime = new Date(firstMatchStartTime);
              copyCutoffTime.setHours(copyCutoffTime.getHours() - 4);
              const canCopy = now < copyCutoffTime;

              const deadline = match.deadline.toDate();

              return (
                <div key={prediction.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        Match {prediction.matchNumber}
                      </span>
                    </div>
                    {canEdit && (
                      <Link
                        href={`/predict/${match.id}`}
                        className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-medium min-h-[44px] px-2 py-1 sm:px-3 sm:py-1.5 flex items-center justify-center rounded-lg"
                      >
                        Edit Prediction
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">{match.teamAName}</h4>
                    </div>
                    <div className="px-2 sm:px-4 text-xs sm:text-sm text-gray-400">vs</div>
                    <div className="flex-1 text-right min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">{match.teamBName}</h4>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
                    {format(match.matchDate.toDate(), 'MMM dd, h:mm a')}
                  </div>
                  <div className="border-t pt-2 sm:pt-3 mt-2 sm:mt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm">
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
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 sm:mt-3 gap-2 sm:gap-0">
                      {canCopy && (
                        <button
                          type="button"
                          onClick={async () => {
                          const teamA = teams.get(match.teamAId);
                          const teamB = teams.get(match.teamBId);
                          const winnerTeam = teams.get(prediction.predictedWinnerId);
                          
                          const teamAShortCode = teamA?.shortCode || match.teamAName;
                          const teamBShortCode = teamB?.shortCode || match.teamBName;
                          const winnerShortCode = winnerTeam?.shortCode || prediction.predictedWinnerName || 'N/A';
                          
                          const matchType = match.matchType;
                          
                          let content = `Match ${prediction.matchNumber} . ${matchType}\n`;
                          content += `${teamAShortCode} vs ${teamBShortCode}\n`;
                          content += `Winner: ${winnerShortCode}\n`;
                          
                          // Team A prediction
                          if (prediction.teamAScoreCategory || prediction.teamAWickets !== undefined) {
                            const scoreCat = prediction.teamAScoreCategory || '-';
                            const wickets = prediction.teamAWickets !== undefined ? prediction.teamAWickets : '-';
                            content += `${teamAShortCode} / ${scoreCat} / ${wickets}\n`;
                          }
                          
                          // Team B prediction
                          if (prediction.teamBScoreCategory || prediction.teamBWickets !== undefined) {
                            const scoreCat = prediction.teamBScoreCategory || '-';
                            const wickets = prediction.teamBWickets !== undefined ? prediction.teamBWickets : '-';
                            content += `${teamBShortCode} / ${scoreCat} / ${wickets}\n`;
                          }
                          
                          // MoM
                          if (prediction.predictedPomName) {
                            content += `MoM: ${prediction.predictedPomName}`;
                          }
                          
                          try {
                            await navigator.clipboard.writeText(content);
                            setCopiedPredictionId(prediction.id);
                            setTimeout(() => setCopiedPredictionId(null), 2000);
                          } catch (err) {
                            console.error('Failed to copy:', err);
                          }
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium min-h-[44px]"
                      >
                        {copiedPredictionId === prediction.id ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy Prediction
                          </>
                        )}
                      </button>
                      )}
                      {canEdit ? (
                        <span className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {formatDistanceToNow(deadline, { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">Predictions closed</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tournament Prediction Score - Only show if tournament is completed */}
      {tournament.status === 'completed' && userEntry.tournamentBonuses && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            Tournament Prediction Score
          </h2>
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg shadow-md border border-purple-200 dark:border-purple-800 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {/* Season Team Wins Title */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                      Season Team Wins
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {userEntry.seasonTeamName} {tournament.winnerTeamId === userEntry.seasonTeamId ? '✓' : '✗'}
                    </div>
                  </div>
                  {userEntry.tournamentBonuses.seasonTeamWinsTitle > 0 ? (
                    <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full ml-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-bold text-green-700 dark:text-green-400">
                        +{userEntry.tournamentBonuses.seasonTeamWinsTitle}
                      </span>
                    </div>
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 ml-2 flex-shrink-0" />
                  )}
                </div>
              </div>

              {/* Player of Tournament */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                      Player of Tournament
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`truncate ${userEntry.tournamentBonuses.playerOfTournament > 0 ? 'text-green-600 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                        {userEntry.playerOfTournamentName || '-'}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="truncate text-gray-700 dark:text-gray-300">
                        {tournament.playerOfTournamentName || '-'}
                      </span>
                    </div>
                  </div>
                  {userEntry.tournamentBonuses.playerOfTournament > 0 ? (
                    <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full ml-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-bold text-green-700 dark:text-green-400">
                        +{userEntry.tournamentBonuses.playerOfTournament}
                      </span>
                    </div>
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 ml-2 flex-shrink-0" />
                  )}
                </div>
              </div>

              {/* Highest Run Scorer */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                      Highest Run Scorer
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`truncate ${userEntry.tournamentBonuses.highestRunScorer > 0 ? 'text-green-600 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                        {userEntry.highestRunScorerName || '-'}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="truncate text-gray-700 dark:text-gray-300">
                        {tournament.highestRunScorerName || '-'}
                      </span>
                    </div>
                  </div>
                  {userEntry.tournamentBonuses.highestRunScorer > 0 ? (
                    <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full ml-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-bold text-green-700 dark:text-green-400">
                        +{userEntry.tournamentBonuses.highestRunScorer}
                      </span>
                    </div>
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 ml-2 flex-shrink-0" />
                  )}
                </div>
              </div>

              {/* Highest Wicket Taker */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                      Highest Wicket Taker
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`truncate ${userEntry.tournamentBonuses.highestWicketTaker > 0 ? 'text-green-600 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                        {userEntry.highestWicketTakerName || '-'}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="truncate text-gray-700 dark:text-gray-300">
                        {tournament.highestWicketTakerName || '-'}
                      </span>
                    </div>
                  </div>
                  {userEntry.tournamentBonuses.highestWicketTaker > 0 ? (
                    <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full ml-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-bold text-green-700 dark:text-green-400">
                        +{userEntry.tournamentBonuses.highestWicketTaker}
                      </span>
                    </div>
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 ml-2 flex-shrink-0" />
                  )}
                </div>
              </div>
            </div>

            {/* Total Tournament Bonus */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-3 border border-green-300 dark:border-green-700">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  Total Tournament Bonus
                </div>
                <div className={`text-lg font-bold ${
                  (userEntry.tournamentBonuses.seasonTeamWinsTitle + 
                   userEntry.tournamentBonuses.playerOfTournament + 
                   userEntry.tournamentBonuses.highestRunScorer + 
                   userEntry.tournamentBonuses.highestWicketTaker) > 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  +{userEntry.tournamentBonuses.seasonTeamWinsTitle + 
                    userEntry.tournamentBonuses.playerOfTournament + 
                    userEntry.tournamentBonuses.highestRunScorer + 
                    userEntry.tournamentBonuses.highestWicketTaker} pts
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed Predictions */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Prediction History ({completedPredictions.length})
        </h2>
        {completedPredictions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 sm:p-12 text-center">
            <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-400">
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
                    className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors min-h-[44px]"
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      {prediction.isCorrectWinner ? (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
                      )}
                      <div className="text-left flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                          Match {prediction.matchNumber} • {match.matchType}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 whitespace-nowrap">
                          {format(match.matchDate.toDate(), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5 sm:mt-1 truncate">
                          {match.teamAName} vs {match.teamBName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                    <div className="text-right">
                        <div className={`text-lg sm:text-xl font-bold ${
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
                      <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">points</div>
                        {prediction.penaltyFee !== undefined && prediction.penaltyFee > 0 && (
                          <div className="text-[10px] sm:text-xs font-semibold text-red-600 dark:text-red-400 mt-0.5 sm:mt-1 whitespace-nowrap">
                            -${prediction.penaltyFee} penalty
                    </div>
                        )}
                  </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-3 pb-4 sm:px-4 sm:pb-6 space-y-3 sm:space-y-4">
                      {/* Match Teams */}
                      <div className="mb-3 pb-3 sm:mb-4 sm:pb-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 text-center min-w-0">
                            <div className="font-bold text-gray-900 dark:text-white text-base sm:text-lg truncate">
                              {match.teamAName}
                            </div>
                            {match.winnerId === match.teamAId && (
                              <div className="text-[10px] sm:text-xs text-green-600 font-medium mt-0.5 sm:mt-1">Winner</div>
                            )}
                          </div>
                          <div className="px-2 sm:px-4 text-base sm:text-lg text-gray-400 font-bold">vs</div>
                          <div className="flex-1 text-center min-w-0">
                            <div className="font-bold text-gray-900 dark:text-white text-base sm:text-lg truncate">
                              {match.teamBName}
                            </div>
                            {match.winnerId === match.teamBId && (
                              <div className="text-[10px] sm:text-xs text-green-600 font-medium mt-0.5 sm:mt-1">Winner</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Predictions vs Results */}
                      <div className="space-y-3 sm:space-y-4">
                        {/* Winner Prediction vs Result */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4">
                          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Winner</span>
                            {prediction.isCorrectWinner ? (
                              <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full">
                                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                                <span className="text-xs sm:text-sm font-bold text-green-700 dark:text-green-400">
                                  +{getBasePoints(match.matchType)}
                                </span>
                              </div>
                        ) : (
                              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="min-w-0">
                              <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Your Prediction</div>
                              <div className={`font-medium text-xs sm:text-sm truncate ${prediction.isCorrectWinner ? 'text-green-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                {prediction.predictedWinnerName}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Actual Result</div>
                              <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                                {match.winnerName || '-'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Player of the Match */}
                        {(prediction.predictedPomName || actualPom) && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4">
                            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Player of the Match</span>
                              {prediction.isCorrectPom ? (
                                <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full">
                                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                                  <span className="text-xs sm:text-sm font-bold text-green-700 dark:text-green-400">+1</span>
                                </div>
                              ) : (
                                <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                              <div className="min-w-0">
                                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Your Prediction</div>
                                <div className={`font-medium text-xs sm:text-sm truncate ${prediction.isCorrectPom ? 'text-green-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {prediction.predictedPomName || '-'}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Actual Result</div>
                                <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                                  {actualPom || '-'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* First Innings Predictions (only if not reduced overs) */}
                        {!match.isReducedOvers && (actualScore !== undefined || prediction.teamAScoreCategory || prediction.teamBScoreCategory) && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4">
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                              <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                First Innings Predictions
                              </span>
                              {(() => {
                                const scorePoints = prediction.isCorrectScoreCategory ? 1 : 0;
                                const wicketsPoints = prediction.isCorrectWickets ? 1 : 0;
                                const total = scorePoints + wicketsPoints;
                                
                                if (total === 0) {
                                  return <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />;
                                }
                                
                                return (
                                  <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full">
                                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                                    <span className="text-xs sm:text-sm font-bold text-green-700 dark:text-green-400">
                                      {scorePoints > 0 && wicketsPoints > 0 ? '1 + 1' : '1'}
                        </span>
                      </div>
                                );
                              })()}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              {/* Your Predictions */}
                              <div className="min-w-0">
                                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1 sm:mb-2">Your Prediction</div>
                                <div className="space-y-1.5 sm:space-y-2">
                                  {/* Team A Prediction */}
                                  {(prediction.teamAScoreCategory !== undefined || prediction.teamAWickets !== undefined) && (() => {
                                    // Check if this prediction matches the actual result (only if this team batted first)
                                    const isTeamAUsed = firstInningsBattingTeam === match.teamAId;
                                    const teamAMatchesScore = isTeamAUsed && prediction.teamAScoreCategory === actualScoreCategory;
                                    const teamAMatchesWickets = isTeamAUsed && prediction.teamAWickets !== undefined && prediction.teamAWickets === actualWickets;
                                    const teamAMatches = teamAMatchesScore || teamAMatchesWickets;
                                    
                                    return (
                                      <div className={`font-medium text-xs sm:text-sm p-2 rounded truncate ${teamAMatches ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700' : ''}`}>
                                        <span className="font-semibold">{match.teamAName}</span>
                                        {' / '}
                                        {prediction.teamAScoreCategory ? (
                                          <span className={teamAMatchesScore ? 'text-green-700 dark:text-green-400 font-semibold' : ''}>
                                            {prediction.teamAScoreCategory} <span className="text-[10px] sm:text-xs font-normal">({getScoreRange(prediction.teamAScoreCategory)})</span>
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
                                      <div className={`font-medium text-xs sm:text-sm p-2 rounded truncate ${teamBMatches ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700' : ''}`}>
                                        <span className="font-semibold">{match.teamBName}</span>
                                        {' / '}
                                        {prediction.teamBScoreCategory ? (
                                          <span className={teamBMatchesScore ? 'text-green-700 dark:text-green-400 font-semibold' : ''}>
                                            {prediction.teamBScoreCategory} <span className="text-[10px] sm:text-xs font-normal">({getScoreRange(prediction.teamBScoreCategory)})</span>
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
                              <div className="min-w-0">
                                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1 sm:mb-2">Match Result</div>
                                {actualScore !== undefined && (
                                  <div className="space-y-1.5 sm:space-y-2">
                                    <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 truncate">
                                      <span className="font-semibold">
                                        {firstInningsBattingTeam === match.teamAId ? match.teamAName : match.teamBName}
                                      </span>
                                      {' / '}
                                      {actualScoreCategory} <span className="text-[10px] sm:text-xs font-normal">({actualScore} runs)</span>
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
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 rounded-lg p-2.5 sm:p-3">
                            <div className="text-[10px] sm:text-xs text-yellow-800 dark:text-yellow-200">
                              ⚠️ Reduced Overs Match - Score/Wickets predictions not counted
                            </div>
                      </div>
                    )}
                    
                        {/* Season Team Adjustment */}
                        {prediction.seasonTeamAdjustment !== undefined && prediction.seasonTeamAdjustment !== 0 && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-400 dark:border-blue-600 rounded-lg p-2.5 sm:p-3">
                            <div className="text-xs sm:text-sm flex justify-between items-center">
                              <span className="text-gray-700 dark:text-gray-300">Season Team Adjustment:</span>
                              <div className={`flex items-center space-x-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full font-bold ${
                                prediction.seasonTeamAdjustment > 0 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              }`}>
                                {prediction.seasonTeamAdjustment > 0 ? (
                                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
                                )}
                                <span className="text-xs sm:text-sm">
                                  {prediction.seasonTeamAdjustment > 0 ? '+' : ''}{prediction.seasonTeamAdjustment}
                        </span>
                              </div>
                            </div>
                      </div>
                    )}
                    
                        {/* Penalty Fee */}
                        {prediction.penaltyFee !== undefined && prediction.penaltyFee > 0 && (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-lg p-2.5 sm:p-3">
                            <div className="text-xs sm:text-sm flex justify-between items-center">
                              <span className="text-gray-700 dark:text-gray-300">Penalty Fee:</span>
                              <div className="flex items-center space-x-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
                                <span className="text-xs sm:text-sm">${prediction.penaltyFee}</span>
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

