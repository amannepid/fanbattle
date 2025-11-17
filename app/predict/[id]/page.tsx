'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { getMatch, getMatches, getUserEntry, getPrediction, createPrediction, updatePrediction } from '@/lib/firestore';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Trophy, User, BarChart3, Target } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { Match, Player, UserEntry, ScoreCategory } from '@/types';
import PlayerSearchSelect from '@/components/PlayerSearchSelect';

const SCORE_CATEGORIES: { value: ScoreCategory; label: string }[] = [
  { value: 'A', label: 'Under 130 (0-129)' },
  { value: 'B', label: '131-145' },
  { value: 'C', label: '146-160' },
  { value: 'D', label: '161-175' },
  { value: 'E', label: '176-190' },
  { value: 'F', label: '191+' },
];

export default function PredictPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<Player[]>([]); // Only players from both teams
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [userEntry, setUserEntry] = useState<UserEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [predictedWinnerId, setPredictedWinnerId] = useState('');
  const [predictedPom, setPredictedPom] = useState<{ id: string; name: string } | null>(null);
  
  // Team A batting first
  const [teamAScoreCategory, setTeamAScoreCategory] = useState<ScoreCategory | ''>('');
  const [teamAWickets, setTeamAWickets] = useState<number | ''>('');
  
  // Team B batting first
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
  }, [user, authLoading, matchId, router]);

  // Helper function to get start of day
  const getStartOfDay = (date: Date): Date => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  // Helper function to get first match of the day for a given match
  const getFirstMatchOfDay = (match: Match): Match | null => {
    const matchDate = match.matchDate.toDate();
    const dayKey = getStartOfDay(matchDate).toISOString();
    
    // Get all matches and find the first one on the same day
    const sameDayMatches = allMatches.filter((m) => {
      const mDate = m.matchDate.toDate();
      const mDayKey = getStartOfDay(mDate).toISOString();
      return mDayKey === dayKey && m.status === 'upcoming';
    });
    
    if (sameDayMatches.length === 0) return null;
    
    // Sort by match date and return the first one
    sameDayMatches.sort((a, b) => 
      a.matchDate.toDate().getTime() - b.matchDate.toDate().getTime()
    );
    
    return sameDayMatches[0];
  };

  async function loadData() {
    try {
      if (!user) return;

      const entry = await getUserEntry(user.uid);
      if (!entry) {
        router.push('/register');
        return;
      }
      setUserEntry(entry);

      const matchData = await getMatch(matchId);
      if (!matchData) {
        setError('Match not found');
        setLoading(false);
        return;
      }
      setMatch(matchData);

      // Load all matches to find first match of the day
      const matchesData = await getMatches(matchData.tournamentId);
      setAllMatches(matchesData);

      // Load teams for display
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const teams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllTeams(teams);

      // Load ONLY players from the two competing teams
      const playersSnapshot = await getDocs(
        query(
          collection(db, 'players'),
          where('teamId', 'in', [matchData.teamAId, matchData.teamBId])
        )
      );
      const players = playersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Player));
      setMatchPlayers(players);

      // Check if prediction already exists
      const existingPrediction = await getPrediction(user.uid, matchId);
      if (existingPrediction) {
        setPredictedWinnerId(existingPrediction.predictedWinnerId);
        
        if (existingPrediction.predictedPomId && existingPrediction.predictedPomName) {
          setPredictedPom({ id: existingPrediction.predictedPomId, name: existingPrediction.predictedPomName });
        }
        
        setTeamAScoreCategory(existingPrediction.teamAScoreCategory || '');
        setTeamAWickets(existingPrediction.teamAWickets ?? '');
        setTeamBScoreCategory(existingPrediction.teamBScoreCategory || '');
        setTeamBWickets(existingPrediction.teamBWickets ?? '');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load match data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!predictedWinnerId || !match || !user || !userEntry) return;

    // Check deadline: 6 hours before first match of the day
    // SPECIAL CASE: Match 1 uses 18-hour window from now (production exception)
    const now = new Date();
    
    let editCutoffTime: Date;
    if (match.matchNumber === 1) {
      // Match 1: deadline is 18 hours from now (not from match start)
      editCutoffTime = new Date(now);
      editCutoffTime.setHours(editCutoffTime.getHours() + 18);
    } else {
      // Other matches: 6 hours before first match of the day
      const firstMatchOfDay = getFirstMatchOfDay(match);
      if (!firstMatchOfDay) {
        setError('Unable to determine match deadline');
        return;
      }
      const firstMatchStartTime = firstMatchOfDay.matchDate.toDate();
      editCutoffTime = new Date(firstMatchStartTime);
      editCutoffTime.setHours(editCutoffTime.getHours() - 6);
    }
    
    if (now >= editCutoffTime) {
      const deadlineMsg = match.matchNumber === 1 
        ? 'Prediction deadline has passed. Match 1 predictions close 18 hours from now (special exception).'
        : 'Prediction deadline has passed. You can no longer edit predictions 6 hours before the first match of the day.';
      setError(deadlineMsg);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const winnerTeam = predictedWinnerId === match.teamAId ? match.teamAName : match.teamBName;

      const predictionData = {
        userId: user.uid,
        matchId: match.id,
        matchNumber: match.matchNumber,
        predictedWinnerId,
        predictedWinnerName: winnerTeam,
        
        predictedPomId: predictedPom?.id,
        predictedPomName: predictedPom?.name,
        
        teamAScoreCategory: teamAScoreCategory || undefined,
        teamAWickets: teamAWickets !== '' ? Number(teamAWickets) : undefined,
        teamBScoreCategory: teamBScoreCategory || undefined,
        teamBWickets: teamBWickets !== '' ? Number(teamBWickets) : undefined,
        
        submittedAt: Timestamp.now(),
      };

      // Check if updating existing prediction
      const existingPrediction = await getPrediction(user.uid, matchId);
      if (existingPrediction) {
        await updatePrediction(existingPrediction.id, predictionData);
      } else {
        await createPrediction(predictionData);
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Error submitting prediction:', error);
      setError('Failed to submit prediction. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
      </div>
    );
  }

  if (error && !match) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!match) {
    return null;
  }

  // Calculate deadline
  // SPECIAL CASE: Match 1 uses 18-hour window from now (production exception)
  const now = new Date();
  let editCutoffTime: Date;
  let deadlineText: string;
  
  if (match.matchNumber === 1) {
    // Match 1: deadline is 18 hours from now (not from match start)
    editCutoffTime = new Date(now);
    editCutoffTime.setHours(editCutoffTime.getHours() + 18);
    deadlineText = '18 hours from now (special exception)';
  } else {
    // Other matches: 6 hours before first match of the day
    const firstMatchOfDay = getFirstMatchOfDay(match);
    if (firstMatchOfDay) {
      const firstMatchStartTime = firstMatchOfDay.matchDate.toDate();
      editCutoffTime = new Date(firstMatchStartTime);
      editCutoffTime.setHours(editCutoffTime.getHours() - 6);
      deadlineText = '6 hours before first match of the day';
    } else {
      editCutoffTime = match.deadline.toDate();
      deadlineText = 'before deadline';
    }
  }
  
  const isPastDeadline = now >= editCutoffTime;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-navy-600 rounded-card shadow-glass p-8 border-2 border-gold-500">
        {/* Match Info */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 text-sm text-navy-500 dark:text-slate-100 mb-4">
            <Trophy className="h-4 w-4 text-gold-500" />
            <span className="font-bold capitalize">{match.matchType}</span>
            <span>•</span>
            <span>Match {match.matchNumber}</span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mb-4">
            <div className="text-center">
              {match.teamALogoUrl && (
                <img 
                  src={match.teamALogoUrl} 
                  alt={match.teamAName}
                  className="h-20 w-20 object-cover rounded-full border-2 border-gray-200 dark:border-gray-700 shadow-md mx-auto mb-2"
                />
              )}
              <h2 className="text-2xl font-bold text-navy-500 dark:text-white">
                {match.teamAName}
              </h2>
            </div>
            <div className="px-6 text-2xl font-bold text-gray-400">VS</div>
            <div className="text-center">
              {match.teamBLogoUrl && (
                <img 
                  src={match.teamBLogoUrl} 
                  alt={match.teamBName}
                  className="h-20 w-20 object-cover rounded-full border-2 border-gray-200 dark:border-gray-700 shadow-md mx-auto mb-2"
                />
              )}
              <h2 className="text-2xl font-bold text-navy-500 dark:text-white">
                {match.teamBName}
              </h2>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {format(match.matchDate.toDate(), 'MMMM dd, yyyy • h:mm a')}
          </p>
          {!isPastDeadline && (
            <p className="text-gold-500 font-bold">
              Deadline: {formatDistanceToNow(editCutoffTime, { addSuffix: true })} ({deadlineText})
            </p>
          )}
        </div>

        {isPastDeadline ? (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-600 rounded-button p-6 text-center">
            <p className="text-red-800 dark:text-red-200 font-bold">
              Prediction deadline has passed
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Winner Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-gold-500" />
                  <h3 className="text-lg font-bold text-navy-500 dark:text-white">
                    Who will win? <span className="text-crimson-500">*</span>
                  </h3>
                </div>
                <span className="text-sm text-gold-500 font-bold">
                  {match.matchType === 'league' ? '+3 points' : match.matchType === 'playoff' ? '+5 points' : '+7 points'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPredictedWinnerId(match.teamAId)}
                  className={`p-6 border-2 rounded-button transition shadow-card hover:shadow-card-hover ${
                    predictedWinnerId === match.teamAId
                      ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20 ring-2 ring-gold-500'
                      : 'border-gray-300 dark:border-navy-400 hover:border-gold-400'
                  }`}
                >
                  <h4 className="text-lg font-bold text-navy-500 dark:text-white">
                    {match.teamAName}
                  </h4>
                </button>
                <button
                  type="button"
                  onClick={() => setPredictedWinnerId(match.teamBId)}
                  className={`p-6 border-2 rounded-button transition shadow-card hover:shadow-card-hover ${
                    predictedWinnerId === match.teamBId
                      ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20 ring-2 ring-gold-500'
                      : 'border-gray-300 dark:border-navy-400 hover:border-gold-400'
                  }`}
                >
                  <h4 className="text-lg font-bold text-navy-500 dark:text-white">
                    {match.teamBName}
                  </h4>
                </button>
              </div>
            </div>

            {/* Player of the Match */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gold-500" />
                  <h3 className="text-lg font-bold text-navy-500 dark:text-white">
                    Player of the Match
                  </h3>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-bold">+1 point</span>
              </div>
              <PlayerSearchSelect
                players={matchPlayers}
                teams={allTeams}
                selectedPlayerId={predictedPom?.id || null}
                onSelect={(id, name) => setPredictedPom({ id, name })}
                label=""
                placeholder="Search players from both teams..."
              />
            </div>

            {/* First Innings Predictions */}
            <div className="bg-cool-50 dark:bg-navy-700 rounded-button p-6 border border-cool-200 dark:border-navy-500">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-cool-500" />
                  <h3 className="text-lg font-bold text-navy-500 dark:text-white">
                    First Innings Predictions
                  </h3>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-bold">+1 point each</span>
              </div>
              
              {/* Team A Batting First */}
              <div className="mb-6">
                <h4 className="text-md font-bold text-navy-500 dark:text-white mb-3">
                  If {match.teamAName} bats first:
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Score Category <span className="text-xs text-gray-500">(+1 pt)</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {SCORE_CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setTeamAScoreCategory(cat.value)}
                          className={`p-3 border-2 rounded-button transition text-center ${
                            teamAScoreCategory === cat.value
                              ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20'
                              : 'border-gray-300 dark:border-navy-400 hover:border-gold-400 bg-white dark:bg-navy-600'
                          }`}
                        >
                          <div className="text-sm font-bold text-navy-500 dark:text-white">{cat.value}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{cat.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Wickets <span className="text-xs text-gray-500">(+1 pt)</span>
                    </label>
                    <select
                      value={teamAWickets}
                      onChange={(e) => setTeamAWickets(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-300 dark:border-navy-400 rounded-button focus:border-gold-500 focus:outline-none bg-white dark:bg-navy-600 text-navy-500 dark:text-white"
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
                <h4 className="text-md font-bold text-navy-500 dark:text-white mb-3">
                  If {match.teamBName} bats first:
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Score Category <span className="text-xs text-gray-500">(+1 pt)</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {SCORE_CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setTeamBScoreCategory(cat.value)}
                          className={`p-3 border-2 rounded-button transition text-center ${
                            teamBScoreCategory === cat.value
                              ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20'
                              : 'border-gray-300 dark:border-navy-400 hover:border-gold-400 bg-white dark:bg-navy-600'
                          }`}
                        >
                          <div className="text-sm font-bold text-navy-500 dark:text-white">{cat.value}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{cat.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Wickets <span className="text-xs text-gray-500">(+1 pt)</span>
                    </label>
                    <select
                      value={teamBWickets}
                      onChange={(e) => setTeamBWickets(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-300 dark:border-navy-400 rounded-button focus:border-gold-500 focus:outline-none bg-white dark:bg-navy-600 text-navy-500 dark:text-white"
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

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-600 rounded-button">
                <p className="text-red-800 dark:text-red-200 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-600 rounded-button p-4">
              <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-2">Scoring Guide:</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• <strong>Winner:</strong> {match.matchType === 'league' ? '3' : match.matchType === 'playoff' ? '5' : '7'} points (Required)</li>
                <li>• <strong>Optional bonuses:</strong> +1 point each for Player of Match, Score Category, Wickets</li>
                <li>• <strong>Season team:</strong> +1 if your team wins (when you predict correctly), -1 if they lose</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={!predictedWinnerId || submitting}
              className="w-full px-6 py-4 bg-gold-500 text-navy-500 rounded-button hover:bg-gold-400 transition disabled:opacity-50 disabled:cursor-not-allowed font-black text-lg shadow-lg hover:shadow-xl"
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Submitting Prediction...
                </span>
              ) : (
                'Submit Prediction'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
