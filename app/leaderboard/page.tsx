'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getActiveTournament, getLeaderboard, getMatches, getAllPredictions } from '@/lib/firestore';
import { Loader2, Trophy, Medal, Crown, TrendingUp, CheckCircle, Clock, Lock, Award, XCircle } from 'lucide-react';
import type { Tournament, UserEntry, Match, Prediction } from '@/types';

interface MatchResult {
  matchId: string;
  matchNumber: number;
  points: number;
  bonus: number;
  status: 'completed' | 'upcoming';
  hasPrediction: boolean;
}

interface PlayerRow {
  userId: string;
  userName: string;
  rank: number;
  totalPoints: number;
  entryFee: number;
  matches: Map<string, MatchResult>;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserEntry[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [playerRows, setPlayerRows] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const activeTournament = await getActiveTournament();
      if (!activeTournament) {
        setLoading(false);
        return;
      }

      setTournament(activeTournament);
      
      // Fetch all data in parallel
      const [leaderboardData, matchesData, predictionsData] = await Promise.all([
        getLeaderboard(activeTournament.id),
        getMatches(activeTournament.id),
        getAllPredictions(activeTournament.id)
      ]);

      setLeaderboard(leaderboardData);
      setMatches(matchesData);

      // Build player rows with match results
      const rows: PlayerRow[] = leaderboardData.map((entry, index) => {
        const matchesMap = new Map<string, MatchResult>();
        
        // Get predictions for this user
        const userPredictions = predictionsData.filter(p => p.userId === entry.userId);
        
        // For each match, get the result
        matchesData.forEach(match => {
          const prediction = userPredictions.find(p => p.matchId === match.id);
          
          if (match.status === 'completed') {
            // Match is completed - show result regardless of prediction
            if (prediction) {
              // User made a prediction
              const bonus = prediction.seasonTeamAdjustment || 0;
              matchesMap.set(match.id, {
                matchId: match.id,
                matchNumber: match.matchNumber,
                points: prediction.pointsEarned || 0,
                bonus: bonus,
                status: 'completed',
                hasPrediction: true
              });
            } else {
              // User didn't predict - show 0 points for completed match
              matchesMap.set(match.id, {
                matchId: match.id,
                matchNumber: match.matchNumber,
                points: 0,
                bonus: 0,
                status: 'completed',
                hasPrediction: false
              });
            }
          } else {
            // Upcoming match
            matchesMap.set(match.id, {
              matchId: match.id,
              matchNumber: match.matchNumber,
              points: 0,
              bonus: 0,
              status: 'upcoming',
              hasPrediction: false
            });
          }
        });

        return {
          userId: entry.userId,
          userName: entry.userName,
          rank: index + 1,
          totalPoints: entry.totalPoints,
          entryFee: 50, // Fixed entry fee
          matches: matchesMap
        };
      });

      setPlayerRows(rows);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }

