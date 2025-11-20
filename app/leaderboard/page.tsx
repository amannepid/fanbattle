'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getActiveTournament, getLeaderboard, getMatches, getAllPredictions } from '@/lib/firestore';
import { getPointsBreakdown } from '@/lib/scoring';
import { Loader2, Trophy, Medal, Crown, TrendingUp, CheckCircle, Clock, Lock, Award, XCircle, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';
import type { Tournament, UserEntry, Match, Prediction } from '@/types';

interface MatchResult {
  matchId: string;
  matchNumber: number;
  points: number;
  penaltyFee: number;
  bonus: number; // POM + Score Category + Wickets bonuses
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
  const [moneyInBank, setMoneyInBank] = useState(0);
  const [totalPenalties, setTotalPenalties] = useState(0);
  const [totalHoneyPot, setTotalHoneyPot] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    
    // Refresh every 5 minutes (reduced from 30 seconds to save reads)
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, []);

  async function loadData(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      }
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

      // Calculate financial metrics
      const ENTRY_FEE = 50; // Fixed entry fee
      const moneyInBank = leaderboardData.length * ENTRY_FEE;
      
      // Calculate total penalties from completed match predictions
      const completedMatchIds = new Set(
        matchesData.filter(m => m.status === 'completed').map(m => m.id)
      );
      const totalPenalties = predictionsData
        .filter(p => completedMatchIds.has(p.matchId) && p.penaltyFee)
        .reduce((sum, p) => sum + (p.penaltyFee || 0), 0);
      
      const totalHoneyPot = moneyInBank + totalPenalties;
      
      setMoneyInBank(moneyInBank);
      setTotalPenalties(totalPenalties);
      setTotalHoneyPot(totalHoneyPot);

      // Debug: Log overall data
      console.log('📊 Leaderboard Data:', {
        totalUsers: leaderboardData.length,
        totalMatches: matchesData.length,
        totalPredictions: predictionsData.length,
        completedMatches: matchesData.filter(m => m.status === 'completed').length
      });
      
      // Debug: Log completed matches
      const completedMatches = matchesData.filter(m => m.status === 'completed');
      console.log('✅ Completed Matches:', completedMatches.map(m => ({
        id: m.id,
        matchNumber: m.matchNumber,
        teams: `${m.teamAName} vs ${m.teamBName}`,
        winner: m.winnerName
      })));
      
      // Debug: Log ALL predictions
      console.log('🎯 All Predictions:', predictionsData.map(p => {
        const match = matchesData.find(m => m.id === p.matchId);
        if (!match) return null;
        const breakdown = getPointsBreakdown(p, match);
        return {
          userId: p.userId,
          userName: leaderboardData.find(u => u.userId === p.userId)?.userName || 'Unknown',
          matchId: p.matchId,
          matchNumber: p.matchNumber,
          points: breakdown.points,
          penaltyFee: breakdown.penaltyFee,
          bonus: breakdown.bonus
        };
      }).filter(Boolean));

      // Build player rows with match results
      const rows: PlayerRow[] = leaderboardData.map((entry, index) => {
        const matchesMap = new Map<string, MatchResult>();
        const userEntry = leaderboardData.find(e => e.userId === entry.userId);
        
        // Get predictions for this user
        const userPredictions = predictionsData.filter(p => p.userId === entry.userId);
        
        // Debug: Log user and their predictions
        console.log(`🔍 User: ${entry.userName} (${entry.userId}) - Total Points: ${entry.totalPoints}`);
        console.log(`   Found ${userPredictions.length} predictions:`, userPredictions.map(p => {
          const match = matchesData.find(m => m.id === p.matchId);
          const basePoints = p.isCorrectWinner 
            ? (match?.matchType === 'league' ? 3 : match?.matchType === 'playoff' ? 5 : 7)
            : 0;
          const points = basePoints + 
                        (p.isCorrectScoreCategory ? 1 : 0);
          const bonus = (p.isCorrectPom ? 1 : 0) + 
                       (p.isCorrectWickets ? 1 : 0) + 
                       (p.seasonTeamAdjustment || 0);
          
          return {
            matchId: p.matchId,
            matchNumber: p.matchNumber,
            points: points,
            penaltyFee: p.penaltyFee,
            bonus: bonus
          };
        }));
        
        // For each match, get the result
        matchesData.forEach(match => {
          const prediction = userPredictions.find(p => p.matchId === match.id);
          
          if (match.status === 'completed') {
            // Match is completed - show result regardless of prediction
            if (prediction) {
              // User made a prediction - use centralized helper function
              const breakdown = getPointsBreakdown(prediction, match);
              
              matchesMap.set(match.id, {
                matchId: match.id,
                matchNumber: match.matchNumber,
                points: breakdown.points,
                penaltyFee: breakdown.penaltyFee,
                bonus: breakdown.bonus,
                status: 'completed',
                hasPrediction: true
              });
            } else {
              // User didn't predict - show 0 points for completed match
              matchesMap.set(match.id, {
                matchId: match.id,
                matchNumber: match.matchNumber,
                points: 0,
                penaltyFee: 0,
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
              penaltyFee: 0,
              bonus: 0,
              status: 'upcoming',
              hasPrediction: false
            });
          }
        });

        return {
          userId: entry.userId,
          userName: entry.userName,
          rank: entry.currentRank || index + 1, // Use stored rank, fallback to index
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
      setRefreshing(false);
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
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-[calc(100vh-12rem)]">
      {/* Left Sidebar - Compact Rankings */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 lg:sticky lg:top-24 overflow-hidden">
          <div className="bg-gradient-to-r from-gold-500 to-gold-600 px-3 sm:px-4 py-2.5 sm:py-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              <h2 className="text-base sm:text-lg font-bold text-white">Rankings</h2>
            </div>
          </div>
          
          <div className="max-h-[400px] lg:max-h-[calc(100vh-16rem)] overflow-y-auto">
            {leaderboard.map((entry, index) => {
              const isCurrentUser = user && entry.userId === user.uid;
              const isTopThree = index < 3;
              
              return (
                <div
                  key={entry.id}
                  className={`
                    px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0
                    ${isCurrentUser 
                      ? 'bg-gradient-to-r from-gold-50 to-gold-100 dark:from-gold-900/20 dark:to-gold-800/20 border-l-4 border-l-gold-500' 
                      : isTopThree ? 'bg-navy-50 dark:bg-navy-800/50' : ''
                    }
                  `}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-7 sm:w-8 text-center">
                      {getRankIcon(entry.currentRank || index + 1) || (
                        <span className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400">
                          #{entry.currentRank || index + 1}
                        </span>
                      )}
                    </div>
                    
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm sm:text-base font-semibold text-navy-500 dark:text-white truncate">
                        {entry.userName}
                        {isCurrentUser && (
                          <span className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs text-gold-600 dark:text-gold-400">(You)</span>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                        {entry.seasonTeamName}
                      </div>
                    </div>
                    
                    {/* Points */}
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-base sm:text-lg font-bold ${isTopThree ? 'text-gold-600 dark:text-gold-400' : 'text-navy-500 dark:text-white'}`}>
                        {entry.totalPoints}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">pts</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Footer */}
          <div className="px-3 sm:px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              <div className="h-1.5 w-1.5 bg-gold-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Tournament Matrix */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-navy-500 to-navy-600 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-gold-500" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Tournament Matrix</h1>
                  <p className="text-xs sm:text-sm text-gray-300">{tournament.name} • {matches.length} Matches</p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  onClick={() => loadData(true)}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  title="Refresh data"
                >
                  <RefreshCw className={`h-4 w-4 text-white ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="text-xs sm:text-sm text-white font-medium">Refresh</span>
                </button>
                <div className="text-right text-white">
                  <div className="text-xs sm:text-sm text-gray-300">Total Players</div>
                  <div className="text-xl sm:text-2xl font-bold">{playerRows.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary Section */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gold-50 to-gold-100 dark:from-gold-900/20 dark:to-gold-800/20 border-b border-gold-200 dark:border-gold-700/50 flex-shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Money in the Bank */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gold-300 dark:border-gold-700/50 shadow-sm h-full flex flex-col">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Money in the Bank</h3>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                  ${moneyInBank.toLocaleString()}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
                  {leaderboard.length} players × ${50} entry fee
                </div>
              </div>

              {/* Penalties */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-red-300 dark:border-red-700/50 shadow-sm h-full flex flex-col">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Penalties</h3>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                  ${totalPenalties.toLocaleString()}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
                  From completed match predictions
                </div>
              </div>

              {/* Total Honey Pot */}
              <div className="bg-gradient-to-br from-gold-400 to-gold-500 dark:from-gold-600 dark:to-gold-700 rounded-lg p-3 sm:p-4 border border-gold-500 dark:border-gold-600 shadow-lg h-full flex flex-col">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  <h3 className="text-xs sm:text-sm font-semibold text-white">Total Honey Pot</h3>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-white">
                  ${totalHoneyPot.toLocaleString()}
                </div>
                <div className="text-[10px] sm:text-xs text-gold-100 dark:text-gold-200 mt-0.5 sm:mt-1">
                  Money in Bank + Penalties
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden flex-1 overflow-auto p-3 sm:p-4 space-y-3">
            {playerRows.map((row) => {
              const isCurrentUser = user && row.userId === user.uid;
              const userEntry = leaderboard.find(u => u.userId === row.userId);
              
              // Calculate totals
              let totalPoints = 0;
              let totalPenalties = 0;
              row.matches.forEach((result) => {
                if (result.status === 'completed') {
                  totalPoints += result.points + result.bonus;
                  totalPenalties += result.penaltyFee || 0;
                }
              });
              
              if (tournament?.status === 'completed' && userEntry?.tournamentBonuses) {
                totalPoints += 
                  (userEntry.tournamentBonuses.seasonTeamWinsTitle || 0) +
                  (userEntry.tournamentBonuses.playerOfTournament || 0) +
                  (userEntry.tournamentBonuses.highestRunScorer || 0) +
                  (userEntry.tournamentBonuses.highestWicketTaker || 0);
              }
              
              const completedMatches = Array.from(row.matches.values()).filter(r => r.status === 'completed');
              
              return (
                <div
                  key={row.userId}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 p-3 sm:p-4 ${
                    isCurrentUser 
                      ? 'border-gold-500 bg-gradient-to-br from-gold-50 to-amber-50 dark:from-gold-900/20 dark:to-amber-900/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="text-base sm:text-lg font-bold text-gray-500 dark:text-gray-400">
                        #{row.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-navy-600 dark:text-white truncate text-sm sm:text-base">
                          {row.userName}
                          {isCurrentUser && (
                            <span className="ml-1.5 text-xs text-gold-600 dark:text-gold-400">(You)</span>
                          )}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                          {userEntry?.seasonTeamName || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg sm:text-xl font-bold text-navy-600 dark:text-white">
                        {row.totalPoints}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">pts</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="bg-navy-50 dark:bg-navy-800 rounded p-2">
                      <div className="text-gray-500 dark:text-gray-400">Entry Fee</div>
                      <div className="font-bold text-crimson-600 dark:text-crimson-400">${row.entryFee}</div>
                    </div>
                    <div className="bg-navy-50 dark:bg-navy-800 rounded p-2">
                      <div className="text-gray-500 dark:text-gray-400">Completed</div>
                      <div className="font-bold text-navy-600 dark:text-white">{completedMatches.length}/{matches.length}</div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1.5">Match Results (scroll horizontally for more)</div>
                    <div className="overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4">
                      <div className="flex gap-2 min-w-max">
                        {matches.map((match) => {
                          const result = row.matches.get(match.id);
                          const isCompleted = result?.status === 'completed';
                          
                          return (
                            <div
                              key={match.id}
                              className={`flex-shrink-0 w-20 sm:w-24 rounded border-2 p-1.5 sm:p-2 ${
                                isCompleted 
                                  ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800' 
                                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                              }`}
                            >
                              <div className="text-[9px] sm:text-[10px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                                M{match.matchNumber}
                              </div>
                              {isCompleted ? (
                                result.hasPrediction ? (
                                  <div className="space-y-0.5">
                                    <div className={`text-xs sm:text-sm font-bold text-center ${
                                      result.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                      {result.points > 0 ? '+' : ''}{result.points}
                                    </div>
                                    {result.penaltyFee > 0 && (
                                      <div className="text-[9px] sm:text-[10px] text-red-600 dark:text-red-400 text-center">
                                        -${result.penaltyFee}
                                      </div>
                                    )}
                                    {result.bonus > 0 && (
                                      <div className="text-[9px] sm:text-[10px] text-green-600 dark:text-green-400 text-center">
                                        +{result.bonus}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 mx-auto" />
                                    <div className="text-[9px] text-red-600 dark:text-red-400 mt-0.5">MISS</div>
                                  </div>
                                )
                              ) : (
                                <div className="text-center">
                                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mx-auto" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t mt-2 pt-2 flex justify-between text-xs sm:text-sm">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Total Points</div>
                      <div className="font-bold text-navy-600 dark:text-white">{totalPoints}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500 dark:text-gray-400">Total Penalties</div>
                      <div className={`font-bold ${totalPenalties > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        ${totalPenalties}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block flex-1 overflow-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-gradient-to-br from-navy-50 via-navy-100 to-navy-200 dark:from-navy-900 dark:via-navy-800 dark:to-navy-900 shadow-sm">
                <tr>
                  {/* Players Column */}
                  <th className="sticky left-0 z-20 bg-gradient-to-br from-navy-100 via-navy-200 to-navy-300 dark:from-navy-800 dark:via-navy-900 dark:to-navy-950 px-5 py-4 text-left border-r-2 border-navy-300 dark:border-navy-700 min-w-[200px] shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-crimson-500"></div>
                      <div className="font-bold text-crimson-600 dark:text-crimson-400 uppercase text-sm tracking-wide">Players</div>
                    </div>
                  </th>
                  
                  {/* Entry Fee Column */}
                  <th className="px-4 py-4 text-center border-r border-navy-200 dark:border-navy-700 min-w-[120px] bg-navy-50/50 dark:bg-navy-800/50">
                    <div className="font-semibold text-navy-700 dark:text-navy-300 uppercase text-xs tracking-wider">Entry Fee</div>
                  </th>
                  
                  {/* Match Columns */}
                  {matches.map((match, index) => {
                    const isFinal = match.matchType === 'final';
                    const isLastMatch = index === matches.length - 1;
                    const showTournamentBonuses = isFinal && isLastMatch;
                    const isTournamentCompleted = tournament?.status === 'completed';
                    
                    return (
                      <React.Fragment key={match.id}>
                        <th
                          className="border-x border-navy-200 dark:border-navy-700 min-w-[280px] sm:min-w-[300px] bg-white dark:bg-navy-800/30"
                        >
                          <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-br from-navy-50 to-cool-50 dark:from-navy-900/20 dark:to-cool-900/20 border-b border-navy-200 dark:border-navy-700">
                            <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold shadow-sm ${
                              match.status === 'completed' 
                                ? 'bg-gradient-to-r from-cool-500 to-cool-600 text-white' 
                                : 'bg-gradient-to-r from-navy-400 to-navy-500 text-white'
                            }`}>
                              <div className={`h-1.5 w-1.5 rounded-full ${match.status === 'completed' ? 'bg-white' : 'bg-white/70'}`}></div>
                              GAME {match.matchNumber}
                            </div>
                            <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-navy-600 dark:text-navy-400 font-medium truncate">
                              {match.teamAName} <span className="text-navy-400">vs</span> {match.teamBName}
                            </div>
                          </div>
                          <div className="flex border-t-2 border-navy-300 dark:border-navy-600 bg-navy-50 dark:bg-navy-800/50">
                            <div className="flex-1 px-2 sm:px-3 py-2 sm:py-2.5 text-center border-r border-navy-200 dark:border-navy-700">
                              <div className="text-[10px] sm:text-xs font-bold text-navy-700 dark:text-navy-300 uppercase tracking-wider">Points</div>
                            </div>
                            <div className="flex-1 px-2 sm:px-3 py-2 sm:py-2.5 text-center border-r border-navy-200 dark:border-navy-700">
                              <div className="text-[10px] sm:text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Penalty</div>
                            </div>
                            <div className="flex-1 px-2 sm:px-3 py-2 sm:py-2.5 text-center">
                              <div className="text-[10px] sm:text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Bonus</div>
                            </div>
                          </div>
                        </th>
                        
                        {/* Tournament Bonuses Column (after Final) - Always show but disabled if not completed */}
                        {showTournamentBonuses && (
                          <th className="border-x border-navy-200 dark:border-navy-700 min-w-[300px] bg-white dark:bg-navy-800/30">
                            <div className="px-4 py-3 bg-gradient-to-br from-gold-50 to-amber-50 dark:from-gold-900/20 dark:to-amber-900/20 border-b border-navy-200 dark:border-navy-700">
                              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
                                isTournamentCompleted 
                                  ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-navy-500' 
                                  : 'bg-gradient-to-r from-navy-400 to-navy-500 text-white'
                              }`}>
                                <Trophy className="h-3 w-3" />
                                Tournament Bonuses
                              </div>
                              <div className="mt-2 text-xs text-navy-600 dark:text-navy-400 font-medium">
                                End of Tournament
                              </div>
                            </div>
                            <div className="flex border-t-2 border-navy-300 dark:border-navy-600 bg-navy-50 dark:bg-navy-800/50">
                              <div className="flex-1 px-3 py-2.5 text-center border-r border-navy-200 dark:border-navy-700">
                                <div className="text-xs font-bold text-gold-600 dark:text-gold-400 uppercase tracking-wider">Title</div>
                              </div>
                              <div className="flex-1 px-3 py-2.5 text-center border-r border-navy-200 dark:border-navy-700">
                                <div className="text-xs font-bold text-gold-600 dark:text-gold-400 uppercase tracking-wider">POT</div>
                              </div>
                              <div className="flex-1 px-3 py-2.5 text-center border-r border-navy-200 dark:border-navy-700">
                                <div className="text-xs font-bold text-gold-600 dark:text-gold-400 uppercase tracking-wider">Runs</div>
                              </div>
                              <div className="flex-1 px-3 py-2.5 text-center">
                                <div className="text-xs font-bold text-gold-600 dark:text-gold-400 uppercase tracking-wider">Wkts</div>
                              </div>
                            </div>
                          </th>
                        )}
                      </React.Fragment>
                    );
                  })}
                  
                  {/* Total Column */}
                  <th className="sticky right-0 z-20 border-l-2 border-navy-300 dark:border-navy-700 min-w-[220px] bg-gradient-to-br from-navy-100 via-navy-200 to-navy-300 dark:from-navy-800 dark:via-navy-900 dark:to-navy-950">
                    <div className="px-4 py-3 bg-gradient-to-br from-navy-50 to-gold-50 dark:from-navy-900/30 dark:to-gold-900/30 border-b border-navy-200 dark:border-navy-700">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm bg-gradient-to-r from-navy-500 to-gold-500 text-white`}>
                        <TrendingUp className="h-3 w-3" />
                        TOTAL
                      </div>
                      <div className="mt-2 text-xs text-navy-600 dark:text-navy-400 font-medium">
                        Summary
                      </div>
                    </div>
                    <div className="flex border-t-2 border-navy-300 dark:border-navy-600 bg-navy-50 dark:bg-navy-800/50">
                      <div className="flex-1 px-3 py-2.5 text-center border-r border-navy-200 dark:border-navy-700">
                        <div className="text-xs font-bold text-navy-700 dark:text-navy-300 uppercase tracking-wider">Points</div>
                      </div>
                      <div className="flex-1 px-3 py-2.5 text-center">
                        <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Penalty</div>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              
              <tbody>
                {playerRows.map((row) => {
                  const isCurrentUser = user && row.userId === user.uid;
                  
                  return (
                    <tr
                      key={row.userId}
                      className={`border-b border-navy-200 dark:border-navy-700 transition-colors ${
                        isCurrentUser 
                          ? 'bg-gradient-to-r from-gold-50 via-amber-50 to-gold-50 dark:from-gold-900/20 dark:via-amber-900/20 dark:to-gold-900/20 border-l-4 border-l-gold-500' 
                          : 'hover:bg-navy-50 dark:hover:bg-navy-800/50'
                      }`}
                    >
                      {/* Player Name */}
                      <td className={`sticky left-0 z-10 px-4 sm:px-5 py-3 sm:py-4 border-r-2 border-navy-300 dark:border-navy-700 font-semibold shadow-sm ${
                        isCurrentUser 
                          ? 'bg-gradient-to-r from-gold-100 to-amber-100 dark:from-gold-900/50 dark:to-amber-900/50 text-navy-700 dark:text-white' 
                          : 'bg-navy-50 dark:bg-navy-800 text-navy-600 dark:text-navy-200'
                      }`}>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${isCurrentUser ? 'bg-gold-500' : 'bg-navy-400'}`}></div>
                          <span className="truncate text-sm sm:text-base">
                            {row.userName}
                            {isCurrentUser && (
                              <span className="ml-1.5 text-xs text-gold-600 dark:text-gold-400">(You)</span>
                            )}
                          </span>
                        </div>
                      </td>
                      
                      {/* Entry Fee */}
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-center border-r border-navy-200 dark:border-navy-700 bg-navy-50/30 dark:bg-navy-800/30">
                        <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md bg-crimson-50 dark:bg-crimson-900/20 text-crimson-600 dark:text-crimson-400 font-bold text-xs sm:text-sm">
                          <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          {row.entryFee}
                        </span>
                      </td>
                      
                      {/* Match Results */}
                      {matches.map((match, matchIndex) => {
                        const result = row.matches.get(match.id);
                        const isCompleted = result?.status === 'completed';
                        const isFinal = match.matchType === 'final';
                        const isLastMatch = matchIndex === matches.length - 1;
                        const showTournamentBonuses = isFinal && isLastMatch;
                        const isTournamentCompleted = tournament?.status === 'completed';
                        const userEntry = leaderboard.find(u => u.userId === row.userId);
                        const tournamentBonuses = userEntry?.tournamentBonuses;
                        
                        return (
                          <React.Fragment key={match.id}>
                            <td
                              className={`border-x border-navy-200 dark:border-navy-700 ${
                                !isCompleted 
                                  ? 'bg-navy-100/50 dark:bg-navy-800/30' 
                                  : 'bg-white dark:bg-navy-800'
                              }`}
                            >
                              <div className="flex divide-x divide-navy-200 dark:divide-navy-700">
                                {/* POINTS Column */}
                                <div className="flex-1 px-2 sm:px-3 py-3 sm:py-4 text-center">
                                  {isCompleted ? (
                                    <div className="flex items-center justify-center">
                                      {result.hasPrediction ? (
                                        <span className={`inline-flex items-center justify-center min-w-[2.5rem] sm:min-w-[3rem] px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg text-sm sm:text-base font-bold ${
                                          result.points > 0 
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                            : result.points < 0
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                            : 'bg-navy-100 dark:bg-navy-700 text-navy-600 dark:text-navy-400'
                                        }`}>
                                          {result.points > 0 ? '+' : ''}{result.points}
                                        </span>
                                      ) : (
                                        <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                                          <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                                          <span className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-semibold">MISS</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 mx-auto" />
                                  )}
                                </div>
                                
                                {/* PENALTY Column */}
                                <div className="flex-1 px-2 sm:px-3 py-3 sm:py-4 text-center">
                                  {isCompleted ? (
                                    result.penaltyFee > 0 ? (
                                      <span className="inline-flex items-center justify-center min-w-[2.5rem] sm:min-w-[3rem] px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm sm:text-base font-bold">
                                        -${result.penaltyFee}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-xs sm:text-sm">$0</span>
                                    )
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </div>
                                
                                {/* BONUS Column */}
                                <div className="flex-1 px-2 sm:px-3 py-3 sm:py-4 text-center">
                                  {isCompleted ? (
                                    result.bonus > 0 ? (
                                      <span className="inline-flex items-center justify-center min-w-[2.5rem] sm:min-w-[3rem] px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm sm:text-base font-bold">
                                        +{result.bonus}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-xs sm:text-sm">0</span>
                                    )
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            
                            {/* Tournament Bonuses Column (after Final) - Always show but disabled if not completed */}
                            {showTournamentBonuses && (
                              <td className={`border-x border-slate-200 dark:border-slate-700 ${
                                !isTournamentCompleted 
                                  ? 'bg-slate-100/50 dark:bg-slate-800/30' 
                                  : 'bg-white dark:bg-slate-800'
                              }`}>
                                <div className="flex divide-x divide-navy-200 dark:divide-navy-700">
                                  {/* TITLE Column (Season Team Wins) */}
                                  <div className="flex-1 px-3 py-4 text-center">
                                    {isTournamentCompleted && tournamentBonuses?.seasonTeamWinsTitle ? (
                                      <span className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-base font-bold">
                                        +{tournamentBonuses.seasonTeamWinsTitle}
                                      </span>
                                    ) : (
                                      <Lock className="h-5 w-5 text-slate-400 mx-auto" />
                                    )}
                                  </div>
                                  
                                  {/* POT Column */}
                                  <div className="flex-1 px-3 py-4 text-center">
                                    {isTournamentCompleted && tournamentBonuses?.playerOfTournament ? (
                                      <span className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-base font-bold">
                                        +{tournamentBonuses.playerOfTournament}
                                      </span>
                                    ) : (
                                      <Lock className="h-5 w-5 text-slate-400 mx-auto" />
                                    )}
                                  </div>
                                  
                                  {/* RUNS Column */}
                                  <div className="flex-1 px-3 py-4 text-center">
                                    {isTournamentCompleted && tournamentBonuses?.highestRunScorer ? (
                                      <span className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-base font-bold">
                                        +{tournamentBonuses.highestRunScorer}
                                      </span>
                                    ) : (
                                      <Lock className="h-5 w-5 text-slate-400 mx-auto" />
                                    )}
                                  </div>
                                  
                                  {/* WKTS Column */}
                                  <div className="flex-1 px-3 py-4 text-center">
                                    {isTournamentCompleted && tournamentBonuses?.highestWicketTaker ? (
                                      <span className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-base font-bold">
                                        +{tournamentBonuses.highestWicketTaker}
                                      </span>
                                    ) : (
                                      <Lock className="h-5 w-5 text-slate-400 mx-auto" />
                                    )}
                                  </div>
                                </div>
                              </td>
                            )}
                          </React.Fragment>
                        );
                      })}
                      
                      {/* Total Points and Penalties */}
                      <td className={`sticky right-0 z-10 border-l-2 border-navy-300 dark:border-navy-700 shadow-sm ${
                        isCurrentUser 
                          ? 'bg-gradient-to-r from-gold-100 to-amber-100 dark:from-gold-900/50 dark:to-amber-900/50' 
                          : 'bg-navy-50 dark:bg-navy-800'
                      }`}>
                        <div className="flex divide-x divide-navy-200 dark:divide-navy-700">
                          {/* Points Column */}
                          <div className="flex-1 px-3 sm:px-4 py-3 sm:py-4 text-center">
                            <div className="inline-flex items-center justify-center min-w-[3rem] sm:min-w-[4rem] px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-br from-navy-100 to-gold-100 dark:from-navy-900/40 dark:to-gold-900/40 text-navy-700 dark:text-white text-lg sm:text-2xl font-extrabold shadow-sm">
                              {(() => {
                                // Calculate total points from completed matches (POINTS + BONUS)
                                let totalPoints = 0;
                                row.matches.forEach((result) => {
                                  if (result.status === 'completed') {
                                    totalPoints += result.points + result.bonus;
                                  }
                                });
                                
                                // Add tournament bonuses if tournament is completed
                                const userEntry = leaderboard.find(e => e.userId === row.userId);
                                if (tournament?.status === 'completed' && userEntry?.tournamentBonuses) {
                                  const tournamentBonusTotal = 
                                    (userEntry.tournamentBonuses.seasonTeamWinsTitle || 0) +
                                    (userEntry.tournamentBonuses.playerOfTournament || 0) +
                                    (userEntry.tournamentBonuses.highestRunScorer || 0) +
                                    (userEntry.tournamentBonuses.highestWicketTaker || 0);
                                  totalPoints += tournamentBonusTotal;
                                }
                                
                                return totalPoints;
                              })()}
                            </div>
                          </div>
                          
                          {/* Penalties Column */}
                          <div className="flex-1 px-3 sm:px-4 py-3 sm:py-4 text-center">
                            <div className={`inline-flex items-center justify-center min-w-[3rem] sm:min-w-[4rem] px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-lg sm:text-2xl font-extrabold shadow-sm ${
                              (() => {
                                let totalPenalties = 0;
                                row.matches.forEach((result) => {
                                  if (result.status === 'completed') {
                                    totalPenalties += result.penaltyFee || 0;
                                  }
                                });
                                return totalPenalties;
                              })() > 0
                                ? 'bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 text-red-700 dark:text-red-400'
                                : 'bg-navy-100 dark:bg-navy-700 text-navy-500 dark:text-navy-400'
                            }`}>
                              {(() => {
                                // Calculate total penalties from completed matches
                                let totalPenalties = 0;
                                row.matches.forEach((result) => {
                                  if (result.status === 'completed') {
                                    totalPenalties += result.penaltyFee || 0;
                                  }
                                });
                                return totalPenalties > 0 ? `-$${totalPenalties}` : '$0';
                              })()}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Legend */}
          <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
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
              <div className="flex items-center gap-1 whitespace-nowrap">
                <Clock className="h-3 w-3" />
                <span className="hidden sm:inline">Auto-refresh: 5 min • </span>
                <span>Updated {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
