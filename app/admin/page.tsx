'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { getActiveTournament, getMatches, getAllPlayers, getMatchPredictions, updatePrediction, getLeaderboard, getUserEntry, updateUserEntry, getMatch, getUserPredictions, getTeams, updateTournament } from '@/lib/firestore';
import { cache, CACHE_KEYS } from '@/lib/cache';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Shield, Trophy, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { calculatePoints, calculatePenaltyFee } from '@/lib/scoring';
import { applyTournamentBonuses } from '@/lib/tournament-bonuses';
import type { Match, Tournament, Player, Prediction, UserEntry, Team } from '@/types';

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Tournament results state
  const [playerOfTournamentId, setPlayerOfTournamentId] = useState('');
  const [highestRunScorerId, setHighestRunScorerId] = useState('');
  const [highestWicketTakerId, setHighestWicketTakerId] = useState('');

  // Form state
  const [winnerId, setWinnerId] = useState('');
  const [momId, setMomId] = useState('');
  const [firstInningsBattingTeamId, setFirstInningsBattingTeamId] = useState('');
  const [firstInningsScore, setFirstInningsScore] = useState('');
  const [firstInningsWickets, setFirstInningsWickets] = useState('');
  const [isReducedOvers, setIsReducedOvers] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/');
      return;
    }

    if (user && isAdmin) {
      loadData();
    }
  }, [user, isAdmin, authLoading, router]);

  async function loadData() {
    try {
      const activeTournament = await getActiveTournament();
      if (!activeTournament) {
        setMessage('No active tournament found');
        setLoading(false);
        return;
      }

      setTournament(activeTournament);
      const matchesData = await getMatches(activeTournament.id);
      setMatches(matchesData);

      const playersData = await getAllPlayers(activeTournament.id);
      setPlayers(playersData);
      
      const teamsData = await getTeams(activeTournament.id);
      setTeams(teamsData);
      
      // Load tournament results if they exist
      if (activeTournament.playerOfTournamentId) {
        setPlayerOfTournamentId(activeTournament.playerOfTournamentId);
      }
      if (activeTournament.highestRunScorerId) {
        setHighestRunScorerId(activeTournament.highestRunScorerId);
      }
      if (activeTournament.highestWicketTakerId) {
        setHighestWicketTakerId(activeTournament.highestWicketTakerId);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data');
    } finally {
      setLoading(false);
    }
  }

  function selectMatch(match: Match) {
    setSelectedMatch(match);
    setWinnerId(match.winnerId || '');
    setMomId(match.momId || '');
    setFirstInningsBattingTeamId(match.firstInningsBattingTeamId || '');
    setFirstInningsScore(match.firstInningsScore?.toString() || '');
    setFirstInningsWickets(match.firstInningsWickets?.toString() || '');
    setIsReducedOvers(match.isReducedOvers || false);
    setMessage('');
    
    // Scroll to top to show the edit form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmitResult(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMatch || !winnerId) return;

    setProcessing(true);
    setMessage('');

    try {
      const winnerName = winnerId === selectedMatch.teamAId ? selectedMatch.teamAName : selectedMatch.teamBName;
      const momPlayer = players.find((p) => p.id === momId);

      // Update match with result
      const matchRef = doc(db, 'matches', selectedMatch.id);
      await updateDoc(matchRef, {
        winnerId,
        winnerName,
        momId: momId || null,
        momName: momPlayer?.name || null,
        firstInningsBattingTeamId: firstInningsBattingTeamId || null,
        firstInningsScore: firstInningsScore ? Number(firstInningsScore) : null,
        firstInningsWickets: firstInningsWickets ? Number(firstInningsWickets) : null,
        isReducedOvers,
        status: 'completed',
      });

      // Invalidate matches cache since match was updated
      if (tournament) {
        cache.delete(CACHE_KEYS.matches(tournament.id));
        cache.delete(CACHE_KEYS.match(selectedMatch.id));
      }

      // Check if this is an edit (match was already completed)
      const isEdit = selectedMatch.status === 'completed';

      // Calculate scores for all predictions
      await calculateScoresForMatch(selectedMatch.id, isEdit);

      setMessage(`✅ ${isEdit ? 'Results updated' : 'Results saved'} and scores ${isEdit ? 'recalculated' : 'calculated'} for Match ${selectedMatch.matchNumber}`);
      
      // Reload data
      await loadData();
      setSelectedMatch(null);
    } catch (error) {
      console.error('Error submitting result:', error);
      setMessage('❌ Error submitting result. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  async function calculateScoresForMatch(matchId: string, isEdit: boolean = false) {
    // Get the updated match
    const match = await getMatch(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Get all predictions for this match
    const predictions = await getMatchPredictions(matchId);

    // Cache user entries to avoid redundant reads
    const userEntryCache = new Map<string, UserEntry>();

    // Helper function to get user entry with caching
    const getCachedUserEntry = async (userId: string): Promise<UserEntry | null> => {
      if (userEntryCache.has(userId)) {
        return userEntryCache.get(userId)!;
      }
      const entry = await getUserEntry(userId);
      if (entry) {
        userEntryCache.set(userId, entry);
      }
      return entry;
    };

    // If editing, first subtract old points from all users
    if (isEdit) {
      for (const prediction of predictions) {
        const userEntry = await getCachedUserEntry(prediction.userId);
        if (!userEntry) continue;

        // Subtract old points
        const oldPoints = prediction.pointsEarned || 0;
        // Calculate old penalty (need to recalculate from old match data)
        // For now, we'll recalculate all penalties fresh below
        const updatedTotalPoints = Math.max(0, (userEntry.totalPoints || 0) - oldPoints);
        await updateUserEntry(prediction.userId, {
          totalPoints: updatedTotalPoints,
        });
        // Update cache with new value
        userEntryCache.set(prediction.userId, { ...userEntry, totalPoints: updatedTotalPoints });
      }
    }

    // Calculate score for each prediction
    for (const prediction of predictions) {
      const userEntry = await getCachedUserEntry(prediction.userId);
      if (!userEntry) continue;

      // Scoring now checks BOTH predictions against actual result
      // No need to determine which one to use - scoring logic handles it
      const scoringResult = calculatePoints(prediction, match, userEntry.seasonTeamId);
      const penaltyFee = calculatePenaltyFee(prediction, match);

      // Get current user entry from cache (already updated if in edit mode)
      const currentUserEntry = userEntryCache.get(prediction.userId);
      if (!currentUserEntry) continue;

      // Update prediction with scoring results
      // Only include penaltyFee if it's a valid number (not undefined)
      const updateData: any = {
        pointsEarned: scoringResult.points,
        isCorrectWinner: scoringResult.isCorrectWinner,
        isCorrectPom: scoringResult.isCorrectPom,
        isCorrectScoreCategory: scoringResult.isCorrectScoreCategory,
        isCorrectWickets: scoringResult.isCorrectWickets,
        seasonTeamAdjustment: scoringResult.breakdown.seasonTeamAdjustment,
        scoredAt: Timestamp.now(),
      };
      
      // Only add penaltyFee if it's defined and a number
      if (penaltyFee !== undefined && penaltyFee !== null) {
        updateData.penaltyFee = penaltyFee;
      }
      
      await updatePrediction(prediction.id, updateData);

      // Update user entry with new total points
      const currentTotalPoints = currentUserEntry.totalPoints || 0;
      
      const newTotalPoints = isEdit 
        ? currentTotalPoints + scoringResult.points  // Already subtracted old points above
        : currentTotalPoints + scoringResult.points; // Adding for first time

      await updateUserEntry(prediction.userId, {
        totalPoints: newTotalPoints,
      });
      
      // Update cache with new value
      userEntryCache.set(prediction.userId, { ...currentUserEntry, totalPoints: newTotalPoints });
    }

    // Get leaderboard once and reuse it (was being fetched twice before)
    const allUsers = await getLeaderboard(match.tournamentId);
    const allMatches = await getMatches(match.tournamentId);
    const matchMap = new Map(allMatches.map((m) => [m.id, m]));
    
    // Recalculate penalties for all users (since penalties depend on match results)
    for (const user of allUsers) {
      const allUserPredictions = await getUserPredictions(user.userId);
      let totalPenalties = 0;
      
      for (const pred of allUserPredictions) {
        const predMatch = matchMap.get(pred.matchId);
        if (predMatch && predMatch.status === 'completed') {
          totalPenalties += calculatePenaltyFee(pred, predMatch);
        }
      }
      
      await updateUserEntry(user.userId, {
        totalPenalties: totalPenalties,
      });
    }

    // Recalculate leaderboard ranks (reuse allUsers instead of fetching again)
    for (let i = 0; i < allUsers.length; i++) {
      await updateUserEntry(allUsers[i].userId, {
        currentRank: i + 1,
      });
    }

    // Invalidate leaderboard cache since ranks and points changed
    cache.delete(CACHE_KEYS.leaderboard(match.tournamentId));
  }

  async function handleTournamentResults(e: React.FormEvent) {
    e.preventDefault();
    
    // Check if Final match is completed
    const finalMatch = matches.find(m => m.matchType === 'final');
    if (!finalMatch || finalMatch.status !== 'completed') {
      setMessage('❌ Final match must be completed before setting tournament results');
      return;
    }

    // Get tournament winner from final match
    const tournamentWinnerId = finalMatch.winnerId;
    if (!tournamentWinnerId) {
      setMessage('❌ Final match winner must be set before setting tournament results');
      return;
    }

    if (!tournament || !playerOfTournamentId || !highestRunScorerId || !highestWicketTakerId) {
      setMessage('❌ Please fill in all tournament results');
      return;
    }

    setProcessing(true);
    setMessage('');

    try {
      // Get names for the IDs
      const winnerTeam = teams.find(t => t.id === tournamentWinnerId);
      const potPlayer = players.find(p => p.id === playerOfTournamentId);
      const runScorerPlayer = players.find(p => p.id === highestRunScorerId);
      const wicketTakerPlayer = players.find(p => p.id === highestWicketTakerId);

      // Update tournament with results
      await updateTournament(tournament.id, {
        winnerTeamId: tournamentWinnerId,
        winnerTeamName: winnerTeam?.name || '',
        playerOfTournamentId: playerOfTournamentId,
        playerOfTournamentName: potPlayer?.name || '',
        highestRunScorerId: highestRunScorerId,
        highestRunScorerName: runScorerPlayer?.name || '',
        highestWicketTakerId: highestWicketTakerId,
        highestWicketTakerName: wicketTakerPlayer?.name || '',
        status: 'completed',
      });

      // Invalidate tournament cache
      cache.delete(CACHE_KEYS.activeTournament);
      cache.delete(CACHE_KEYS.tournament(tournament.id));

      // Apply tournament bonuses to all users
      const updatedTournament = {
        ...tournament,
        winnerTeamId: tournamentWinnerId,
        winnerTeamName: winnerTeam?.name || '',
        playerOfTournamentId: playerOfTournamentId,
        playerOfTournamentName: potPlayer?.name || '',
        highestRunScorerId: highestRunScorerId,
        highestRunScorerName: runScorerPlayer?.name || '',
        highestWicketTakerId: highestWicketTakerId,
        highestWicketTakerName: wicketTakerPlayer?.name || '',
        status: 'completed' as const,
      };

      await applyTournamentBonuses(updatedTournament);

      setMessage('✅ Tournament results saved and bonuses applied to all users!');
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error saving tournament results:', error);
      setMessage('❌ Error saving tournament results. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400">You do not have admin permissions.</p>
      </div>
    );
  }

  const upcomingMatches = matches.filter((m) => m.status === 'upcoming');
  const completedMatches = matches.filter((m) => m.status === 'completed');

  // Helper function to check if a match can be edited
  // A match cannot be edited if there are completed matches after it
  function canEditMatch(match: Match): boolean {
    // Check if there are any completed matches with a higher match number
    const hasCompletedMatchesAfter = completedMatches.some(
      (m) => m.matchNumber > match.matchNumber
    );
    return !hasCompletedMatchesAfter;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center space-x-2 sm:space-x-3 mb-6 sm:mb-8">
        <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
      </div>

      {message && (
        <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg ${message.startsWith('✅') ? 'bg-green-50 dark:bg-green-900/20 border border-green-400' : 'bg-red-50 dark:bg-red-900/20 border border-red-400'}`}>
          <p className={`text-sm sm:text-base ${message.startsWith('✅') ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
            {message}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Match List */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Upcoming Matches</h2>
          <div className="space-y-2 sm:space-y-3">
            {upcomingMatches.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">No upcoming matches</p>
            ) : (
              upcomingMatches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => selectMatch(match)}
                  className={`w-full text-left p-3 sm:p-4 border-2 rounded-lg transition min-h-[44px] ${
                    selectedMatch?.id === match.id
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                      Match {match.matchNumber} • {match.matchType}
                    </span>
                    <span className="text-[10px] sm:text-xs text-gray-500">
                      {format(match.matchDate.toDate(), 'MMM dd')}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                    {match.teamAName} vs {match.teamBName}
                  </h3>
                </button>
              ))
            )}
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-6 sm:mt-8 mb-3 sm:mb-4">
            Completed ({completedMatches.length})
          </h2>
          <div className="space-y-2 sm:space-y-3 max-h-64 overflow-y-auto">
            {completedMatches.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">No completed matches</p>
            ) : (
              completedMatches.map((match) => {
                const canEdit = canEditMatch(match);
                return (
                  <button
                    key={match.id}
                    onClick={() => {
                      if (canEdit) {
                        selectMatch(match);
                      }
                    }}
                    disabled={!canEdit}
                    className={`w-full text-left p-3 sm:p-4 border-2 rounded-lg transition min-h-[44px] ${
                      !canEdit
                        ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 opacity-60 cursor-not-allowed'
                        : selectedMatch?.id === match.id
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20 hover:border-primary-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                        Match {match.matchNumber} • {match.matchType}
                      </span>
                      <div className="flex items-center space-x-1.5 sm:space-x-2">
                        {!canEdit && (
                          <span className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-medium">
                            🔒 Locked
                          </span>
                        )}
                        <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 font-medium">
                          ✓ Completed
                        </span>
                      </div>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-1 truncate">
                      {match.teamAName} vs {match.teamBName}
                    </h3>
                    <div className="text-xs sm:text-sm text-green-800 dark:text-green-200 truncate">
                      Winner: {match.winnerName}
                    </div>
                    {!canEdit && (
                      <div className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 mt-1.5 sm:mt-2">
                        Cannot edit: There are completed matches after this one
                      </div>
                    )}
                    {selectedMatch?.id === match.id && canEdit && (
                      <div className="text-[10px] sm:text-xs text-primary-600 dark:text-primary-400 mt-1.5 sm:mt-2 font-medium">
                        Click to edit result
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Result Entry Form */}
        <div>
          {selectedMatch ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Header */}
              <div className={`px-4 sm:px-6 py-3 sm:py-4 ${selectedMatch.status === 'completed' ? 'bg-gradient-to-r from-orange-600 to-orange-700' : 'bg-gradient-to-r from-primary-600 to-primary-700'}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white">
                        {selectedMatch.status === 'completed' ? 'Edit' : 'Enter'} Match {selectedMatch.matchNumber} Result
                      </h2>
                      <p className="text-xs sm:text-sm text-primary-100">
                        {format(selectedMatch.matchDate.toDate(), 'MMMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  {selectedMatch.status === 'completed' && (
                    <div className="bg-white/20 backdrop-blur-sm px-2.5 sm:px-3 py-1 rounded-full">
                      <span className="text-[10px] sm:text-xs font-medium text-white">Editing Completed Match</span>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmitResult} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Match Teams Display */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-center min-w-0">
                      <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                        {selectedMatch.teamAName}
                      </div>
                    </div>
                    <div className="px-2 sm:px-4 text-gray-400 font-bold text-lg sm:text-xl">vs</div>
                    <div className="flex-1 text-center min-w-0">
                      <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                        {selectedMatch.teamBName}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Match Outcome */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center space-x-1.5 sm:space-x-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 dark:text-primary-400" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Match Outcome</h3>
                  </div>

                  {/* Winner Selection */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                      Winner <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setWinnerId(selectedMatch.teamAId)}
                        className={`p-3 sm:p-4 border-2 rounded-lg transition-all duration-200 min-h-[60px] sm:min-h-[72px] flex flex-col items-center justify-center ${
                          winnerId === selectedMatch.teamAId
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30 shadow-md'
                            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate text-center w-full">
                          {selectedMatch.teamAName}
                        </div>
                        {winnerId === selectedMatch.teamAId && (
                          <div className="text-[10px] sm:text-xs text-primary-600 dark:text-primary-400 mt-1">✓ Selected</div>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setWinnerId(selectedMatch.teamBId)}
                        className={`p-3 sm:p-4 border-2 rounded-lg transition-all duration-200 min-h-[60px] sm:min-h-[72px] flex flex-col items-center justify-center ${
                          winnerId === selectedMatch.teamBId
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30 shadow-md'
                            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate text-center w-full">
                          {selectedMatch.teamBName}
                        </div>
                        {winnerId === selectedMatch.teamBId && (
                          <div className="text-[10px] sm:text-xs text-primary-600 dark:text-primary-400 mt-1">✓ Selected</div>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Player of the Match */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                      Player of the Match
                    </label>
                    <select
                      value={momId}
                      onChange={(e) => setMomId(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-600 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition text-sm sm:text-base min-h-[44px]"
                    >
                      <option value="">Select player...</option>
                      {players
                        .filter((player) => 
                          player.teamId === selectedMatch.teamAId || 
                          player.teamId === selectedMatch.teamBId
                        )
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name} ({player.teamId === selectedMatch.teamAId ? selectedMatch.teamAName : selectedMatch.teamBName})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Section 2: First Innings Details */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center space-x-1.5 sm:space-x-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 dark:text-primary-400" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">First Innings</h3>
                  </div>

                  {/* First Innings Batting Team */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                      Team That Batted First
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setFirstInningsBattingTeamId(selectedMatch.teamAId)}
                        className={`p-3 sm:p-4 border-2 rounded-lg transition-all duration-200 min-h-[60px] sm:min-h-[72px] flex flex-col items-center justify-center ${
                          firstInningsBattingTeamId === selectedMatch.teamAId
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30 shadow-md'
                            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate text-center w-full">
                          {selectedMatch.teamAName}
                        </div>
                        {firstInningsBattingTeamId === selectedMatch.teamAId && (
                          <div className="text-[10px] sm:text-xs text-primary-600 dark:text-primary-400 mt-1">✓ Selected</div>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFirstInningsBattingTeamId(selectedMatch.teamBId)}
                        className={`p-3 sm:p-4 border-2 rounded-lg transition-all duration-200 min-h-[60px] sm:min-h-[72px] flex flex-col items-center justify-center ${
                          firstInningsBattingTeamId === selectedMatch.teamBId
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30 shadow-md'
                            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate text-center w-full">
                          {selectedMatch.teamBName}
                        </div>
                        {firstInningsBattingTeamId === selectedMatch.teamBId && (
                          <div className="text-[10px] sm:text-xs text-primary-600 dark:text-primary-400 mt-1">✓ Selected</div>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* First Innings Score & Wickets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                        First Innings Score
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={firstInningsScore}
                        onChange={(e) => setFirstInningsScore(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-600 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base min-h-[44px]"
                        placeholder="e.g., 145"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                        First Innings Wickets
                      </label>
                      <select
                        value={firstInningsWickets}
                        onChange={(e) => setFirstInningsWickets(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-600 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base min-h-[44px]"
                      >
                        <option value="">Select wickets</option>
                        {Array.from({ length: 11 }, (_, i) => (
                          <option key={i} value={i}>
                            {i} wickets
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Reduced Overs */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 sm:p-4">
                    <label className="flex items-start space-x-2 sm:space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isReducedOvers}
                        onChange={(e) => setIsReducedOvers(e.target.checked)}
                        className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 min-h-[44px] min-w-[44px]"
                      />
                      <div>
                        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                          Reduced Overs Match
                        </span>
                        <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Check this if the match was shortened. Score/Wickets predictions won't count for bonus points.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!winnerId || processing}
                  className="w-full px-5 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 min-h-[44px]"
                >
                  {processing ? (
                    <span className="flex items-center justify-center text-sm sm:text-base">
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                      Processing & Calculating Scores...
                    </span>
                  ) : (
                    'Submit Result & Calculate Scores'
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 sm:p-12 text-center">
              <Trophy className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-400 mb-3 sm:mb-4" />
              <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-400">
                Select a match from the list to enter results
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tournament Results Section */}
      <div className="mt-6 sm:mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-purple-700">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            <h2 className="text-lg sm:text-xl font-bold text-white">Tournament End Results</h2>
          </div>
          <p className="text-xs sm:text-sm text-purple-100 mt-1">Set tournament results after Final match is completed</p>
        </div>
        
        {/* Check if Final is completed */}
        {(() => {
          const finalMatch = matches.find(m => m.matchType === 'final');
          const isFinalCompleted = finalMatch && finalMatch.status === 'completed';
          
          if (!isFinalCompleted) {
            return (
              <div className="p-4 sm:p-6">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Note:</strong> Tournament results can only be set after the Final match is completed.
                      {finalMatch && (
                        <span className="block mt-1">
                          Final match status: <span className="font-semibold">{finalMatch.status}</span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          
          return (
            <form onSubmit={handleTournamentResults} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Tournament Winner (Read-only, from Final match) */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
              Tournament Winner *
            </label>
            <div className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
              <span className="text-sm sm:text-base font-medium">
                {finalMatch.winnerName || 'Not set'}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 italic">
                (From Final match - not editable)
              </span>
            </div>
            {!finalMatch.winnerId && (
              <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 mt-1">
                Please complete the Final match first
              </p>
            )}
          </div>

          {/* Player of Tournament */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
              Player of Tournament *
            </label>
            <select
              value={playerOfTournamentId}
              onChange={(e) => setPlayerOfTournamentId(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-600 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base min-h-[44px]"
              required
            >
              <option value="">Select player</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} ({teams.find(t => t.id === player.teamId)?.name || 'Unknown'})
                </option>
              ))}
            </select>
          </div>

          {/* Highest Run Scorer */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
              Highest Run Scorer *
            </label>
            <select
              value={highestRunScorerId}
              onChange={(e) => setHighestRunScorerId(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-600 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base min-h-[44px]"
              required
            >
              <option value="">Select player</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} ({teams.find(t => t.id === player.teamId)?.name || 'Unknown'})
                </option>
              ))}
            </select>
          </div>

          {/* Highest Wicket Taker */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
              Highest Wicket Taker *
            </label>
            <select
              value={highestWicketTakerId}
              onChange={(e) => setHighestWicketTakerId(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-600 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base min-h-[44px]"
              required
            >
              <option value="">Select player</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} ({teams.find(t => t.id === player.teamId)?.name || 'Unknown'})
                </option>
              ))}
            </select>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-400 dark:border-blue-600 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Setting tournament results will automatically calculate and apply bonuses:
              <ul className="list-disc list-inside mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1">
                <li>Season team wins title: +5 points</li>
                <li>Player of Tournament: +5 points if correct</li>
                <li>Highest Run Scorer: +5 points if correct</li>
                <li>Highest Wicket Taker: +5 points if correct</li>
              </ul>
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!finalMatch.winnerId || !playerOfTournamentId || !highestRunScorerId || !highestWicketTakerId || processing}
            className="w-full px-5 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 min-h-[44px]"
          >
            {processing ? (
              <span className="flex items-center justify-center text-sm sm:text-base">
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                Processing...
              </span>
            ) : (
              'Save Tournament Results & Apply Bonuses'
            )}
          </button>
        </form>
          );
        })()}
      </div>
    </div>
  );
}

