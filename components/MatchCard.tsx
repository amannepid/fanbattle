'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { Calendar, Clock, Trophy } from 'lucide-react';
import Link from 'next/link';
import type { Match, Prediction } from '@/types';

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
  hasPredicted = false
}: MatchCardProps) {
  const matchDate = match.matchDate.toDate();
  const now = new Date();
  
  // SPECIAL CASE: Match 1 uses 18-hour window from now (production exception)
  let deadline: Date;
  let isPastDeadline: boolean;
  
  if (match.matchNumber === 1) {
    // For Match 1, deadline is 18 hours from now (not from match start)
    deadline = new Date(now);
    deadline.setHours(deadline.getHours() + 18);
    const hoursUntilMatch = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    // Match 1 is available if it's in the future and within 18 hours from now
    isPastDeadline = hoursUntilMatch <= 0 || hoursUntilMatch > 18;
  } else {
    // For other matches, use the stored deadline
    deadline = match.deadline.toDate();
    isPastDeadline = deadline < now;
  }

  return (
    <div className="bg-white dark:bg-navy-600 rounded-card shadow-card hover:shadow-card-hover transition-all p-6 border border-slate-100 dark:border-navy-400">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-sm text-navy-500 dark:text-slate-100">
          <Trophy className="h-4 w-4 text-gold-500" />
          <span className="font-bold capitalize">{match.matchType}</span>
          <span>•</span>
          <span>Match {match.matchNumber}</span>
        </div>
        <span
          className={`px-3 py-1 rounded-button text-xs font-bold ${
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

      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start mb-4">
        {/* Team A */}
        <div className="flex flex-col items-center">
          <div className="flex justify-center mb-3">
            {match.teamALogoUrl ? (
              <img 
                src={match.teamALogoUrl} 
                alt={match.teamAName}
                className="h-20 w-20 object-cover rounded-full border-2 border-gray-200 dark:border-gray-700 shadow-md"
              />
            ) : (
              <div className="h-20 w-20 rounded-full border-2 border-gray-300 dark:border-gray-600 shadow-md bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-400 dark:text-gray-500">?</span>
              </div>
            )}
          </div>
          <div className="text-center h-20 flex flex-col justify-center px-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 line-clamp-2 leading-tight">
              {match.teamAName}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">{match.teamAId}</p>
          </div>
        </div>

        {/* VS Divider */}
        <div className="flex flex-col items-center justify-start pt-10 px-3">
          <div className="text-xl font-bold text-gray-400 dark:text-gray-500">VS</div>
        </div>

        {/* Team B */}
        <div className="flex flex-col items-center">
          <div className="flex justify-center mb-3">
            {match.teamBLogoUrl ? (
              <img 
                src={match.teamBLogoUrl} 
                alt={match.teamBName}
                className="h-20 w-20 object-cover rounded-full border-2 border-gray-200 dark:border-gray-700 shadow-md"
              />
            ) : (
              <div className="h-20 w-20 rounded-full border-2 border-gray-300 dark:border-gray-600 shadow-md bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-400 dark:text-gray-500">?</span>
              </div>
            )}
          </div>
          <div className="text-center h-20 flex flex-col justify-center px-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 line-clamp-2 leading-tight">
              {match.teamBName}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">{match.teamBId}</p>
          </div>
        </div>
      </div>

      {match.status === 'completed' && match.winnerName && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-center">
            <span className="font-medium text-green-800 dark:text-green-200">
              Winner: {match.winnerName}
            </span>
          </p>
          {match.momName && (
            <p className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">
              Man of the Match: {match.momName}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <div className="flex items-center space-x-1">
          <Calendar className="h-4 w-4" />
          <span>{format(matchDate, 'MMM dd, yyyy')}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4" />
          <span>{format(matchDate, 'h:mm a')}</span>
        </div>
      </div>

      {!isPastDeadline && match.status === 'upcoming' && (
        <div className="text-center text-sm text-gold-500 font-bold mb-3">
          {formatDistanceToNow(deadline, { addSuffix: true })}
        </div>
      )}

      {showPredictButton && !isPastDeadline && match.status === 'upcoming' && (
        <>
          {hasPredicted ? (
            <Link
              href={`/predict/${match.id}`}
              className="block w-full text-center px-4 py-3 bg-cool-500 text-white rounded-button hover:bg-cool-400 transition font-bold shadow-md hover:shadow-lg"
            >
              ✓ Update Prediction
            </Link>
          ) : canPredict ? (
            <Link
              href={`/predict/${match.id}`}
              className="block w-full text-center px-4 py-3 bg-gold-500 text-navy-500 rounded-button hover:bg-gold-400 transition font-bold shadow-md hover:shadow-lg"
            >
              Make Prediction
            </Link>
          ) : (
            <div className="w-full text-center px-4 py-3 bg-gray-100 dark:bg-navy-700 text-gray-500 dark:text-gray-400 rounded-button border-2 border-gray-300 dark:border-navy-500">
              <div className="text-sm font-bold">🔒 Locked</div>
            </div>
          )}
        </>
      )}

      {showPredictButton && isPastDeadline && match.status === 'upcoming' && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-3">
          Predictions closed
        </div>
      )}
    </div>
  );
}

