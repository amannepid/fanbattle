'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getActiveTournament, getLeaderboard } from '@/lib/firestore';
import { Loader2, Trophy, Medal, Award, Crown } from 'lucide-react';
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
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!tournament || leaderboard.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Trophy className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No Leaderboard Data
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Leaderboard will appear once users start participating.
        </p>
      </div>
    );
  }

  function getRankIcon(rank: number) {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-orange-600" />;
      default:
        return null;
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Trophy className="h-16 w-16 text-primary-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Leaderboard</h1>
        <p className="text-gray-600 dark:text-gray-400">{tournament.name}</p>
      </div>

      {/* Top 3 */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd Place */}
          <div className="text-center">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg p-6 shadow-lg">
              <div className="flex justify-center mb-2">
                <Medal className="h-12 w-12 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                2nd
              </div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 truncate">
                {leaderboard[1].userName}
              </div>
              <div className="text-3xl font-bold text-primary-600">
                {leaderboard[1].totalPoints}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">points</div>
            </div>
          </div>

          {/* 1st Place */}
          <div className="text-center -mt-4">
            <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-900 rounded-lg p-6 shadow-2xl border-2 border-yellow-500">
              <div className="flex justify-center mb-2">
                <Crown className="h-16 w-16 text-yellow-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                1st
              </div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 truncate">
                {leaderboard[0].userName}
              </div>
              <div className="text-4xl font-bold text-primary-600">
                {leaderboard[0].totalPoints}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">points</div>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="text-center">
            <div className="bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-800 dark:to-orange-900 rounded-lg p-6 shadow-lg">
              <div className="flex justify-center mb-2">
                <Award className="h-12 w-12 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                3rd
              </div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 truncate">
                {leaderboard[2].userName}
              </div>
              <div className="text-3xl font-bold text-primary-600">
                {leaderboard[2].totalPoints}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">points</div>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Season Team
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Points
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Penalties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {leaderboard.map((entry, index) => {
                const isCurrentUser = user && entry.userId === user.uid;
                return (
                  <tr
                    key={entry.id}
                    className={`${
                      isCurrentUser
                        ? 'bg-primary-50 dark:bg-primary-900/20'
                        : index % 2 === 0
                        ? 'bg-white dark:bg-gray-800'
                        : 'bg-gray-50 dark:bg-gray-750'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getRankIcon(index + 1)}
                        <span className={`text-lg font-bold ${isCurrentUser ? 'text-primary-600' : 'text-gray-900 dark:text-white'}`}>
                          #{index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {entry.userName}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-primary-600 dark:text-primary-400">
                            (You)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {entry.userEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {entry.seasonTeamName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-2xl font-bold text-primary-600">
                        {entry.totalPoints}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-red-600 dark:text-red-400">
                        ${entry.totalPenalties?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Updates every 30 seconds • Last updated: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

