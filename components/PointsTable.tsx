'use client';

import { useState } from 'react';
import { calculatePointsTable, type TeamStanding } from '@/lib/points-table';
import type { Match, Team } from '@/types';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';

interface PointsTableProps {
  matches: Match[];
  teams: Team[];
  tournamentId: string;
}

export default function PointsTable({ matches, teams }: PointsTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const standings = calculatePointsTable(matches, teams);

  // Check if there are any completed league matches
  const hasCompletedMatches = matches.some(
    (match) => match.matchType === 'league' && match.status === 'completed' && match.winnerId
  );

  if (!hasCompletedMatches) {
    return (
      <div className="bg-white dark:bg-navy-600 rounded-card shadow-card border border-slate-200 dark:border-navy-400 p-4 sm:p-6">
        <div className="flex items-center space-x-2 mb-3 sm:mb-4">
          <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-gold-500" />
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Points Table</h3>
        </div>
        <div className="text-center py-6 sm:py-8">
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            No matches completed yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-navy-600 rounded-card shadow-card border border-slate-200 dark:border-navy-400 p-3 sm:p-4 lg:p-6">
      <div className="flex items-center space-x-2 mb-3 sm:mb-4">
        <Trophy className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-gold-500 flex-shrink-0" />
        <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white">Points Table</h3>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-xs lg:text-sm">
          <thead>
            <tr className="border-b-2 border-navy-500 dark:border-gold-500">
              <th className="text-left py-2 px-2 font-bold text-navy-700 dark:text-gold-400">Pos</th>
              <th className="text-left py-2 px-2 font-bold text-navy-700 dark:text-gold-400">Team</th>
              <th className="text-center py-2 px-2 font-bold text-navy-700 dark:text-gold-400">M</th>
              <th className="text-center py-2 px-2 font-bold text-navy-700 dark:text-gold-400">W</th>
              <th className="text-center py-2 px-2 font-bold text-navy-700 dark:text-gold-400">L</th>
              <th className="text-center py-2 px-2 font-bold text-navy-700 dark:text-gold-400">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing) => {
              const isTopFour = standing.position <= 4;
              return (
                <tr
                  key={standing.teamId}
                  className={`border-b border-slate-200 dark:border-navy-500 transition-colors ${
                    isTopFour
                      ? 'bg-gradient-to-r from-gold-50 to-gold-100 dark:from-gold-900/20 dark:to-gold-800/20'
                      : 'hover:bg-slate-50 dark:hover:bg-navy-700'
                  }`}
                >
                  <td className="py-2 px-2 font-bold text-gray-900 dark:text-white">
                    {standing.position}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      {standing.teamLogoUrl ? (
                        <img
                          src={standing.teamLogoUrl}
                          alt={standing.teamName}
                          className="h-6 w-6 lg:h-8 lg:w-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-6 w-6 lg:h-8 lg:w-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] lg:text-xs font-bold text-gray-400 dark:text-gray-500">
                            {standing.teamShortCode.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {standing.teamShortCode}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center text-gray-700 dark:text-gray-300">
                    {standing.matches}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-700 dark:text-gray-300">
                    {standing.won}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-700 dark:text-gray-300">
                    {standing.lost}
                  </td>
                  <td className="py-2 px-2 text-center font-bold text-navy-700 dark:text-gold-400">
                    {standing.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View - Collapsible */}
      <div className="lg:hidden space-y-2">
        {/* Show first team when collapsed, all teams when expanded */}
        {(isExpanded ? standings : standings.slice(0, 1)).map((standing) => {
          const isTopFour = standing.position <= 4;
          return (
            <div
              key={standing.teamId}
              className={`p-3 rounded-lg border ${
                isTopFour
                  ? 'bg-gradient-to-r from-gold-50 to-gold-100 dark:from-gold-900/20 dark:to-gold-800/20 border-gold-300 dark:border-gold-600'
                  : 'bg-slate-50 dark:bg-navy-700 border-slate-200 dark:border-navy-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <span className="text-sm font-bold text-gray-900 dark:text-white w-6 flex-shrink-0">
                    #{standing.position}
                  </span>
                  {standing.teamLogoUrl ? (
                    <img
                      src={standing.teamLogoUrl}
                      alt={standing.teamName}
                      className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                        {standing.teamShortCode.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {standing.teamName}
                  </span>
                </div>
                <div className="text-sm font-bold text-navy-700 dark:text-gold-400 flex-shrink-0">
                  {standing.points} pts
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-3">
                  <span>M: {standing.matches}</span>
                  <span>W: {standing.won}</span>
                  <span>L: {standing.lost}</span>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Expand/Collapse Button - Only show if there are more than 1 team */}
        {standings.length > 1 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
            className="w-full p-3 rounded-lg border-2 border-navy-500 dark:border-gold-500 bg-white dark:bg-navy-600 hover:bg-navy-50 dark:hover:bg-navy-700 active:bg-navy-100 dark:active:bg-navy-800 transition-colors flex items-center justify-center space-x-2 font-bold text-navy-700 dark:text-gold-400 min-h-[44px] text-sm"
          >
            <span>{isExpanded ? 'Show Less' : `Show All ${standings.length} Teams`}</span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 flex-shrink-0 text-navy-700 dark:text-gold-400" />
            ) : (
              <ChevronDown className="h-5 w-5 flex-shrink-0 text-navy-700 dark:text-gold-400" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

