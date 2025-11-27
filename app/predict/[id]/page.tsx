'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { getMatch, getMatches, getTeams, getUserEntry, getPrediction, createPrediction, updatePrediction } from '@/lib/firestore';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Trophy, User, BarChart3, Target, Calendar } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Timestamp, deleteField, FieldValue } from 'firebase/firestore';
import type { Match, Player, UserEntry, ScoreCategory, Prediction } from '@/types';
import PlayerSearchSelect from '@/components/PlayerSearchSelect';
import { shouldBlockMatchAt8PMCST, getNepalDay, getActivationTime } from '@/lib/prediction-rules';

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
  const searchParams = useSearchParams();
  const matchId = params.id as string;
  const scheduleParam = searchParams.get('schedule') === 'true';

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
  
  // Schedule option - only enabled if explicitly requested via URL param or editing existing scheduled prediction
  const [isScheduled, setIsScheduled] = useState(false); // Default to false, will be set based on existing prediction or URL param
  const [existingPrediction, setExistingPrediction] = useState<Prediction | null>(null);
  const [showScheduleOption, setShowScheduleOption] = useState(scheduleParam); // Only show if explicitly requested

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, authLoading, matchId, router]);

  // Helper function to get first match of the day for a given match (using Nepal Time)
  const getFirstMatchOfDay = (match: Match): Match | null => {
    const matchDate = match.matchDate.toDate();
    const dayKey = getNepalDay(matchDate).toISOString();
    
    // Get all matches and find the first one on the same Nepal day
    // Include both upcoming and completed matches to get the actual first match of the day
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

      // Load teams for this tournament only (filtered by tournamentId)
      const teams = await getTeams(matchData.tournamentId);
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
      const existing = await getPrediction(user.uid, matchId);
      if (existing) {
        setExistingPrediction(existing);
        setPredictedWinnerId(existing.predictedWinnerId);
        
        if (existing.predictedPomId && existing.predictedPomName) {
          setPredictedPom({ id: existing.predictedPomId, name: existing.predictedPomName });
        }
        
        setTeamAScoreCategory(existing.teamAScoreCategory || '');
        setTeamAWickets(existing.teamAWickets ?? '');
        setTeamBScoreCategory(existing.teamBScoreCategory || '');
        setTeamBWickets(existing.teamBWickets ?? '');
        
        // Check if this is a scheduled prediction (and hasn't been activated yet)
        const now = new Date();
        if (existing.scheduledFor) {
          const scheduledTime = existing.scheduledFor.toDate();
          // Only treat as scheduled if activation time hasn't passed
          const isStillScheduled = scheduledTime > now;
          setIsScheduled(isStillScheduled);
          // Show schedule option if editing an existing scheduled prediction
          setShowScheduleOption(isStillScheduled || scheduleParam);
        } else {
          setIsScheduled(false);
          // Only show schedule option if explicitly requested via URL param
          setShowScheduleOption(scheduleParam);
        }
      } else {
        setExistingPrediction(null);
        // Only show schedule option if explicitly requested via URL param
        setShowScheduleOption(scheduleParam);
        setIsScheduled(false);
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

    const now = new Date();
    
    // If scheduling, skip deadline checks (scheduling is allowed even if past deadline)
    if (!isScheduled) {
      // Check 7 PM CST cutoff for matches on the same Nepal day as the "next" match
      if (allMatches && allMatches.length > 0 && shouldBlockMatchAt8PMCST(match, allMatches)) {
        setError('Prediction deadline has passed. Predictions close at 7 PM CST daily.');
        return;
      }

      // Check deadline: 6 hours before first match of the day
      const firstMatchOfDay = getFirstMatchOfDay(match);
      if (!firstMatchOfDay) {
        setError('Unable to determine match deadline');
        return;
      }
      const firstMatchStartTime = firstMatchOfDay.matchDate.toDate();
      
      // If the first match of the day is already completed or started, editing should be blocked
      if (firstMatchOfDay.status === 'completed' || now >= firstMatchStartTime) {
        setError('Prediction deadline has passed. The first match of the day has already started or completed.');
        return;
      }
      
      const editCutoffTime = new Date(firstMatchStartTime);
      editCutoffTime.setHours(editCutoffTime.getHours() - 6);
      
      if (now >= editCutoffTime) {
        setError('Prediction deadline has passed. You can no longer edit predictions 6 hours before the first match of the day.');
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const winnerTeam = predictedWinnerId === match.teamAId ? match.teamAName : match.teamBName;

      // Calculate activation time if scheduling
      let scheduledFor: Timestamp | FieldValue | undefined;
      let scheduledAt: Timestamp | FieldValue | undefined;
      
      // Check if updating an existing scheduled prediction
      const isUpdatingScheduled = existingPrediction?.scheduledFor;
      
      if (isScheduled) {
        const activationTime = getActivationTime(match, allMatches);
        
        // Validate that activation time is in the future
        if (activationTime <= now) {
          setError('Cannot schedule prediction - activation time has already passed.');
          setSubmitting(false);
          return;
        }
        
        scheduledFor = Timestamp.fromDate(activationTime);
        scheduledAt = Timestamp.now();
      } else if (isUpdatingScheduled) {
        // If user unchecks schedule option, clear scheduled fields using deleteField()
        scheduledFor = deleteField();
        scheduledAt = deleteField();
      }

      const predictionData: any = {
        userId: user.uid,
        matchId: match.id,
        matchNumber: match.matchNumber,
        predictedWinnerId,
        predictedWinnerName: winnerTeam,
        submittedAt: Timestamp.now(),
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

      // Only include scheduledFor and scheduledAt if they are set (either as Timestamp or deleteField)
      if (scheduledFor !== undefined) {
        predictionData.scheduledFor = scheduledFor;
      }
      if (scheduledAt !== undefined) {
        predictionData.scheduledAt = scheduledAt;
      }

      // Check if updating existing prediction
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
  // Check 7 PM CST cutoff for matches on the same Nepal day as the "next" match
  const now = new Date();
  const shouldBlock = allMatches && allMatches.length > 0 
    ? shouldBlockMatchAt8PMCST(match, allMatches)
    : false;
  
  let editCutoffTime: Date;
  let deadlineText: string;
  
  if (shouldBlock) {
    // Block matches on the same Nepal day after 7 PM CST cutoff
    editCutoffTime = new Date(0); // Set to epoch to ensure isPastDeadline is true
    deadlineText = '7 PM CST (daily cutoff)';
  } else {
    // All matches: 6 hours before first match of the day
    const firstMatchOfDay = getFirstMatchOfDay(match);
    if (firstMatchOfDay) {
      const firstMatchStartTime = firstMatchOfDay.matchDate.toDate();
      
      // If first match is already completed or started, deadline has passed
      if (firstMatchOfDay.status === 'completed' || now >= firstMatchStartTime) {
        editCutoffTime = new Date(0); // Set to epoch to ensure isPastDeadline is true
        deadlineText = 'first match of the day has started/completed';
      } else {
        editCutoffTime = new Date(firstMatchStartTime);
        editCutoffTime.setHours(editCutoffTime.getHours() - 6);
        deadlineText = '6 hours before first match of the day';
      }
    } else {
      editCutoffTime = match.deadline.toDate();
      deadlineText = 'before deadline';
    }
  }
  
  const isPastDeadline = now >= editCutoffTime;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-navy-600 rounded-card shadow-glass p-4 sm:p-6 md:p-8 border-2 border-gold-500">
        {/* Match Info */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm text-navy-500 dark:text-slate-100 mb-3 sm:mb-4">
            <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gold-500" />
            <span className="font-bold capitalize whitespace-nowrap">{match.matchType}</span>
            <span className="whitespace-nowrap">•</span>
            <span className="whitespace-nowrap">Match {match.matchNumber}</span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 items-center mb-3 sm:mb-4 px-1">
            <div className="text-center min-w-0">
              {match.teamALogoUrl && (
                <img 
                  src={match.teamALogoUrl} 
                  alt={match.teamAName}
                  className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-full border-2 border-gray-200 dark:border-gray-700 shadow-md mx-auto mb-1.5 sm:mb-2"
                />
              )}
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-navy-500 dark:text-white truncate px-1">
                {match.teamAName}
              </h2>
            </div>
            <div className="px-2 sm:px-3 md:px-6 text-lg sm:text-xl md:text-2xl font-bold text-gray-400 flex-shrink-0">VS</div>
            <div className="text-center min-w-0">
              {match.teamBLogoUrl && (
                <img 
                  src={match.teamBLogoUrl} 
                  alt={match.teamBName}
                  className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-full border-2 border-gray-200 dark:border-gray-700 shadow-md mx-auto mb-1.5 sm:mb-2"
                />
              )}
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-navy-500 dark:text-white truncate px-1">
                {match.teamBName}
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2 px-2 break-words">
            {format(match.matchDate.toDate(), 'MMMM dd, yyyy • h:mm a')}
          </p>
          {!isPastDeadline && (
            <p className="text-xs sm:text-sm md:text-base text-gold-500 font-bold px-2 break-words">
              Deadline: {formatDistanceToNow(editCutoffTime, { addSuffix: true })} ({deadlineText})
            </p>
          )}
        </div>

        {isPastDeadline && !isScheduled ? (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-600 rounded-button p-4 sm:p-6 text-center">
            <p className="text-sm sm:text-base text-red-800 dark:text-red-200 font-bold">
              Prediction deadline has passed
            </p>
            {showScheduleOption ? (
              <>
                <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 mt-2">
                  You can still schedule a prediction for this match
                </p>
                <button
                  onClick={() => setIsScheduled(true)}
                  className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-button hover:bg-purple-400 transition font-bold"
                >
                  Schedule Prediction Instead
                </button>
              </>
            ) : (
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 mt-2">
                Please visit the Dashboard to schedule a prediction for locked matches.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Winner Selection */}
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-gold-500" />
                  <h3 className="text-base sm:text-lg font-bold text-navy-500 dark:text-white whitespace-nowrap">
                    Who will win? <span className="text-crimson-500">*</span>
                  </h3>
                </div>
                <span className="text-xs sm:text-sm text-gold-500 font-bold whitespace-nowrap">
                  {match.matchType === 'league' ? '+3 points' : match.matchType === 'playoff' ? '+5 points' : '+7 points'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setPredictedWinnerId(match.teamAId)}
                  className={`p-4 sm:p-6 border-2 rounded-button transition shadow-card hover:shadow-card-hover min-h-[60px] sm:min-h-[72px] flex items-center justify-center ${
                    predictedWinnerId === match.teamAId
                      ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20 ring-2 ring-gold-500'
                      : 'border-gray-300 dark:border-navy-400 hover:border-gold-400'
                  }`}
                >
                  <h4 className="text-base sm:text-lg font-bold text-navy-500 dark:text-white truncate">
                    {match.teamAName}
                  </h4>
                </button>
                <button
                  type="button"
                  onClick={() => setPredictedWinnerId(match.teamBId)}
                  className={`p-4 sm:p-6 border-2 rounded-button transition shadow-card hover:shadow-card-hover min-h-[60px] sm:min-h-[72px] flex items-center justify-center ${
                    predictedWinnerId === match.teamBId
                      ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20 ring-2 ring-gold-500'
                      : 'border-gray-300 dark:border-navy-400 hover:border-gold-400'
                  }`}
                >
                  <h4 className="text-base sm:text-lg font-bold text-navy-500 dark:text-white truncate">
                    {match.teamBName}
                  </h4>
                </button>
              </div>
            </div>

            {/* Player of the Match */}
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-gold-500" />
                  <h3 className="text-base sm:text-lg font-bold text-navy-500 dark:text-white whitespace-nowrap">
                    Player of the Match
                  </h3>
                </div>
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-bold whitespace-nowrap">+1 point</span>
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
            <div className="bg-cool-50 dark:bg-navy-700 rounded-button p-4 sm:p-6 border border-cool-200 dark:border-navy-500">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-cool-500" />
                  <h3 className="text-base sm:text-lg font-bold text-navy-500 dark:text-white whitespace-nowrap">
                    First Innings Predictions
                  </h3>
                </div>
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-bold whitespace-nowrap">+1 point each</span>
              </div>
              
              {/* Team A Batting First */}
              <div className="mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-md font-bold text-navy-500 dark:text-white mb-2 sm:mb-3 whitespace-nowrap">
                  If {match.teamAName} bats first:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 whitespace-nowrap">
                      Score Category <span className="text-[10px] sm:text-xs text-gray-500">(+1 pt)</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SCORE_CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setTeamAScoreCategory(cat.value)}
                          className={`p-2 sm:p-3 border-2 rounded-button transition text-center min-h-[44px] ${
                            teamAScoreCategory === cat.value
                              ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20'
                              : 'border-gray-300 dark:border-navy-400 hover:border-gold-400 bg-white dark:bg-navy-600'
                          }`}
                        >
                          <div className="text-sm font-bold text-navy-500 dark:text-white">{cat.value}</div>
                          <div className="text-[10px] text-gray-600 dark:text-gray-400">{cat.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 whitespace-nowrap">
                      Wickets <span className="text-[10px] sm:text-xs text-gray-500">(+1 pt)</span>
                    </label>
                    <select
                      value={teamAWickets}
                      onChange={(e) => setTeamAWickets(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-gray-300 dark:border-navy-400 rounded-button focus:border-gold-500 focus:outline-none bg-white dark:bg-navy-600 text-navy-500 dark:text-white text-sm sm:text-base min-h-[44px]"
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
                <h4 className="text-sm sm:text-md font-bold text-navy-500 dark:text-white mb-2 sm:mb-3 whitespace-nowrap">
                  If {match.teamBName} bats first:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 whitespace-nowrap">
                      Score Category <span className="text-[10px] sm:text-xs text-gray-500">(+1 pt)</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SCORE_CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setTeamBScoreCategory(cat.value)}
                          className={`p-2 sm:p-3 border-2 rounded-button transition text-center min-h-[44px] ${
                            teamBScoreCategory === cat.value
                              ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20'
                              : 'border-gray-300 dark:border-navy-400 hover:border-gold-400 bg-white dark:bg-navy-600'
                          }`}
                        >
                          <div className="text-sm font-bold text-navy-500 dark:text-white">{cat.value}</div>
                          <div className="text-[10px] text-gray-600 dark:text-gray-400">{cat.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 whitespace-nowrap">
                      Wickets <span className="text-[10px] sm:text-xs text-gray-500">(+1 pt)</span>
                    </label>
                    <select
                      value={teamBWickets}
                      onChange={(e) => setTeamBWickets(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-gray-300 dark:border-navy-400 rounded-button focus:border-gold-500 focus:outline-none bg-white dark:bg-navy-600 text-navy-500 dark:text-white text-sm sm:text-base min-h-[44px]"
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

            {/* Schedule Option - Only show if explicitly requested or editing existing scheduled prediction */}
            {showScheduleOption && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-400 dark:border-purple-600 rounded-button p-3 sm:p-4">
                <label className="flex items-center space-x-2 sm:space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                      <span className="text-sm sm:text-base font-bold text-purple-900 dark:text-purple-200">
                        Schedule Prediction
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-purple-800 dark:text-purple-300 mt-1">
                      Activate this prediction automatically after the cutoff time
                    </p>
                  </div>
                </label>
                {isScheduled && match && allMatches.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-purple-300 dark:border-purple-700">
                    <div className="text-xs sm:text-sm text-purple-800 dark:text-purple-200">
                      <strong>Will activate at:</strong> {format(getActivationTime(match, allMatches), 'MMM dd, yyyy • h:mm a')}
                    </div>
                    <div className="text-[10px] sm:text-xs text-purple-700 dark:text-purple-300 mt-1">
                      {formatDistanceToNow(getActivationTime(match, allMatches), { addSuffix: true })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-600 rounded-button">
                <p className="text-xs sm:text-sm text-red-800 dark:text-red-200 font-medium">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-600 rounded-button p-3 sm:p-4">
              <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-1.5 sm:mb-2 text-sm sm:text-base">Scoring Guide:</h4>
              <ul className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• <strong>Winner:</strong> {match.matchType === 'league' ? '3' : match.matchType === 'playoff' ? '5' : '7'} points (Required)</li>
                <li>• <strong>Optional bonuses:</strong> +1 point each for Player of Match, Score Category, Wickets</li>
                <li>• <strong>Season team:</strong> +1 if your team wins (when you predict correctly), -1 if they lose</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={!predictedWinnerId || submitting}
              className="w-full px-5 py-3.5 sm:px-6 sm:py-4 bg-gold-500 text-navy-500 rounded-button hover:bg-gold-400 transition disabled:opacity-50 disabled:cursor-not-allowed font-black text-base sm:text-lg shadow-lg hover:shadow-xl min-h-[44px]"
            >
              {submitting ? (
                <span className="flex items-center justify-center text-sm sm:text-base">
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                  {isScheduled ? 'Scheduling Prediction...' : 'Submitting Prediction...'}
                </span>
              ) : (
                (() => {
                  // Check if updating an existing scheduled prediction
                  const isUpdatingScheduled = existingPrediction?.scheduledFor && 
                    existingPrediction.scheduledFor.toDate() > new Date();
                  
                  if (isScheduled) {
                    return isUpdatingScheduled ? 'Update Schedule' : 'Schedule Prediction';
                  }
                  return 'Submit Prediction';
                })()
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
