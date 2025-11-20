'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getActiveTournament, getMatches, getUserEntry, getUserPredictions } from '@/lib/firestore';
import { getPredictableMatches } from '@/lib/prediction-rules';
import MatchCard from '@/components/MatchCard';
import Link from 'next/link';
import { Trophy, Loader2, Calendar } from 'lucide-react';
import type { Match, Tournament, UserEntry, Prediction } from '@/types';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [userEntry, setUserEntry] = useState<UserEntry | null>(null);
  const [userPredictions, setUserPredictions] = useState<Prediction[]>([]);
  const [predictableMatchIds, setPredictableMatchIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    try {
      const activeTournament = await getActiveTournament();
      if (!activeTournament) {
        setLoading(false);
        return;
      }

      setTournament(activeTournament);
      
      // Fetch matches first (needed for both logged in and logged out users)
      const matchesData = await getMatches(activeTournament.id);
      setMatches(matchesData);

      if (user) {
        // Fetch user-specific data in parallel
        const [entry, predictions] = await Promise.all([
          getUserEntry(user.uid),
          getUserPredictions(user.uid)
        ]);
        
        setUserEntry(entry);
        setUserPredictions(predictions);
        
        // Calculate which matches can be predicted
        const predictable = getPredictableMatches(matchesData, predictions);
        setPredictableMatchIds(predictable);
      } else {
        // Clear user-specific data when logged out
        setUserEntry(null);
        setUserPredictions([]);
        setPredictableMatchIds(new Set());
      }
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

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No Active Tournament
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Check back soon for the next tournament!
        </p>
      </div>
    );
  }

  const filteredMatches = matches.filter((match) => {
    if (filter === 'upcoming') return match.status === 'upcoming';
    if (filter === 'completed') return match.status === 'completed';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto min-h-screen">
      {/* Hero Section with Banner */}
      <div className="relative mb-8 rounded-card overflow-hidden shadow-glass border-2 border-gold-500">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/hero-banner.jpg)' }}
        >
          {/* Overlay gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-navy-500/95 via-navy-600/85 to-transparent"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:px-8 md:py-20 lg:py-32">
          <div className="max-w-2xl">
            <div className="flex items-start mb-4">
              <Trophy className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gold-500 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="h-8 w-0.5 sm:h-10 sm:w-1 bg-gold-500 mr-3 sm:mr-4 flex-shrink-0"></div>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gold-500 leading-tight">
                  Nepal Premier League
                </h1>
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight mt-1">
                  FanBattle
                </h2>
                <p className="text-xs sm:text-sm md:text-base text-white/60 font-medium mt-2">
                  {tournament.name}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 text-white/80 mt-4">
                  <span className="text-xs sm:text-sm md:text-base whitespace-nowrap">📅 Nov 17 - Dec 13, 2025</span>
                  <span className="hidden min-[375px]:inline text-xs sm:text-sm md:text-base">•</span>
                  <span className="text-xs sm:text-sm md:text-base whitespace-nowrap">🏆 32 Matches</span>
                  <span className="hidden min-[375px]:inline text-xs sm:text-sm md:text-base">•</span>
                  <span className="text-xs sm:text-sm md:text-base whitespace-nowrap">8 Teams</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Status */}
      {user && !userEntry && (
        <div className="mb-6 sm:mb-8 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-yellow-900 dark:text-yellow-200 mb-2">
            🎯 You haven't registered yet!
          </h3>
          <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-4">
            Register now to start making predictions and compete with others.
          </p>
          <Link
            href="/register"
            className="inline-block px-5 py-2.5 sm:px-6 sm:py-3 bg-gold-500 text-navy-500 rounded-button hover:bg-gold-400 transition font-bold shadow-md hover:shadow-lg min-h-[44px] text-sm sm:text-base"
          >
            Register for Tournament
          </Link>
        </div>
      )}

      {user && userEntry && (
        <div className="mb-6 sm:mb-8 bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-400 dark:border-primary-600 rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between flex-wrap gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-primary-900 dark:text-primary-200 mb-1 truncate">
                Welcome back, {userEntry.userName}!
              </h3>
              <p className="text-sm text-primary-800 dark:text-primary-300 truncate">
                Season Team: <span className="font-bold">{userEntry.seasonTeamName}</span>
              </p>
            </div>
            <div className="flex space-x-4 flex-shrink-0 w-full sm:w-auto justify-around sm:justify-start mt-3 sm:mt-0">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {userEntry.totalPoints}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Points</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400">
                  #{userEntry.currentRank || '-'}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Rank</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!user && (
        <div className="mb-6 sm:mb-8 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-lg p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Join the Competition!
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
            Sign in to make predictions, track your points, and compete for the top spot.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-2.5 sm:px-8 sm:py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium text-base sm:text-lg min-h-[44px]"
          >
            Sign In to Get Started
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3 sm:gap-0">
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Matches</h2>
        </div>
        <div className="bg-slate-100 dark:bg-navy-700 rounded-button p-0.5 sm:p-1 inline-flex space-x-0.5 sm:space-x-1 overflow-x-auto no-scrollbar flex-shrink-0 min-w-full sm:min-w-0 justify-between sm:justify-start">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-button font-bold transition-all relative min-h-[44px] min-w-[80px] text-sm sm:text-base whitespace-nowrap ${
              filter === 'upcoming'
                ? 'bg-gold-500 text-navy-500 shadow-md scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:text-navy-500 dark:hover:text-white'
            }`}
          >
            <span className="relative z-10">Upcoming</span>
            {filter === 'upcoming' && (
              <div className="absolute inset-0 bg-gold-500 rounded-button animate-pulse opacity-20"></div>
            )}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-button font-bold transition-all relative min-h-[44px] min-w-[80px] text-sm sm:text-base whitespace-nowrap ${
              filter === 'completed'
                ? 'bg-gold-500 text-navy-500 shadow-md scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:text-navy-500 dark:hover:text-white'
            }`}
          >
            <span className="relative z-10">Completed</span>
            {filter === 'completed' && (
              <div className="absolute inset-0 bg-gold-500 rounded-button animate-pulse opacity-20"></div>
            )}
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-button font-bold transition-all relative min-h-[44px] min-w-[80px] text-sm sm:text-base whitespace-nowrap ${
              filter === 'all'
                ? 'bg-gold-500 text-navy-500 shadow-md scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:text-navy-500 dark:hover:text-white'
            }`}
          >
            <span className="relative z-10">All</span>
            {filter === 'all' && (
              <div className="absolute inset-0 bg-gold-500 rounded-button animate-pulse opacity-20"></div>
            )}
          </button>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="min-h-[500px]">
        {filteredMatches.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No matches found.</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                {filter === 'completed' && 'Check back after matches are played!'}
                {filter === 'upcoming' && 'All matches have been completed.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.map((match) => {
            const hasPredicted = userPredictions.some(p => p.matchId === match.id);
            const canPredict = predictableMatchIds.has(match.id);
            
            return (
              <MatchCard 
                key={match.id} 
                match={match} 
                showPredictButton={!!userEntry}
                canPredict={canPredict}
                hasPredicted={hasPredicted}
                allMatches={matches}
                userPredictions={userPredictions}
              />
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}

