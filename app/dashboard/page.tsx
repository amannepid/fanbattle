'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { getActiveTournament, getUserEntry, getUserPredictions, getMatches } from '@/lib/firestore';
import { Loader2, Trophy, Target, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
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

              return (
                <div
                  key={prediction.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 ${
                    prediction.isCorrectWinner
                      ? 'border-green-500'
                      : 'border-red-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {prediction.isCorrectWinner ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Match {prediction.matchNumber} • {match.matchType}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-500">
                          {format(match.matchDate.toDate(), 'MMM dd')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary-600">
                        {prediction.pointsEarned !== undefined ? `+${prediction.pointsEarned}` : '-'}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">points</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {match.teamAName} vs {match.teamBName}
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      Winner: {match.winnerName}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      {prediction.isCorrectWinner ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 mr-1" />
                      )}
                      <span className="text-gray-600 dark:text-gray-400">Winner:</span>{' '}
                      <span className="font-medium ml-1">{prediction.predictedWinnerName}</span>
                    </div>
                    
                    {prediction.predictedPomName && (
                      <div className="flex items-center">
                        {prediction.isCorrectPom ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400 mr-1" />
                        )}
                        <span className="text-gray-600 dark:text-gray-400">POM:</span>{' '}
                        <span className={`font-medium ml-1 ${prediction.isCorrectPom ? 'text-green-600' : 'text-gray-500'}`}>
                          {prediction.predictedPomName}
                        </span>
                      </div>
                    )}
                    
                    {prediction.teamAScoreCategory && (
                      <div className="flex items-center">
                        {prediction.isCorrectTeamAScore ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400 mr-1" />
                        )}
                        <span className="text-gray-600 dark:text-gray-400">Score ({match.teamAName}):</span>{' '}
                        <span className={`font-medium ml-1 ${prediction.isCorrectTeamAScore ? 'text-green-600' : 'text-gray-500'}`}>
                          {prediction.teamAScoreCategory}
                        </span>
                      </div>
                    )}
                    
                    {prediction.teamAWickets !== undefined && (
                      <div className="flex items-center">
                        {prediction.isCorrectTeamAWickets ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400 mr-1" />
                        )}
                        <span className="text-gray-600 dark:text-gray-400">Wickets ({match.teamAName}):</span>{' '}
                        <span className={`font-medium ml-1 ${prediction.isCorrectTeamAWickets ? 'text-green-600' : 'text-gray-500'}`}>
                          {prediction.teamAWickets}
                        </span>
                      </div>
                    )}
                    
                    {prediction.teamBScoreCategory && (
                      <div className="flex items-center">
                        {prediction.isCorrectTeamBScore ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400 mr-1" />
                        )}
                        <span className="text-gray-600 dark:text-gray-400">Score ({match.teamBName}):</span>{' '}
                        <span className={`font-medium ml-1 ${prediction.isCorrectTeamBScore ? 'text-green-600' : 'text-gray-500'}`}>
                          {prediction.teamBScoreCategory}
                        </span>
                      </div>
                    )}
                    
                    {prediction.teamBWickets !== undefined && (
                      <div className="flex items-center">
                        {prediction.isCorrectTeamBWickets ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400 mr-1" />
                        )}
                        <span className="text-gray-600 dark:text-gray-400">Wickets ({match.teamBName}):</span>{' '}
                        <span className={`font-medium ml-1 ${prediction.isCorrectTeamBWickets ? 'text-green-600' : 'text-gray-500'}`}>
                          {prediction.teamBWickets}
                        </span>
                      </div>
                    )}
                  </div>

                  {prediction.seasonTeamAdjustment !== undefined && prediction.seasonTeamAdjustment !== 0 && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Season Team:</span>{' '}
                      <span className={prediction.seasonTeamAdjustment > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {prediction.seasonTeamAdjustment > 0 ? '+' : ''}{prediction.seasonTeamAdjustment}
                      </span>
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

