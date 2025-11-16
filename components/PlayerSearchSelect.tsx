'use client';

import { useState, useEffect } from 'react';
import { Player, Team } from '@/types';
import { Search, X } from 'lucide-react';

interface PlayerSearchSelectProps {
  players: Player[];
  teams: Team[];
  selectedPlayerId: string | null;
  onSelect: (playerId: string, playerName: string) => void;
  label: string;
  placeholder?: string;
}

export default function PlayerSearchSelect({
  players,
  teams,
  selectedPlayerId,
  onSelect,
  label,
  placeholder = 'Search player name...'
}: PlayerSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const selectedTeam = selectedPlayer ? teams.find(t => t.id === selectedPlayer.teamId) : null;

  // Filter players based on search term
  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (player: Player) => {
    onSelect(player.id, player.name);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onSelect('', '');
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <label className="block text-sm font-bold text-navy-500 dark:text-slate-100 mb-2">
        {label}
      </label>
      
      {/* Selected Player Display */}
      {selectedPlayer ? (
        <div className="flex items-center justify-between bg-white dark:bg-navy-600 border-2 border-gold-500 rounded-button p-3 shadow-card">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cool-500 to-navy-500 flex items-center justify-center text-white font-bold">
                {selectedPlayer.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div>
              <p className="font-bold text-navy-500 dark:text-white">{selectedPlayer.name}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {selectedTeam?.name || 'Unknown Team'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-navy-500 rounded transition"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      ) : (
        /* Search Button */
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between bg-white dark:bg-navy-600 border-2 border-gray-300 dark:border-navy-400 rounded-button p-3 hover:border-gold-500 transition"
        >
          <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
          <Search className="h-5 w-5 text-gray-400" />
        </button>
      )}

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-navy-600 rounded-card shadow-glass max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-navy-400">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-navy-500 dark:text-white">{label}</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-navy-500 rounded transition"
                >
                  <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type player name..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 dark:border-navy-400 rounded-button focus:border-gold-500 focus:outline-none dark:bg-navy-700 dark:text-white"
                  autoFocus
                />
              </div>
            </div>

            {/* Player List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No players found matching &quot;{searchTerm}&quot;
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {filteredPlayers.map((player) => {
                    const team = teams.find(t => t.id === player.teamId);
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => handleSelect(player)}
                        className="flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-navy-700 rounded-button transition text-left"
                      >
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cool-500 to-navy-500 flex items-center justify-center text-white font-bold">
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-navy-500 dark:text-white truncate">
                            {player.name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {team?.name || 'Unknown Team'}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-xs px-2 py-1 bg-cool-100 dark:bg-cool-900 text-cool-700 dark:text-cool-300 rounded">
                          {player.role}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-navy-400">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

