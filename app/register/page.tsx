'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { getActiveTournament, getTeams, getUserEntry, createUserEntry } from '@/lib/firestore';
import { Loader2, Trophy, Check, Shield } from 'lucide-react';
import { Timestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Tournament, Team, Player } from '@/types';
import PlayerSearchSelect from '@/components/PlayerSearchSelect';

export default function RegisterPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  
  // Tournament predictions
  const [playerOfTournament, setPlayerOfTournament] = useState<{ id: string; name: string } | null>(null);
  const [highestWicketTaker, setHighestWicketTaker] = useState<{ id: string; name: string } | null>(null);
  const [highestRunScorer, setHighestRunScorer] = useState<{ id: string; name: string } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      // Pre-fill name from Google account if available
      if (user.displayName) {
        setUserName(user.displayName);
      }
      checkExistingEntry();
    }
  }, [user, authLoading, router]);

  async function checkExistingEntry() {
    try {
      if (!user) return;

      const entry = await getUserEntry(user.uid);
      if (entry) {
        router.push('/dashboard');
        return;
      }

      const activeTournament = await getActiveTournament();
      if (!activeTournament) {
        setError('No active tournament found');
        setLoading(false);
        return;
      }

      setTournament(activeTournament);
      const teamsData = await getTeams(activeTournament.id);
      setTeams(teamsData);
      
      // Load all players
      const playersSnapshot = await getDocs(collection(db, 'players'));
      const playersData = playersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Player));
      setPlayers(playersData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeam || !tournament || !user) return;
    
    // Validate name is provided
    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    // Validate all predictions are selected
    if (!playerOfTournament || !highestWicketTaker || !highestRunScorer) {
      setError('Please complete all tournament predictions');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const selectedTeamData = teams.find((t) => t.id === selectedTeam);
      if (!selectedTeamData) {
        throw new Error('Selected team not found');
      }

      await createUserEntry({
        userId: user.uid,
        tournamentId: tournament.id,
        userName: userName.trim(),
        userEmail: user.email || '',
        seasonTeamId: selectedTeam,
        seasonTeamName: selectedTeamData.name,
        
        // Tournament predictions
        playerOfTournamentId: playerOfTournament.id,
        playerOfTournamentName: playerOfTournament.name,
        highestWicketTakerId: highestWicketTaker.id,
        highestWicketTakerName: highestWicketTaker.name,
        highestRunScorerId: highestRunScorer.id,
        highestRunScorerName: highestRunScorer.name,
        
        totalPoints: 0,
        totalPenalties: 0,
        netPoints: 0,
        currentRank: 0,
        isPaid: true, // Since payments are manual, we set this to true
        createdAt: Timestamp.now(),
      });

      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating entry:', error);
      setError('Failed to register. Please try again.');
    } finally {
      setSubmitting(false);
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
      <div className="max-w-2xl mx-auto text-center py-12">
        <Trophy className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No Active Tournament
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          There are no tournaments available for registration at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <Trophy className="h-16 w-16 mx-auto text-primary-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Register for Tournament
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{tournament.name}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* User Name Input */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-navy-500 dark:text-white mb-4">
              Your Display Name
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              This name will be displayed on the leaderboard and throughout the tournament.
            </p>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-navy-400 rounded-button focus:border-gold-500 focus:outline-none dark:bg-navy-700 dark:text-white text-lg"
              maxLength={50}
              required
            />
            {user?.displayName && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                ℹ️ Pre-filled from your Google account. You can change it if you like.
              </p>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Select Your Season Team
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
              Choose one team as your "season team". You'll get bonus points when they win, but
              penalties when they lose. Choose wisely!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setSelectedTeam(team.id)}
                  className={`relative overflow-hidden rounded-card transition-all shadow-card hover:shadow-card-hover ${
                    selectedTeam === team.id
                      ? 'ring-4 ring-gold-500 scale-105'
                      : 'hover:scale-102'
                  }`}
                >
                  {selectedTeam === team.id && (
                    <div className="absolute top-3 right-3 z-10 bg-gold-500 rounded-full p-1.5 shadow-lg">
                      <Check className="h-5 w-5 text-navy-500" />
                    </div>
                  )}
                  
                  {/* Team Logo/Badge Section */}
                  <div 
                    className="p-8 flex items-center justify-center"
                    style={{ 
                      background: `linear-gradient(135deg, ${team.primaryColor} 0%, ${team.secondaryColor} 100%)` 
                    }}
                  >
                    {team.logoUrl ? (
                      <div className="bg-white rounded-full p-2 shadow-lg">
                        <img 
                          src={team.logoUrl} 
                          alt={team.name}
                          className="h-24 w-24 object-cover rounded-full"
                        />
                      </div>
                    ) : (
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                        <Shield className="h-12 w-12 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Team Name Section */}
                  <div className="bg-white dark:bg-gray-800 p-4">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white text-center">
                      {team.name}
                    </h3>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tournament Predictions */}
          <div className="mb-8 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Tournament Predictions
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
              Predict the tournament winners for bonus points. These predictions cannot be changed after registration.
            </p>

            <PlayerSearchSelect
              players={players}
              teams={teams}
              selectedPlayerId={playerOfTournament?.id || null}
              onSelect={(id, name) => setPlayerOfTournament({ id, name })}
              label="🏆 Player of The Tournament"
              placeholder="Search for your pick..."
            />

            <PlayerSearchSelect
              players={players}
              teams={teams}
              selectedPlayerId={highestRunScorer?.id || null}
              onSelect={(id, name) => setHighestRunScorer({ id, name })}
              label="🏏 Highest Run Scorer"
              placeholder="Search for your pick..."
            />

            <PlayerSearchSelect
              players={players}
              teams={teams}
              selectedPlayerId={highestWicketTaker?.id || null}
              onSelect={(id, name) => setHighestWicketTaker({ id, name })}
              label="🎯 Highest Wicket Taker"
              placeholder="Search for your pick..."
            />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-lg">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-400 dark:border-blue-600 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">Important:</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Your display name will appear on the leaderboard for all participants to see</li>
              <li>• Your season team and tournament predictions <strong>cannot be changed</strong> after registration</li>
              <li>• You get <strong>+1 bonus point</strong> when your team wins (if you predicted correctly)</li>
              <li>• You get <strong>-1 penalty point</strong> when your team loses (regardless of your prediction)</li>
              <li>• Bonus points awarded at tournament end for correct tournament predictions</li>
              <li>• Payment ($50) will be collected manually</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={!userName.trim() || !selectedTeam || !playerOfTournament || !highestWicketTaker || !highestRunScorer || submitting}
            className="w-full px-6 py-4 bg-gold-500 text-navy-500 rounded-button hover:bg-gold-400 transition disabled:opacity-50 disabled:cursor-not-allowed font-black text-lg shadow-lg hover:shadow-xl"
          >
            {submitting ? (
              <span className="flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Registering...
              </span>
            ) : (
              'Complete Registration'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