  function getRankIcon(rank: number) {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-gold-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-orange-500" />;
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-gold-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading tournament matrix...</p>
        </div>
      </div>
    );
  }

  if (!tournament || leaderboard.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <div className="bg-gradient-to-br from-navy-500/10 to-gold-500/10 dark:from-navy-700/20 dark:to-gold-700/20 rounded-2xl p-12 border border-gold-500/20">
          <Trophy className="h-20 w-20 mx-auto text-gold-500 mb-6" />
          <h2 className="text-3xl font-bold text-navy-500 dark:text-white mb-3">
            No Data Yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            The leaderboard will appear once users start making predictions!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)]">
      {/* Left Sidebar - Compact Rankings */}
      <div className="w-80 flex-shrink-0">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 sticky top-24 overflow-hidden">
          <div className="bg-gradient-to-r from-gold-500 to-gold-600 px-4 py-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold text-white">Rankings</h2>
            </div>
          </div>
          
          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
            {leaderboard.map((entry, index) => {
              const isCurrentUser = user && entry.userId === user.uid;
              const isTopThree = index < 3;
              
              return (
                <div
                  key={entry.id}
                  className={`
                    px-4 py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0
                    ${isCurrentUser 
                      ? 'bg-gradient-to-r from-gold-50 to-gold-100 dark:from-gold-900/20 dark:to-gold-800/20 border-l-4 border-l-gold-500' 
                      : isTopThree ? 'bg-slate-50 dark:bg-slate-800/50' : ''
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 text-center">
                      {getRankIcon(index + 1) || (
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                          #{index + 1}
                        </span>
                      )}
                    </div>
                    
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-navy-500 dark:text-white truncate">
                        {entry.userName}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-gold-600 dark:text-gold-400">(You)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {entry.seasonTeamName}
                      </div>
                    </div>
                    
                    {/* Points */}
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-lg font-bold ${isTopThree ? 'text-gold-600 dark:text-gold-400' : 'text-navy-500 dark:text-white'}`}>
                        {entry.totalPoints}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">pts</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Tournament Matrix */}
      <div className="flex-1 overflow-hidden">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-navy-500 to-navy-600 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-gold-500" />
                <div>
                  <h1 className="text-2xl font-bold text-white">Tournament Matrix</h1>
                  <p className="text-sm text-gray-300">{tournament.name} • {matches.length} Matches</p>
                </div>
              </div>
              <div className="text-right text-white">
                <div className="text-sm text-gray-300">Total Players</div>
                <div className="text-2xl font-bold">{playerRows.length}</div>
              </div>
            </div>
          </div>

          {/* Scrollable Table Container */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                <tr>
                  {/* Players Column */}
                  <th className="sticky left-0 z-20 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 px-4 py-3 text-left border-r-2 border-gray-300 dark:border-gray-700 min-w-[180px]">
                    <div className="font-bold text-crimson-600 dark:text-crimson-400 uppercase text-sm">Players</div>
                  </th>
                  
                  {/* Entry Fee Column */}
                  <th className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-700 min-w-[100px]">
                    <div className="font-bold text-gray-700 dark:text-gray-300 uppercase text-xs">Entry Fee</div>
                  </th>
                  
                  {/* Match Columns */}
                  {matches.map((match) => (
                    <th
                      key={match.id}
                      className="border-x border-gray-300 dark:border-gray-700 min-w-[280px]"
                    >
                      <div className="px-3 py-2">
                        <div className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                          match.status === 'completed' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-400 text-white'
                        }`}>
                          GAME {match.matchNumber}
                        </div>
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 font-normal">
                          {match.teamAName} V {match.teamBName}
                        </div>
                      </div>
                      <div className="flex border-t border-gray-300 dark:border-gray-700">
                        <div className="flex-1 px-2 py-1 text-center border-r border-gray-200 dark:border-gray-600">
                          <div className="text-xs font-semibold text-crimson-600 dark:text-crimson-400">FEE</div>
                        </div>
                        <div className="flex-1 px-2 py-1 text-center">
                          <div className="text-xs font-semibold text-green-600 dark:text-green-400">BONUS</div>
                        </div>
                      </div>
                    </th>
                  ))}
                  
                  {/* Total Column */}
                  <th className="sticky right-0 z-20 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 px-4 py-3 text-center border-l-2 border-gray-300 dark:border-gray-700 min-w-[100px]">
                    <div className="font-bold text-navy-600 dark:text-white uppercase text-sm">Total</div>
                  </th>
                </tr>
              </thead>
              
              <tbody>
                {playerRows.map((row) => {
                  const isCurrentUser = user && row.userId === user.uid;
                  
                  return (
                    <tr
                      key={row.userId}
                      className={`border-b border-gray-200 dark:border-gray-700 ${
                        isCurrentUser 
                          ? 'bg-gold-50 dark:bg-gold-900/10' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                      }`}
                    >
                      {/* Player Name */}
                      <td className={`sticky left-0 z-10 px-4 py-3 border-r-2 border-gray-300 dark:border-gray-700 font-semibold ${
                        isCurrentUser 
                          ? 'bg-gold-100 dark:bg-gold-900/20 text-navy-600 dark:text-white' 
                          : 'bg-white dark:bg-gray-800 text-navy-500 dark:text-gray-200'
                      }`}>
                        {row.userName}
                      </td>
                      
                      {/* Entry Fee */}
                      <td className="px-4 py-3 text-center border-r border-gray-200 dark:border-gray-700">
                        <span className="text-crimson-600 dark:text-crimson-400 font-semibold">${row.entryFee}</span>
                      </td>
                      
                      {/* Match Results */}
                      {matches.map((match) => {
                        const result = row.matches.get(match.id);
                        const isCompleted = result?.status === 'completed';
                        
                        return (
                          <td
                            key={match.id}
                            className="border-x border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                          >
                            <div className="flex">
                              {/* Fee/Points */}
                              <div className={`flex-1 px-3 py-3 text-center border-r border-gray-200 dark:border-gray-600 ${
                                !isCompleted ? 'bg-gray-100 dark:bg-gray-700/50' : ''
                              }`}>
                                {isCompleted ? (
                                  <div className="flex items-center justify-center gap-1">
                                    {result.hasPrediction ? (
                                      <>
                                        <span className="text-lg font-bold text-navy-600 dark:text-white">
                                          {result.points}
                                        </span>
                                        {result.points > 0 && (
                                          <CheckCircle className="h-4 w-4 text-green-500" />
                                        )}
                                      </>
                                    ) : (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <XCircle className="h-5 w-5 text-red-500" />
                                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">MISS</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <Lock className="h-4 w-4 text-gray-400 mx-auto" />
                                )}
                              </div>
                              
                              {/* Bonus */}
                              <div className={`flex-1 px-3 py-3 text-center ${
                                !isCompleted ? 'bg-gray-100 dark:bg-gray-700/50' : ''
                              }`}>
                                {isCompleted && result.bonus !== 0 ? (
                                  <span className={`text-lg font-bold ${
                                    result.bonus > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {result.bonus > 0 ? '+' : ''}{result.bonus}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      
                      {/* Total Points */}
                      <td className={`sticky right-0 z-10 px-4 py-3 text-center border-l-2 border-gray-300 dark:border-gray-700 ${
                        isCurrentUser 
                          ? 'bg-gold-100 dark:bg-gold-900/20' 
                          : 'bg-white dark:bg-gray-800'
                      }`}>
                        <div className="text-2xl font-extrabold text-navy-600 dark:text-white">
                          {row.totalPoints}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Legend */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Points Earned</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" />
                  <span>Missed Prediction</span>
                </div>
                <div className="flex items-center gap-1">
                  <Lock className="h-3 w-3 text-gray-400" />
                  <span>Upcoming Match</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-green-600 font-semibold">+</span>
                  <span>Season Team Bonus</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-red-600 font-semibold">-</span>
                  <span>Season Team Penalty</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Updated {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
