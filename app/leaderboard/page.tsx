'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getActiveTournament, getLeaderboard } from '@/lib/firestore';
import { Loader2, Trophy, Medal, Award, Crown, TrendingUp, Star, Sparkles, Flame } from 'lucide-react';
import type { Tournament, UserEntry } from '@/types';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserEntry[]>([]);
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
      const leaderboardData = await getLeaderboard(activeTournament.id);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-gold-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading rankings...</p>
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
            No Rankings Yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            The leaderboard will light up once users start making predictions!
          </p>
        </div>
      </div>
    );
  }

  function getRankBadge(rank: number) {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full shadow-lg">
            <Crown className="h-6 w-6 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full shadow-lg">
            <Medal className="h-6 w-6 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full shadow-lg">
            <Award className="h-6 w-6 text-white" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-full">
            <span className="text-lg font-bold text-navy-500 dark:text-white">#{rank}</span>
          </div>
        );
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center mb-6">
          <div className="relative">
            <Trophy className="h-20 w-20 text-gold-500 animate-pulse" />
            <Sparkles className="h-6 w-6 text-gold-400 absolute -top-2 -right-2 animate-bounce" />
          </div>
        </div>
        <h1 className="text-5xl font-extrabold mb-3">
          <span className="bg-gradient-to-r from-gold-500 via-gold-600 to-gold-500 bg-clip-text text-transparent">
            Leaderboard
          </span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">{tournament.name}</p>
        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500 dark:text-gray-400">
          <TrendingUp className="h-4 w-4" />
          <span>Live Rankings • Updates every 30 seconds</span>
        </div>
      </div>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="mb-12">
          <div className="grid grid-cols-3 gap-6 items-end max-w-5xl mx-auto">
            {/* 2nd Place */}
            <div className="text-center transform hover:scale-105 transition-transform duration-300">
              <div className="bg-gradient-to-br from-slate-100 via-gray-200 to-slate-300 dark:from-slate-700 dark:to-slate-900 rounded-2xl p-6 shadow-2xl border-2 border-gray-400 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Medal className="h-10 w-10 text-gray-500" />
                </div>
                <div className="mt-4 mb-3">
                  <div className="text-3xl font-bold text-gray-700 dark:text-gray-200 mb-1">2nd</div>
                  <div className="h-1 w-12 bg-gray-500 mx-auto rounded-full mb-3"></div>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate px-2">
                  {leaderboard[1].userName}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-4 truncate px-2">
                  {leaderboard[1].seasonTeamName}
                </div>
                <div className="bg-white/50 dark:bg-black/30 rounded-xl py-3 px-4">
                  <div className="text-4xl font-extrabold text-navy-500 dark:text-white">
                    {leaderboard[1].totalPoints}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">Points</div>
                </div>
              </div>
            </div>

            {/* 1st Place */}
            <div className="text-center transform hover:scale-105 transition-transform duration-300">
              <div className="bg-gradient-to-br from-gold-300 via-gold-400 to-gold-500 dark:from-gold-600 dark:to-gold-800 rounded-2xl p-8 shadow-2xl border-4 border-gold-500 relative -mt-8">
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                  <div className="relative">
                    <Crown className="h-14 w-14 text-gold-600 dark:text-gold-300 animate-pulse" />
                    <Star className="h-5 w-5 text-gold-500 absolute -top-1 -right-1 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                </div>
                <div className="mt-6 mb-4">
                  <div className="text-4xl font-extrabold text-navy-500 dark:text-white mb-2">1st</div>
                  <div className="h-1.5 w-16 bg-navy-500 dark:bg-white mx-auto rounded-full mb-4"></div>
                </div>
                <div className="text-xl font-extrabold text-navy-500 dark:text-white mb-2 truncate px-2">
                  {leaderboard[0].userName}
                </div>
                <div className="text-sm text-navy-600 dark:text-gray-200 mb-5 truncate px-2">
                  {leaderboard[0].seasonTeamName}
                </div>
                <div className="bg-white/80 dark:bg-black/40 rounded-xl py-4 px-6 shadow-lg">
                  <div className="text-5xl font-extrabold text-gold-600 dark:text-gold-400">
                    {leaderboard[0].totalPoints}
                  </div>
                  <div className="text-sm text-navy-600 dark:text-gray-300 uppercase tracking-wider font-semibold">Points</div>
                </div>
                <div className="mt-3 flex items-center justify-center gap-1">
                  <Flame className="h-4 w-4 text-crimson-500" />
                  <span className="text-xs font-semibold text-navy-600 dark:text-white">Champion</span>
                  <Flame className="h-4 w-4 text-crimson-500" />
                </div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="text-center transform hover:scale-105 transition-transform duration-300">
              <div className="bg-gradient-to-br from-orange-200 via-orange-300 to-orange-400 dark:from-orange-700 dark:to-orange-900 rounded-2xl p-6 shadow-2xl border-2 border-orange-500 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Award className="h-10 w-10 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="mt-4 mb-3">
                  <div className="text-3xl font-bold text-orange-800 dark:text-orange-200 mb-1">3rd</div>
                  <div className="h-1 w-12 bg-orange-600 mx-auto rounded-full mb-3"></div>
                </div>
                <div className="text-lg font-bold text-orange-900 dark:text-white mb-1 truncate px-2">
                  {leaderboard[2].userName}
                </div>
                <div className="text-xs text-orange-700 dark:text-orange-300 mb-4 truncate px-2">
                  {leaderboard[2].seasonTeamName}
                </div>
                <div className="bg-white/50 dark:bg-black/30 rounded-xl py-3 px-4">
                  <div className="text-4xl font-extrabold text-navy-500 dark:text-white">
                    {leaderboard[2].totalPoints}
                  </div>
                  <div className="text-xs text-orange-700 dark:text-orange-300 uppercase tracking-wide">Points</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-navy-500 to-navy-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Complete Rankings
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {leaderboard.map((entry, index) => {
            const isCurrentUser = user && entry.userId === user.uid;
            const isTopThree = index < 3;
            
            return (
              <div
                key={entry.id}
                className={`
                  px-6 py-4 flex items-center gap-4 transition-all duration-200
                  ${isCurrentUser 
                    ? 'bg-gradient-to-r from-gold-50 to-gold-100 dark:from-gold-900/20 dark:to-gold-800/20 border-l-4 border-gold-500' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                  }
                  ${isTopThree && !isCurrentUser ? 'bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-gray-800' : ''}
                `}
              >
                {/* Rank Badge */}
                <div className="flex-shrink-0">
                  {getRankBadge(index + 1)}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-navy-500 dark:text-white truncate">
                      {entry.userName}
                    </h3>
                    {isCurrentUser && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gold-500 text-white">
                        You
                      </span>
                    )}
                    {isTopThree && (
                      <Star className="h-4 w-4 text-gold-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="truncate">{entry.seasonTeamName}</span>
                    {entry.totalPenalties > 0 && (
                      <span className="text-xs text-crimson-600 dark:text-crimson-400 font-medium">
                        -{entry.totalPenalties} penalties
                      </span>
                    )}
                  </div>
                </div>

                {/* Points */}
                <div className="flex-shrink-0 text-right">
                  <div className={`text-3xl font-extrabold ${isTopThree ? 'text-gold-600 dark:text-gold-400' : 'text-navy-500 dark:text-white'}`}>
                    {entry.totalPoints}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Points
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Live • Last updated {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}

