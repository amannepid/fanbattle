'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { getActiveTournament, getMatches, getAllPlayers, getMatchPredictions, updatePrediction, getLeaderboard, getUserEntry, updateUserEntry, getMatch } from '@/lib/firestore';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Shield, Trophy, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { calculatePoints, calculatePenaltyFee } from '@/lib/scoring';
import type { Match, Tournament, Player, Prediction, UserEntry } from '@/types';

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [winnerId, setWinnerId] = useState('');
  const [momId, setMomId] = useState('');
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
    setFirstInningsScore(match.firstInningsScore?.toString() || '');
    setFirstInningsWickets(match.firstInningsWickets?.toString() || '');
    setIsReducedOvers(match.isReducedOvers || false);
    setMessage('');
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
        firstInningsScore: firstInningsScore ? Number(firstInningsScore) : null,
        firstInningsWickets: firstInningsWickets ? Number(firstInningsWickets) : null,
        isReducedOvers,
        status: 'completed',
      });

      // Calculate scores for all predictions
      await calculateScoresForMatch(selectedMatch.id);

      setMessage(`✅ Results saved and scores calculated for Match ${selectedMatch.matchNumber}`);
      
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

  async function calculateScoresForMatch(matchId: string) {
    // Get the updated match
    const match = await getMatch(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Get all predictions for this match
    const predictions = await getMatchPredictions(matchId);

    // Calculate score for each prediction
    for (const prediction of predictions) {
      const userEntry = await getUserEntry(prediction.userId);
      if (!userEntry) continue;

      const scoringResult = calculatePoints(prediction, match, userEntry.seasonTeamId);
      const penaltyFee = calculatePenaltyFee(prediction, match);

      // Update prediction with scoring results
      await updatePrediction(prediction.id, {
        pointsEarned: scoringResult.points,
        isCorrectWinner: scoringResult.isCorrectWinner,
        isCorrectMom: scoringResult.isCorrectMom,
        isCorrectScoreCategory: scoringResult.isCorrectScoreCategory,
        isCorrectWickets: scoringResult.isCorrectWickets,
        seasonTeamAdjustment: scoringResult.breakdown.seasonTeamAdjustment,
        scoredAt: Timestamp.now(),
      });

      // Update user entry with new total points
      const newTotalPoints = (userEntry.totalPoints || 0) + scoringResult.points;
      const newTotalPenalties = (userEntry.totalPenalties || 0) + penaltyFee;

      await updateUserEntry(prediction.userId, {
        totalPoints: newTotalPoints,
        totalPenalties: newTotalPenalties,
      });
    }

    // Recalculate leaderboard ranks
    const leaderboard = await getLeaderboard(match.tournamentId);
    for (let i = 0; i < leaderboard.length; i++) {
      await updateUserEntry(leaderboard[i].userId, {
        currentRank: i + 1,
      });
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center space-x-3 mb-8">
        <Shield className="h-8 w-8 text-orange-600" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.startsWith('✅') ? 'bg-green-50 dark:bg-green-900/20 border border-green-400' : 'bg-red-50 dark:bg-red-900/20 border border-red-400'}`}>
          <p className={message.startsWith('✅') ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
            {message}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Match List */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Upcoming Matches</h2>
          <div className="space-y-3">
            {upcomingMatches.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-sm">No upcoming matches</p>
            ) : (
              upcomingMatches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => selectMatch(match)}
                  className={`w-full text-left p-4 border-2 rounded-lg transition ${
                    selectedMatch?.id === match.id
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Match {match.matchNumber} • {match.matchType}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(match.matchDate.toDate(), 'MMM dd')}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {match.teamAName} vs {match.teamBName}
                  </h3>
                </button>
              ))
            )}
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            Completed ({completedMatches.length})
          </h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {completedMatches.map((match) => (
              <div key={match.id} className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-400 dark:border-green-600 rounded-lg">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Match {match.matchNumber} • {match.matchType}
                </div>
                <div className="font-bold text-gray-900 dark:text-white mb-1">
                  {match.teamAName} vs {match.teamBName}
                </div>
                <div className="text-sm text-green-800 dark:text-green-200">
                  Winner: {match.winnerName}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Result Entry Form */}
        <div>
          {selectedMatch ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Trophy className="h-6 w-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Enter Result - Match {selectedMatch.matchNumber}
                </h2>
              </div>

              <div className="text-center mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedMatch.teamAName} vs {selectedMatch.teamBName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {format(selectedMatch.matchDate.toDate(), 'MMMM dd, yyyy')}
                </p>
              </div>

              <form onSubmit={handleSubmitResult}>
                {/* Winner */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Winner *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWinnerId(selectedMatch.teamAId)}
                      className={`p-3 border-2 rounded-lg transition ${
                        winnerId === selectedMatch.teamAId
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {selectedMatch.teamAName}
                    </button>
                    <button
                      type="button"
                      onClick={() => setWinnerId(selectedMatch.teamBId)}
                      className={`p-3 border-2 rounded-lg transition ${
                        winnerId === selectedMatch.teamBId
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {selectedMatch.teamBName}
                    </button>
                  </div>
                </div>

                {/* Man of the Match */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Man of the Match
                  </label>
                  <select
                    value={momId}
                    onChange={(e) => setMomId(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-600 focus:outline-none bg-white dark:bg-gray-700"
                  >
                    <option value="">Select player</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* First Innings Score */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Innings Score
                  </label>
                  <input
                    type="number"
                    value={firstInningsScore}
                    onChange={(e) => setFirstInningsScore(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-600 focus:outline-none bg-white dark:bg-gray-700"
                    placeholder="Enter score"
                  />
                </div>

                {/* First Innings Wickets */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Innings Wickets
                  </label>
                  <select
                    value={firstInningsWickets}
                    onChange={(e) => setFirstInningsWickets(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-600 focus:outline-none bg-white dark:bg-gray-700"
                  >
                    <option value="">Select wickets</option>
                    {Array.from({ length: 11 }, (_, i) => (
                      <option key={i} value={i}>
                        {i} wickets
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reduced Overs */}
                <div className="mb-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isReducedOvers}
                      onChange={(e) => setIsReducedOvers(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Reduced Overs Match (Score/Wickets won't count)
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!winnerId || processing}
                  className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {processing ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Processing...
                    </span>
                  ) : (
                    'Submit Result & Calculate Scores'
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-12 text-center">
              <Trophy className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Select a match from the list to enter results
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

