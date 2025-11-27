'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { getActiveTournament, getMatches, getAllPlayers, getTeams, getUserPredictions, createPrediction, updatePrediction, getPrediction } from '@/lib/firestore';
import { getActivationTime } from '@/lib/prediction-rules';
import { Loader2, Calendar, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { Match, Player, Team, Prediction, ScoreCategory } from '@/types';
import PlayerSearchSelect from '@/components/PlayerSearchSelect';
import Link from 'next/link';

const SCORE_CATEGORIES: { value: ScoreCategory; label: string }[] = [
  { value: 'A', label: 'Under 130 (0-129)' },
  { value: 'B', label: '131-145' },
  { value: 'C', label: '146-160' },
  { value: 'D', label: '161-175' },
  { value: 'E', label: '176-190' },
  { value: 'F', label: '191+' },
];

function SchedulePredictionPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userPredictions, setUserPredictions] = useState<Prediction[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [existingPrediction, setExistingPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  // Form state
  const [predictedWinnerId, setPredictedWinnerId] = useState('');
  const [predictedPom, setPredictedPom] = useState<{ id: string; name: string } | null>(null);
  const [teamAScoreCategory, setTeamAScoreCategory] = useState<ScoreCategory | ''>('');
  const [teamAWickets, setTeamAWickets] = useState<number | ''>('');
  const [teamBScoreCategory, setTeamBScoreCategory] = useState<ScoreCategory | ''>('');
  const [teamBWickets, setTeamBWickets] = useState<number | ''>('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, authLoading, router, searchParams]);

  async function loadData() {
    try {
      if (!user) return;

      const activeTournament = await getActiveTournament();
      if (!activeTournament) {
        setLoading(false);
        return;
      }

      setTournament(activeTournament);

      const [matchesData, playersData, teamsData, predictionsData] = await Promise.all([
        getMatches(activeTournament.id),
        getAllPlayers(activeTournament.id),
        getTeams(activeTournament.id),
        getUserPredictions(user.uid)
      ]);

      setMatches(matchesData);
      setPlayers(playersData);
      setTeams(teamsData);
      setUserPredictions(predictionsData);
      
      // Auto-select match from URL query parameter
      const matchIdFromUrl = searchParams.get('matchId');
      if (matchIdFromUrl) {
        const matchToSelect = matchesData.find(m => m.id === matchIdFromUrl);
        if (matchToSelect) {
          selectMatch(matchToSelect);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  }

  function selectMatch(match: Match) {
    setSelectedMatch(match);
    setError('');
    setMessage('');
    
    // Check if user already has a scheduled prediction for this match
    const existing = userPredictions.find(p => 
      p.matchId === match.id && p.scheduledFor && p.scheduledFor.toDate() > new Date()
    );
    
    if (existing) {
      setExistingPrediction(existing);
      setPredictedWinnerId(existing.predictedWinnerId);
      setPredictedPom(existing.predictedPomId && existing.predictedPomName 
        ? { id: existing.predictedPomId, name: existing.predictedPomName }
        : null);
      setTeamAScoreCategory(existing.teamAScoreCategory || '');
      setTeamAWickets(existing.teamAWickets !== undefined ? existing.teamAWickets : '');
      setTeamBScoreCategory(existing.teamBScoreCategory || '');
      setTeamBWickets(existing.teamBWickets !== undefined ? existing.teamBWickets : '');
    } else {
      setExistingPrediction(null);
      setPredictedWinnerId('');
      setPredictedPom(null);
      setTeamAScoreCategory('');
      setTeamAWickets('');
      setTeamBScoreCategory('');
      setTeamBWickets('');
    }
    
    // Scroll to form on mobile (form appears below match list on mobile)
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Fallback to top if form ref not available
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMatch || !predictedWinnerId || !user) return;

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const winnerTeam = predictedWinnerId === selectedMatch.teamAId ? selectedMatch.teamAName : selectedMatch.teamBName;

      // Calculate activation time (always schedule)
      const activationTime = getActivationTime(selectedMatch, matches);
      const now = new Date();
      
      // Validate that activation time is in the future
      if (activationTime <= now) {
        setError('Cannot schedule prediction - activation time has already passed.');
        setSubmitting(false);
        return;
      }

      const scheduledFor = Timestamp.fromDate(activationTime);
      const scheduledAt = Timestamp.now();

      const predictionData: any = {
        userId: user.uid,
        matchId: selectedMatch.id,
        matchNumber: selectedMatch.matchNumber,
        predictedWinnerId,
        predictedWinnerName: winnerTeam,
        submittedAt: Timestamp.now(),
        scheduledFor,
        scheduledAt,
      };

      // Only include optional fields if they have values (Firestore doesn't accept undefined)
      if (predictedPom?.id) {
        predictionData.predictedPomId = predictedPom.id;
      }
      if (predictedPom?.name) {
        predictionData.predictedPomName = predictedPom.name;
      }
      
      if (teamAScoreCategory) {
        predictionData.teamAScoreCategory = teamAScoreCategory;
      }
      if (teamAWickets !== '') {
        predictionData.teamAWickets = Number(teamAWickets);
      }
      
      if (teamBScoreCategory) {
        predictionData.teamBScoreCategory = teamBScoreCategory;
      }
      if (teamBWickets !== '') {
        predictionData.teamBWickets = Number(teamBWickets);
      }

      // Check if updating existing prediction
      if (existingPrediction) {
        await updatePrediction(existingPrediction.id, predictionData);
        setMessage('✅ Scheduled prediction updated successfully!');
      } else {
        await createPrediction(predictionData);
        setMessage('✅ Prediction scheduled successfully!');
      }

      // Reload predictions
      const updatedPredictions = await getUserPredictions(user.uid);
      setUserPredictions(updatedPredictions);

      // Clear form after a short delay
      setTimeout(() => {
        setSelectedMatch(null);
        setExistingPrediction(null);
        setPredictedWinnerId('');
        setPredictedPom(null);
        setTeamAScoreCategory('');
        setTeamAWickets('');
        setTeamBScoreCategory('');
        setTeamBWickets('');
        setMessage('');
      }, 2000);
    } catch (error) {
      console.error('Error scheduling prediction:', error);
      setError('Failed to schedule prediction. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Get upcoming matches that user hasn't predicted (including scheduled predictions)
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');
  
  // Get all match IDs that user has predicted (both active and scheduled)
  const allPredictedMatchIds = new Set(userPredictions.map(p => p.matchId));
  
  // Filter out matches that user has already predicted (active or scheduled)
  const unpredictedMatches = upcomingMatches.filter(m => !allPredictedMatchIds.has(m.id));
  
  // Sort by match date
  unpredictedMatches.sort((a, b) => 
    a.matchDate.toDate().getTime() - b.matchDate.toDate().getTime()
  );

  // Get matches with scheduled predictions
  const scheduledMatchIds = new Set(userPredictions
    .filter(p => p.scheduledFor && p.scheduledFor.toDate() > new Date())
    .map(p => p.matchId));
  
  const scheduledMatches = upcomingMatches.filter(m => scheduledMatchIds.has(m.id));
  scheduledMatches.sort((a, b) => 
    a.matchDate.toDate().getTime() - b.matchDate.toDate().getTime()
  );

  // Get match players for selected match
  const matchPlayers = selectedMatch 
    ? players.filter(p => p.teamId === selectedMatch.teamAId || p.teamId === selectedMatch.teamBId)
    : [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center space-x-2 sm:space-x-3 mb-6 sm:mb-8">
        <Link
          href="/dashboard"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
        >
          <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-400" />
        </Link>
        <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Schedule Prediction</h1>
      </div>

      {message && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-400">
          <p className="text-sm sm:text-base text-green-800 dark:text-green-200">{message}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-400">
          <p className="text-sm sm:text-base text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Match List - Show first on desktop, second on mobile when form is selected */}
        <div className={`${selectedMatch ? 'order-2 lg:order-1' : 'order-1'}`}>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Unpredicted Matches ({unpredictedMatches.length})
          </h2>
          <div className="space-y-2 sm:space-y-3 max-h-[600px] overflow-y-auto">
            {unpredictedMatches.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">No unpredicted matches</p>
            ) : (
              unpredictedMatches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => selectMatch(match)}
                  className={`w-full text-left p-3 sm:p-4 border-2 rounded-lg transition min-h-[44px] ${
                    selectedMatch?.id === match.id
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
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

          {scheduledMatches.length > 0 && (
            <>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-6 sm:mt-8 mb-3 sm:mb-4">
                Scheduled ({scheduledMatches.length})
              </h2>
              <div className="space-y-2 sm:space-y-3 max-h-[400px] overflow-y-auto">
                {scheduledMatches.map((match) => {
                  const scheduledPred = userPredictions.find(p => 
                    p.matchId === match.id && p.scheduledFor && p.scheduledFor.toDate() > new Date()
                  );
                  const scheduledTime = scheduledPred?.scheduledFor?.toDate();
                  
                  return (
                    <button
                      key={match.id}
                      onClick={() => selectMatch(match)}
                      className={`w-full text-left p-3 sm:p-4 border-2 rounded-lg transition min-h-[44px] ${
                        selectedMatch?.id === match.id
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 hover:border-purple-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                          Match {match.matchNumber} • {match.matchType}
                        </span>
                        <span className="text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                          📅 Scheduled
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                        {match.teamAName} vs {match.teamBName}
                      </h3>
                      {scheduledTime && (
                        <div className="text-[10px] sm:text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                          Activates: {format(scheduledTime, 'MMM dd, h:mm a')}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Prediction Form - Show second on desktop, first on mobile when selected */}
        <div ref={formRef} className={`${selectedMatch ? 'order-1 lg:order-2' : 'order-2'}`}>
          {selectedMatch ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-purple-700">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      {existingPrediction ? 'Update' : 'Schedule'} Prediction for Match {selectedMatch.matchNumber}
                    </h2>
                    <p className="text-xs sm:text-sm text-purple-100">
                      {format(selectedMatch.matchDate.toDate(), 'MMMM dd, yyyy • h:mm a')}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
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

                {/* Activation Time Preview */}
                {(() => {
                  const activationTime = getActivationTime(selectedMatch, matches);
                  return (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 sm:p-4">
                      <div className="text-xs sm:text-sm font-medium text-purple-800 dark:text-purple-200">
                        Will activate at: {format(activationTime, 'MMM dd, yyyy • h:mm a')}
                      </div>
                    </div>
                  );
                })()}

                {/* Winner Selection */}
                <div>
                  <label className="block text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
                    Who will win? <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setPredictedWinnerId(selectedMatch.teamAId)}
                      className={`p-4 sm:p-6 border-2 rounded-lg transition min-h-[60px] sm:min-h-[72px] ${
                        predictedWinnerId === selectedMatch.teamAId
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500'
                          : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                      }`}
                    >
                      <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                        {selectedMatch.teamAName}
                      </h4>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPredictedWinnerId(selectedMatch.teamBId)}
                      className={`p-4 sm:p-6 border-2 rounded-lg transition min-h-[60px] sm:min-h-[72px] ${
                        predictedWinnerId === selectedMatch.teamBId
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500'
                          : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                      }`}
                    >
                      <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                        {selectedMatch.teamBName}
                      </h4>
                    </button>
                  </div>
                </div>

                {/* Player of the Match */}
                <div>
                  <label className="block text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
                    Player of the Match
                  </label>
                  <PlayerSearchSelect
                    players={matchPlayers}
                    teams={teams}
                    selectedPlayerId={predictedPom?.id || null}
                    onSelect={(id, name) => setPredictedPom({ id, name })}
                    label=""
                    placeholder="Search players from both teams..."
                  />
                </div>

                {/* First Innings Predictions */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
                    First Innings Predictions
                  </h3>
                  
                  {/* Team A Batting First */}
                  <div className="mb-4 sm:mb-6">
                    <h4 className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                      If {selectedMatch.teamAName} bats first:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Score Category
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {SCORE_CATEGORIES.map((cat) => (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => setTeamAScoreCategory(cat.value)}
                              className={`p-2 sm:p-3 border-2 rounded-lg transition text-center min-h-[44px] ${
                                teamAScoreCategory === cat.value
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 bg-white dark:bg-gray-800'
                              }`}
                            >
                              <div className="text-sm font-bold text-gray-900 dark:text-white">{cat.value}</div>
                              <div className="text-[10px] text-gray-600 dark:text-gray-400">{cat.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Wickets
                        </label>
                        <select
                          value={teamAWickets}
                          onChange={(e) => setTeamAWickets(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base min-h-[44px]"
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
                  </div>

                  {/* Team B Batting First */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                      If {selectedMatch.teamBName} bats first:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Score Category
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {SCORE_CATEGORIES.map((cat) => (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => setTeamBScoreCategory(cat.value)}
                              className={`p-2 sm:p-3 border-2 rounded-lg transition text-center min-h-[44px] ${
                                teamBScoreCategory === cat.value
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 bg-white dark:bg-gray-800'
                              }`}
                            >
                              <div className="text-sm font-bold text-gray-900 dark:text-white">{cat.value}</div>
                              <div className="text-[10px] text-gray-600 dark:text-gray-400">{cat.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Wickets
                        </label>
                        <select
                          value={teamBWickets}
                          onChange={(e) => setTeamBWickets(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base min-h-[44px]"
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
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || !predictedWinnerId}
                  className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition font-bold shadow-md hover:shadow-lg flex items-center justify-center min-h-[44px] text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center">
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                      Scheduling...
                    </span>
                  ) : (
                    existingPrediction ? 'Update Schedule' : 'Schedule Prediction'
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Select a match from the list to schedule a prediction
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SchedulePredictionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    }>
      <SchedulePredictionPageContent />
    </Suspense>
  );
}

