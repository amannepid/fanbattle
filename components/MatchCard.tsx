'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { Calendar, Clock, Trophy, Lock } from 'lucide-react';
import Link from 'next/link';
import type { Match, Prediction } from '@/types';
import { shouldBlockMatchAt8PMCST, getNepalDay } from '@/lib/prediction-rules';

interface MatchCardProps {
  match: Match;
  showPredictButton?: boolean;
  canPredict?: boolean;
  hasPredicted?: boolean;
  allMatches?: Match[];
  userPredictions?: Prediction[];
}

export default function MatchCard({ 
  match, 
  showPredictButton = true,
  canPredict = true,
  hasPredicted = false,
  allMatches = []
}: MatchCardProps) {
  const matchDate = match.matchDate.toDate();
  const now = new Date();
  
  // Helper function to get first match of the day for a given match (using Nepal Time)
  function getFirstMatchOfDay(match: Match): Match | null {
    if (!allMatches || allMatches.length === 0) return null;
    
    const matchDate = match.matchDate.toDate();
    const dayKey = getNepalDay(matchDate).toISOString();
    
    // Include both upcoming and completed matches to get the actual first match of the Nepal day
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
  }
  
  // Check 8 PM CST cutoff for matches on the same Nepal day as the "next" match
  const shouldBlock = allMatches && allMatches.length > 0 
    ? shouldBlockMatchAt8PMCST(match, allMatches)
    : false;
  
  // Calculate deadline and isPastDeadline using the same logic as other pages
  let deadline: Date;
  let isPastDeadline: boolean;
  
  if (shouldBlock) {
    // Block matches on the same Nepal day after 8 PM CST cutoff
    isPastDeadline = true;
    // Set deadline to 8 PM CST for display
    deadline = new Date(now);
    deadline.setHours(20, 0, 0, 0); // 8 PM CST
  } else {
    // All matches: 6 hours before first match of the day
    const firstMatchOfDay = getFirstMatchOfDay(match);
    if (!firstMatchOfDay) {
      // Fallback to stored deadline if we can't determine first match
      deadline = match.deadline.toDate();
      isPastDeadline = deadline < now;
    } else {
      const firstMatchStartTime = firstMatchOfDay.matchDate.toDate();
      
      // If the first match of the day is already completed or started, editing should be blocked
      if (firstMatchOfDay.status === 'completed' || now >= firstMatchStartTime) {
        isPastDeadline = true;
        deadline = firstMatchStartTime; // Use first match start time for display
      } else {
        // Edit cutoff is 6 hours before first match start time
        deadline = new Date(firstMatchStartTime);
        deadline.setHours(deadline.getHours() - 6);
        isPastDeadline = now >= deadline;
      }
    }
  }

  return (
    <div className="bg-white dark:bg-navy-600 rounded-card shadow-card hover:shadow-card-hover transition-all p-4 sm:p-6 border border-slate-100 dark:border-navy-400">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm text-navy-500 dark:text-slate-100 min-w-0 truncate">
          <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-gold-500 flex-shrink-0" />
          <span className="font-bold capitalize whitespace-nowrap">{match.matchType}</span>
          <span className="whitespace-nowrap">•</span>
          <span className="whitespace-nowrap">Match {match.matchNumber}</span>
        </div>
        <span
          className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-button text-[10px] sm:text-xs font-bold whitespace-nowrap ${
            match.status === 'completed'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : match.status === 'live'
              ? 'bg-crimson-500 text-white'
              : 'bg-cool-100 text-cool-700'
          }`}
        >
          {match.status}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3 md:gap-4 items-start mb-3 sm:mb-4">
        {/* Team A */}
        <div className="flex flex-col items-center">
          <div className="flex justify-center mb-2 sm:mb-3">
            {match.teamALogoUrl ? (
              <img 
                src={match.teamALogoUrl} 
                alt={match.teamAName}
                className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 object-cover rounded-full border-2 border-gray-200 dark:border-gray-700 shadow-md"
              />
            ) : (
              <div className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full border-2 border-gray-300 dark:border-gray-600 shadow-md bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                <span className="text-xl sm:text-2xl font-bold text-gray-400 dark:text-gray-500">?</span>
              </div>
            )}
          </div>
          <div className="text-center h-16 sm:h-20 flex flex-col justify-center px-1 sm:px-2 min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1 line-clamp-2 leading-tight truncate">
              {match.teamAName}
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase truncate">{match.teamAId}</p>
          </div>
        </div>

        {/* VS Divider */}
        <div className="flex flex-col items-center justify-start pt-7 sm:pt-8 md:pt-10 px-1 sm:px-2 md:px-3">
          <div className="text-lg sm:text-xl font-bold text-gray-400 dark:text-gray-500">VS</div>
        </div>

        {/* Team B */}
        <div className="flex flex-col items-center">
          <div className="flex justify-center mb-2 sm:mb-3">
            {match.teamBLogoUrl ? (
              <img 
                src={match.teamBLogoUrl} 
                alt={match.teamBName}
                className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 object-cover rounded-full border-2 border-gray-200 dark:border-gray-700 shadow-md"
              />
            ) : (
              <div className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full border-2 border-gray-300 dark:border-gray-600 shadow-md bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                <span className="text-xl sm:text-2xl font-bold text-gray-400 dark:text-gray-500">?</span>
              </div>
            )}
          </div>
          <div className="text-center h-16 sm:h-20 flex flex-col justify-center px-1 sm:px-2 min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1 line-clamp-2 leading-tight truncate">
              {match.teamBName}
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase truncate">{match.teamBId}</p>
          </div>
        </div>
      </div>

      {match.status === 'completed' && match.winnerName && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-xs sm:text-sm text-center">
            <span className="font-medium text-green-800 dark:text-green-200">
              Winner: {match.winnerName}
            </span>
          </p>
          {match.momName && (
            <p className="text-[10px] sm:text-xs text-center text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">
              Man of the Match: {match.momName}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
        <div className="flex items-center space-x-1 whitespace-nowrap">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>{format(matchDate, 'MMM dd, yyyy')}</span>
        </div>
        <div className="flex items-center space-x-1 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>{format(matchDate, 'h:mm a')}</span>
        </div>
      </div>

      {!isPastDeadline && match.status === 'upcoming' && (
        <div className="text-center text-xs sm:text-sm text-gold-500 font-bold mb-2 sm:mb-3">
          {formatDistanceToNow(deadline, { addSuffix: true })}
        </div>
      )}

      {showPredictButton && !isPastDeadline && match.status === 'upcoming' && (
        <>
          {hasPredicted ? (
            <Link
              href={`/predict/${match.id}`}
              className="block w-full text-center px-3 py-2.5 sm:px-4 sm:py-3 bg-cool-500 text-white rounded-button hover:bg-cool-400 transition font-bold shadow-md hover:shadow-lg min-h-[44px] text-sm sm:text-base"
            >
              ✓ Update Prediction
            </Link>
          ) : canPredict ? (
            <Link
              href={`/predict/${match.id}`}
              className="block w-full text-center px-3 py-2.5 sm:px-4 sm:py-3 bg-gold-500 text-navy-500 rounded-button hover:bg-gold-400 transition font-bold shadow-md hover:shadow-lg min-h-[44px] text-sm sm:text-base"
            >
              Make Prediction
            </Link>
          ) : (
            <div className="w-full text-center px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-100 dark:bg-navy-700 text-gray-500 dark:text-gray-400 rounded-button border-2 border-gray-300 dark:border-navy-500 min-h-[44px]">
              <div className="text-sm font-bold">🔒 Locked</div>
            </div>
          )}
        </>
      )}

      {showPredictButton && isPastDeadline && match.status === 'upcoming' && (
        <div className="flex flex-col items-center justify-center py-3 px-3 sm:py-4 sm:px-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-navy-800 dark:to-navy-900 rounded-lg border-2 border-gray-200 dark:border-navy-600">
          <div className="flex items-center space-x-1.5 sm:space-x-2 mb-0.5 sm:mb-1">
            <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500" />
            <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Predictions Closed
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 mt-0.5 sm:mt-1">
            Deadline has passed
          </p>
        </div>
      )}
    </div>
  );
}

