'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { getActiveTournament, getLeaderboard, getAllPredictions, getMatches, getTeams } from '@/lib/firestore';
import { Loader2, Users, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { Tournament, UserEntry, Prediction, Match } from '@/types';

// TEMPORARY: Set to true to use mock data for testing
// NOTE: Keep this as false for production. Set to true locally for testing only.
const USE_MOCK_DATA = false;

interface PredictionWithUser {
  prediction: Prediction;
  userEntry: UserEntry;
  match: Match;
}

export default function BattleGroundPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [predictionsWithUsers, setPredictionsWithUsers] = useState<PredictionWithUser[]>([]);
  const [matches, setMatches] = useState<Map<string, Match>>(new Map());
  const [teams, setTeams] = useState<Map<string, { name: string; shortCode: string }>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, authLoading, router]);

  // Helper function to get start of day
  function getStartOfDay(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  // Helper function to get first match of the day for a given match
  function getFirstMatchOfDay(match: Match, allMatches: Match[]): Match | null {
    const matchDate = match.matchDate.toDate();
    const dayKey = getStartOfDay(matchDate).toISOString();
    
    // Include both upcoming and completed matches to get the actual first match of the day
    const sameDayMatches = allMatches.filter((m) => {
      const mDate = m.matchDate.toDate();
      const mDayKey = getStartOfDay(mDate).toISOString();
      return mDayKey === dayKey;
    });
    
    if (sameDayMatches.length === 0) return null;
    
    // Sort by match date and return the first one (regardless of status)
    sameDayMatches.sort((a, b) => 
      a.matchDate.toDate().getTime() - b.matchDate.toDate().getTime()
    );
    
    return sameDayMatches[0];
  }

  // Check if prediction should be visible (completed or past edit cutoff)
  function isPredictionVisible(prediction: Prediction, match: Match, allMatches: Match[]): boolean {
    // If match is completed, always show
    if (match.status === 'completed') {
      return true;
    }

    // If match is upcoming, check if past edit cutoff
    if (match.status === 'upcoming') {
      const now = new Date();
      
      // SPECIAL CASE: Match 1 uses 18-hour window from now (production exception)
      if (match.matchNumber === 1) {
        const match1Date = match.matchDate.toDate();
        const hoursUntilMatch1 = (match1Date.getTime() - now.getTime()) / (1000 * 60 * 60);
        // Match 1 is visible if it's in the future and within 18 hours from now
        return hoursUntilMatch1 > 0 && hoursUntilMatch1 <= 18;
      }
      
      // Other matches: 6 hours before first match of day
      const firstMatchOfDay = getFirstMatchOfDay(match, allMatches);
      if (!firstMatchOfDay) return false;

      const firstMatchStartTime = firstMatchOfDay.matchDate.toDate();
      
      // If first match is already completed or started, predictions should be visible
      if (firstMatchOfDay.status === 'completed' || now >= firstMatchStartTime) {
        return true;
      }
      
      const editCutoffTime = new Date(firstMatchStartTime);
      editCutoffTime.setHours(editCutoffTime.getHours() - 6);

      return now >= editCutoffTime;
    }

    return false;
  }

  // Format prediction in copy-paste format (without match info)
  function formatPrediction(prediction: Prediction, match: Match): string {
    const teamA = teams.get(match.teamAId);
    const teamB = teams.get(match.teamBId);
    const winnerTeam = teams.get(prediction.predictedWinnerId);
    
    const teamAShortCode = teamA?.shortCode || match.teamAName;
    const teamBShortCode = teamB?.shortCode || match.teamBName;
    const winnerShortCode = winnerTeam?.shortCode || prediction.predictedWinnerName || 'N/A';
    
    let content = `Winner: ${winnerShortCode}\n`;
    
    // Team A prediction
    if (prediction.teamAScoreCategory || prediction.teamAWickets !== undefined) {
      const scoreCat = prediction.teamAScoreCategory || '-';
      const wickets = prediction.teamAWickets !== undefined ? prediction.teamAWickets : '-';
      content += `${teamAShortCode} / ${scoreCat} / ${wickets}\n`;
    }
    
    // Team B prediction
    if (prediction.teamBScoreCategory || prediction.teamBWickets !== undefined) {
      const scoreCat = prediction.teamBScoreCategory || '-';
      const wickets = prediction.teamBWickets !== undefined ? prediction.teamBWickets : '-';
      content += `${teamBShortCode} / ${scoreCat} / ${wickets}\n`;
    }
    
    // MoM
    if (prediction.predictedPomName) {
      content += `MoM: ${prediction.predictedPomName}`;
    }
    
    return content;
  }

  // Generate mock data for testing
  function generateMockData(currentUserId: string | undefined) {
    const mockMatches: Match[] = [
      {
        id: 'match-1',
        tournamentId: 'tournament-1',
        matchNumber: 1,
        matchType: 'league',
        teamAId: 'team-1',
        teamBId: 'team-2',
        teamAName: 'Kathmandu Gorkhas',
        teamBName: 'Pokhara Avengers',
        matchDate: Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)), // 2 days from now
        deadline: Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)),
        status: 'upcoming',
      },
      {
        id: 'match-2',
        tournamentId: 'tournament-1',
        matchNumber: 2,
        matchType: 'league',
        teamAId: 'team-3',
        teamBId: 'team-4',
        teamAName: 'Biratnagar Kings',
        teamBName: 'Chitwan Rhinos',
        matchDate: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)), // 3 days from now
        deadline: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
        status: 'upcoming',
      },
      {
        id: 'match-3',
        tournamentId: 'tournament-1',
        matchNumber: 3,
        matchType: 'league',
        teamAId: 'team-5',
        teamBId: 'team-6',
        teamAName: 'Janakpur Bolts',
        teamBName: 'Lumbini Lions',
        matchDate: Timestamp.fromDate(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)), // 4 days from now
        deadline: Timestamp.fromDate(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)),
        status: 'upcoming',
      },
      {
        id: 'match-4',
        tournamentId: 'tournament-1',
        matchNumber: 4,
        matchType: 'league',
        teamAId: 'team-1',
        teamBId: 'team-3',
        teamAName: 'Kathmandu Gorkhas',
        teamBName: 'Biratnagar Kings',
        matchDate: Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)), // 5 days from now
        deadline: Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
        status: 'upcoming',
      },
      {
        id: 'match-5',
        tournamentId: 'tournament-1',
        matchNumber: 5,
        matchType: 'qualifier',
        teamAId: 'team-2',
        teamBId: 'team-4',
        teamAName: 'Pokhara Avengers',
        teamBName: 'Chitwan Rhinos',
        matchDate: Timestamp.fromDate(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)), // 6 days from now
        deadline: Timestamp.fromDate(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)),
        status: 'upcoming',
      },
      {
        id: 'match-6',
        tournamentId: 'tournament-1',
        matchNumber: 6,
        matchType: 'eliminator',
        teamAId: 'team-5',
        teamBId: 'team-6',
        teamAName: 'Janakpur Bolts',
        teamBName: 'Lumbini Lions',
        matchDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days from now
        deadline: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        status: 'upcoming',
      },
    ];

    const firstUserId = currentUserId || 'user-1';
    const mockUserEntries: UserEntry[] = [
      {
        id: firstUserId,
        userId: firstUserId,
        tournamentId: 'tournament-1',
        userName: currentUserId ? 'You (Test User)' : 'Rajesh Kumar',
        userEmail: currentUserId ? 'you@example.com' : 'rajesh@example.com',
        seasonTeamId: 'team-1',
        seasonTeamName: 'Kathmandu Gorkhas',
        totalPoints: 45,
        totalPenalties: 4,
        netPoints: 41,
        currentRank: 1,
        isPaid: true,
        createdAt: Timestamp.now(),
      },
      {
        id: 'user-2',
        userId: 'user-2',
        tournamentId: 'tournament-1',
        userName: 'Priya Sharma',
        userEmail: 'priya@example.com',
        seasonTeamId: 'team-2',
        seasonTeamName: 'Pokhara Avengers',
        totalPoints: 38,
        totalPenalties: 2,
        netPoints: 36,
        currentRank: 2,
        isPaid: true,
        createdAt: Timestamp.now(),
      },
      {
        id: 'user-3',
        userId: 'user-3',
        tournamentId: 'tournament-1',
        userName: 'Amit Singh',
        userEmail: 'amit@example.com',
        seasonTeamId: 'team-3',
        seasonTeamName: 'Biratnagar Kings',
        totalPoints: 32,
        totalPenalties: 6,
        netPoints: 26,
        currentRank: 3,
        isPaid: true,
        createdAt: Timestamp.now(),
      },
      {
        id: 'user-4',
        userId: 'user-4',
        tournamentId: 'tournament-1',
        userName: 'Sita Thapa',
        userEmail: 'sita@example.com',
        seasonTeamId: 'team-4',
        seasonTeamName: 'Chitwan Rhinos',
        totalPoints: 28,
        totalPenalties: 4,
        netPoints: 24,
        currentRank: 4,
        isPaid: true,
        createdAt: Timestamp.now(),
      },
      {
        id: 'user-5',
        userId: 'user-5',
        tournamentId: 'tournament-1',
        userName: 'Nabin Gurung',
        userEmail: 'nabin@example.com',
        seasonTeamId: 'team-5',
        seasonTeamName: 'Janakpur Bolts',
        totalPoints: 25,
        totalPenalties: 8,
        netPoints: 17,
        currentRank: 5,
        isPaid: true,
        createdAt: Timestamp.now(),
      },
      {
        id: 'user-6',
        userId: 'user-6',
        tournamentId: 'tournament-1',
        userName: 'Sunita Rai',
        userEmail: 'sunita@example.com',
        seasonTeamId: 'team-6',
        seasonTeamName: 'Lumbini Lions',
        totalPoints: 22,
        totalPenalties: 6,
        netPoints: 16,
        currentRank: 6,
        isPaid: true,
        createdAt: Timestamp.now(),
      },
      {
        id: 'user-7',
        userId: 'user-7',
        tournamentId: 'tournament-1',
        userName: 'Bikash Tamang',
        userEmail: 'bikash@example.com',
        seasonTeamId: 'team-1',
        seasonTeamName: 'Kathmandu Gorkhas',
        totalPoints: 20,
        totalPenalties: 10,
        netPoints: 10,
        currentRank: 7,
        isPaid: true,
        createdAt: Timestamp.now(),
      },
    ];

    const now = Date.now();
    const mockPredictions: Prediction[] = [];
    
    // Match 1 predictions (multiple users, different submission times)
    mockPredictions.push(
      {
        id: `${firstUserId}_match-1`,
        userId: firstUserId,
        matchId: 'match-1',
        matchNumber: 1,
        predictedWinnerId: 'team-1',
        predictedWinnerName: 'Kathmandu Gorkhas',
        predictedPomId: 'pom-1',
        predictedPomName: 'Player A',
        teamAScoreCategory: 'C',
        teamAWickets: 6,
        teamBScoreCategory: 'D',
        teamBWickets: 7,
        submittedAt: Timestamp.fromDate(new Date(now - 5 * 60 * 60 * 1000)), // 5 hours ago (oldest)
      },
      {
        id: 'user-2_match-1',
        userId: 'user-2',
        matchId: 'match-1',
        matchNumber: 1,
        predictedWinnerId: 'team-2',
        predictedWinnerName: 'Pokhara Avengers',
        predictedPomId: 'pom-2',
        predictedPomName: 'Player B',
        teamAScoreCategory: 'B',
        teamAWickets: 5,
        teamBScoreCategory: 'C',
        teamBWickets: 6,
        submittedAt: Timestamp.fromDate(new Date(now - 3 * 60 * 60 * 1000)), // 3 hours ago
      },
      {
        id: 'user-3_match-1',
        userId: 'user-3',
        matchId: 'match-1',
        matchNumber: 1,
        predictedWinnerId: 'team-1',
        predictedWinnerName: 'Kathmandu Gorkhas',
        predictedPomId: 'pom-3',
        predictedPomName: 'Player C',
        teamAScoreCategory: 'D',
        teamAWickets: 8,
        teamBScoreCategory: 'E',
        teamBWickets: 7,
        submittedAt: Timestamp.fromDate(new Date(now - 2 * 60 * 60 * 1000)), // 2 hours ago
      },
      {
        id: 'user-4_match-1',
        userId: 'user-4',
        matchId: 'match-1',
        matchNumber: 1,
        predictedWinnerId: 'team-2',
        predictedWinnerName: 'Pokhara Avengers',
        predictedPomId: 'pom-4',
        predictedPomName: 'Player D',
        teamAScoreCategory: 'C',
        teamAWickets: 7,
        teamBScoreCategory: 'C',
        teamBWickets: 6,
        submittedAt: Timestamp.fromDate(new Date(now - 1 * 60 * 60 * 1000)), // 1 hour ago
      },
      {
        id: 'user-5_match-1',
        userId: 'user-5',
        matchId: 'match-1',
        matchNumber: 1,
        predictedWinnerId: 'team-1',
        predictedWinnerName: 'Kathmandu Gorkhas',
        predictedPomId: 'pom-5',
        predictedPomName: 'Player E',
        teamAScoreCategory: 'E',
        teamAWickets: 5,
        teamBScoreCategory: 'D',
        teamBWickets: 8,
        submittedAt: Timestamp.fromDate(new Date(now - 30 * 60 * 1000)), // 30 minutes ago
      },
      {
        id: 'user-6_match-1',
        userId: 'user-6',
        matchId: 'match-1',
        matchNumber: 1,
        predictedWinnerId: 'team-2',
        predictedWinnerName: 'Pokhara Avengers',
        predictedPomId: 'pom-6',
        predictedPomName: 'Player F',
        teamAScoreCategory: 'B',
        teamAWickets: 6,
        teamBScoreCategory: 'C',
        teamBWickets: 5,
        submittedAt: Timestamp.fromDate(new Date(now - 20 * 60 * 1000)), // 20 minutes ago
      },
      {
        id: 'user-7_match-1',
        userId: 'user-7',
        matchId: 'match-1',
        matchNumber: 1,
        predictedWinnerId: 'team-1',
        predictedWinnerName: 'Kathmandu Gorkhas',
        predictedPomId: 'pom-7',
        predictedPomName: 'Player G',
        teamAScoreCategory: 'D',
        teamAWickets: 7,
        teamBScoreCategory: 'E',
        teamBWickets: 6,
        submittedAt: Timestamp.fromDate(new Date(now - 10 * 60 * 1000)), // 10 minutes ago (latest)
      }
    );

    // Match 2 predictions
    mockPredictions.push(
      {
        id: `${firstUserId}_match-2`,
        userId: firstUserId,
        matchId: 'match-2',
        matchNumber: 2,
        predictedWinnerId: 'team-3',
        predictedWinnerName: 'Biratnagar Kings',
        predictedPomId: 'pom-6',
        predictedPomName: 'Player F',
        teamAScoreCategory: 'C',
        teamAWickets: 6,
        teamBScoreCategory: 'B',
        teamBWickets: 7,
        submittedAt: Timestamp.fromDate(new Date(now - 4 * 60 * 60 * 1000)),
      },
      {
        id: 'user-2_match-2',
        userId: 'user-2',
        matchId: 'match-2',
        matchNumber: 2,
        predictedWinnerId: 'team-4',
        predictedWinnerName: 'Chitwan Rhinos',
        predictedPomId: 'pom-7',
        predictedPomName: 'Player G',
        teamAScoreCategory: 'D',
        teamAWickets: 5,
        teamBScoreCategory: 'C',
        teamBWickets: 6,
        submittedAt: Timestamp.fromDate(new Date(now - 2 * 60 * 60 * 1000)),
      },
      {
        id: 'user-3_match-2',
        userId: 'user-3',
        matchId: 'match-2',
        matchNumber: 2,
        predictedWinnerId: 'team-3',
        predictedWinnerName: 'Biratnagar Kings',
        predictedPomId: 'pom-8',
        predictedPomName: 'Player H',
        teamAScoreCategory: 'B',
        teamAWickets: 8,
        teamBScoreCategory: 'D',
        teamBWickets: 7,
        submittedAt: Timestamp.fromDate(new Date(now - 1 * 60 * 60 * 1000)),
      },
      {
        id: 'user-4_match-2',
        userId: 'user-4',
        matchId: 'match-2',
        matchNumber: 2,
        predictedWinnerId: 'team-4',
        predictedWinnerName: 'Chitwan Rhinos',
        predictedPomId: 'pom-9',
        predictedPomName: 'Player I',
        teamAScoreCategory: 'E',
        teamAWickets: 6,
        teamBScoreCategory: 'C',
        teamBWickets: 5,
        submittedAt: Timestamp.fromDate(new Date(now - 45 * 60 * 1000)),
      },
      {
        id: 'user-5_match-2',
        userId: 'user-5',
        matchId: 'match-2',
        matchNumber: 2,
        predictedWinnerId: 'team-3',
        predictedWinnerName: 'Biratnagar Kings',
        predictedPomId: 'pom-10',
        predictedPomName: 'Player J',
        teamAScoreCategory: 'F',
        teamAWickets: 4,
        teamBScoreCategory: 'C',
        teamBWickets: 6,
        submittedAt: Timestamp.fromDate(new Date(now - 35 * 60 * 1000)),
      },
      {
        id: 'user-6_match-2',
        userId: 'user-6',
        matchId: 'match-2',
        matchNumber: 2,
        predictedWinnerId: 'team-4',
        predictedWinnerName: 'Chitwan Rhinos',
        predictedPomId: 'pom-11',
        predictedPomName: 'Player K',
        teamAScoreCategory: 'C',
        teamAWickets: 7,
        teamBScoreCategory: 'D',
        teamBWickets: 5,
        submittedAt: Timestamp.fromDate(new Date(now - 25 * 60 * 1000)),
      },
      {
        id: 'user-7_match-2',
        userId: 'user-7',
        matchId: 'match-2',
        matchNumber: 2,
        predictedWinnerId: 'team-3',
        predictedWinnerName: 'Biratnagar Kings',
        predictedPomId: 'pom-12',
        predictedPomName: 'Player L',
        teamAScoreCategory: 'D',
        teamAWickets: 6,
        teamBScoreCategory: 'B',
        teamBWickets: 8,
        submittedAt: Timestamp.fromDate(new Date(now - 15 * 60 * 1000)),
      }
    );

    // Match 3 predictions
    mockPredictions.push(
      {
        id: `${firstUserId}_match-3`,
        userId: firstUserId,
        matchId: 'match-3',
        matchNumber: 3,
        predictedWinnerId: 'team-5',
        predictedWinnerName: 'Janakpur Bolts',
        predictedPomId: 'pom-13',
        predictedPomName: 'Player M',
        teamAScoreCategory: 'F',
        teamAWickets: 4,
        teamBScoreCategory: 'C',
        teamBWickets: 7,
        submittedAt: Timestamp.fromDate(new Date(now - 3 * 60 * 60 * 1000)),
      },
      {
        id: 'user-2_match-3',
        userId: 'user-2',
        matchId: 'match-3',
        matchNumber: 3,
        predictedWinnerId: 'team-6',
        predictedWinnerName: 'Lumbini Lions',
        predictedPomId: 'pom-14',
        predictedPomName: 'Player N',
        teamAScoreCategory: 'C',
        teamAWickets: 6,
        teamBScoreCategory: 'D',
        teamBWickets: 8,
        submittedAt: Timestamp.fromDate(new Date(now - 1.5 * 60 * 60 * 1000)),
      },
      {
        id: 'user-3_match-3',
        userId: 'user-3',
        matchId: 'match-3',
        matchNumber: 3,
        predictedWinnerId: 'team-5',
        predictedWinnerName: 'Janakpur Bolts',
        predictedPomId: 'pom-15',
        predictedPomName: 'Player O',
        teamAScoreCategory: 'D',
        teamAWickets: 7,
        teamBScoreCategory: 'B',
        teamBWickets: 6,
        submittedAt: Timestamp.fromDate(new Date(now - 20 * 60 * 1000)),
      },
      // user-4 didn't predict match-3 (simulating missed prediction)
      {
        id: 'user-5_match-3',
        userId: 'user-5',
        matchId: 'match-3',
        matchNumber: 3,
        predictedWinnerId: 'team-6',
        predictedWinnerName: 'Lumbini Lions',
        predictedPomId: 'pom-17',
        predictedPomName: 'Player Q',
        teamAScoreCategory: 'C',
        teamAWickets: 5,
        teamBScoreCategory: 'E',
        teamBWickets: 7,
        submittedAt: Timestamp.fromDate(new Date(now - 10 * 60 * 1000)),
      },
      {
        id: 'user-6_match-3',
        userId: 'user-6',
        matchId: 'match-3',
        matchNumber: 3,
        predictedWinnerId: 'team-5',
        predictedWinnerName: 'Janakpur Bolts',
        predictedPomId: 'pom-18',
        predictedPomName: 'Player R',
        teamAScoreCategory: 'B',
        teamAWickets: 8,
        teamBScoreCategory: 'D',
        teamBWickets: 6,
        submittedAt: Timestamp.fromDate(new Date(now - 8 * 60 * 1000)),
      },
      {
        id: 'user-7_match-3',
        userId: 'user-7',
        matchId: 'match-3',
        matchNumber: 3,
        predictedWinnerId: 'team-5',
        predictedWinnerName: 'Janakpur Bolts',
        predictedPomId: 'pom-19',
        predictedPomName: 'Player S',
        teamAScoreCategory: 'F',
        teamAWickets: 3,
        teamBScoreCategory: 'C',
        teamBWickets: 8,
        submittedAt: Timestamp.fromDate(new Date(now - 5 * 60 * 1000)),
      }
    );

    // Match 4 predictions
    mockPredictions.push(
      {
        id: `${firstUserId}_match-4`,
        userId: firstUserId,
        matchId: 'match-4',
        matchNumber: 4,
        predictedWinnerId: 'team-1',
        predictedWinnerName: 'Kathmandu Gorkhas',
        predictedPomId: 'pom-20',
        predictedPomName: 'Player T',
        teamAScoreCategory: 'C',
        teamAWickets: 6,
        teamBScoreCategory: 'D',
        teamBWickets: 7,
        submittedAt: Timestamp.fromDate(new Date(now - 2.5 * 60 * 60 * 1000)),
      },
      {
        id: 'user-2_match-4',
        userId: 'user-2',
        matchId: 'match-4',
        matchNumber: 4,
        predictedWinnerId: 'team-3',
        predictedWinnerName: 'Biratnagar Kings',
        predictedPomId: 'pom-21',
        predictedPomName: 'Player U',
        teamAScoreCategory: 'E',
        teamAWickets: 5,
        teamBScoreCategory: 'C',
        teamBWickets: 6,
        submittedAt: Timestamp.fromDate(new Date(now - 1.2 * 60 * 60 * 1000)),
      },
      {
        id: 'user-3_match-4',
        userId: 'user-3',
        matchId: 'match-4',
        matchNumber: 4,
        predictedWinnerId: 'team-1',
        predictedWinnerName: 'Kathmandu Gorkhas',
        predictedPomId: 'pom-22',
        predictedPomName: 'Player V',
        teamAScoreCategory: 'D',
        teamAWickets: 7,
        teamBScoreCategory: 'B',
        teamBWickets: 8,
        submittedAt: Timestamp.fromDate(new Date(now - 50 * 60 * 1000)),
      },
      {
        id: 'user-4_match-4',
        userId: 'user-4',
        matchId: 'match-4',
        matchNumber: 4,
        predictedWinnerId: 'team-3',
        predictedWinnerName: 'Biratnagar Kings',
        predictedPomId: 'pom-23',
        predictedPomName: 'Player W',
        teamAScoreCategory: 'F',
        teamAWickets: 4,
        teamBScoreCategory: 'C',
        teamBWickets: 7,
        submittedAt: Timestamp.fromDate(new Date(now - 40 * 60 * 1000)),
      },
      {
        id: 'user-5_match-4',
        userId: 'user-5',
        matchId: 'match-4',
        matchNumber: 4,
        predictedWinnerId: 'team-1',
        predictedWinnerName: 'Kathmandu Gorkhas',
        predictedPomId: 'pom-24',
        predictedPomName: 'Player X',
        teamAScoreCategory: 'C',
        teamAWickets: 6,
        teamBScoreCategory: 'D',
        teamBWickets: 5,
        submittedAt: Timestamp.fromDate(new Date(now - 30 * 60 * 1000)),
      },
      {
        id: 'user-6_match-4',
        userId: 'user-6',
        matchId: 'match-4',
        matchNumber: 4,
        predictedWinnerId: 'team-3',
        predictedWinnerName: 'Biratnagar Kings',
        predictedPomId: 'pom-25',
        predictedPomName: 'Player Y',
        teamAScoreCategory: 'B',
        teamAWickets: 8,
        teamBScoreCategory: 'E',
        teamBWickets: 6,
        submittedAt: Timestamp.fromDate(new Date(now - 12 * 60 * 1000)),
      },
      {
        id: 'user-7_match-4',
        userId: 'user-7',
        matchId: 'match-4',
        matchNumber: 4,
        predictedWinnerId: 'team-1',
        predictedWinnerName: 'Kathmandu Gorkhas',
        predictedPomId: 'pom-26',
        predictedPomName: 'Player Z',
        teamAScoreCategory: 'D',
        teamAWickets: 7,
        teamBScoreCategory: 'C',
        teamBWickets: 6,
        submittedAt: Timestamp.fromDate(new Date(now - 6 * 60 * 1000)),
      }
    );

    // Match 5 predictions
    mockPredictions.push(
      {
        id: `${firstUserId}_match-5`,
        userId: firstUserId,
        matchId: 'match-5',
        matchNumber: 5,
        predictedWinnerId: 'team-2',
        predictedWinnerName: 'Pokhara Avengers',
        predictedPomId: 'pom-27',
        predictedPomName: 'Player AA',
        teamAScoreCategory: 'C',
        teamAWickets: 6,
        teamBScoreCategory: 'D',
        teamBWickets: 7,
        submittedAt: Timestamp.fromDate(new Date(now - 2 * 60 * 60 * 1000)),
      },
      {
        id: 'user-2_match-5',
        userId: 'user-2',
        matchId: 'match-5',
        matchNumber: 5,
        predictedWinnerId: 'team-4',
        predictedWinnerName: 'Chitwan Rhinos',
        predictedPomId: 'pom-28',
        predictedPomName: 'Player BB',
        teamAScoreCategory: 'E',
        teamAWickets: 5,
        teamBScoreCategory: 'C',
        teamBWickets: 6,
        submittedAt: Timestamp.fromDate(new Date(now - 1 * 60 * 60 * 1000)),
      },
      {
        id: 'user-3_match-5',
        userId: 'user-3',
        matchId: 'match-5',
        matchNumber: 5,
        predictedWinnerId: 'team-2',
        predictedWinnerName: 'Pokhara Avengers',
        predictedPomId: 'pom-29',
        predictedPomName: 'Player CC',
        teamAScoreCategory: 'F',
        teamAWickets: 4,
        teamBScoreCategory: 'B',
        teamBWickets: 8,
        submittedAt: Timestamp.fromDate(new Date(now - 45 * 60 * 1000)),
      },
      {
        id: 'user-4_match-5',
        userId: 'user-4',
        matchId: 'match-5',
        matchNumber: 5,
        predictedWinnerId: 'team-4',
        predictedWinnerName: 'Chitwan Rhinos',
        predictedPomId: 'pom-30',
        predictedPomName: 'Player DD',
        teamAScoreCategory: 'C',
        teamAWickets: 7,
        teamBScoreCategory: 'D',
        teamBWickets: 5,
        submittedAt: Timestamp.fromDate(new Date(now - 35 * 60 * 1000)),
      },
      {
        id: 'user-5_match-5',
        userId: 'user-5',
        matchId: 'match-5',
        matchNumber: 5,
        predictedWinnerId: 'team-2',
        predictedWinnerName: 'Pokhara Avengers',
        predictedPomId: 'pom-31',
        predictedPomName: 'Player EE',
        teamAScoreCategory: 'D',
        teamAWickets: 6,
        teamBScoreCategory: 'E',
        teamBWickets: 7,
        submittedAt: Timestamp.fromDate(new Date(now - 25 * 60 * 1000)),
      },
      {
        id: 'user-6_match-5',
        userId: 'user-6',
        matchId: 'match-5',
        matchNumber: 5,
        predictedWinnerId: 'team-4',
        predictedWinnerName: 'Chitwan Rhinos',
        predictedPomId: 'pom-32',
        predictedPomName: 'Player FF',
        teamAScoreCategory: 'B',
        teamAWickets: 8,
        teamBScoreCategory: 'C',
        teamBWickets: 6,
        submittedAt: Timestamp.fromDate(new Date(now - 14 * 60 * 1000)),
      },
      {
        id: 'user-7_match-5',
        userId: 'user-7',
        matchId: 'match-5',
        matchNumber: 5,
        predictedWinnerId: 'team-2',
        predictedWinnerName: 'Pokhara Avengers',
        predictedPomId: 'pom-33',
        predictedPomName: 'Player GG',
        teamAScoreCategory: 'C',
        teamAWickets: 5,
        teamBScoreCategory: 'F',
        teamBWickets: 4,
        submittedAt: Timestamp.fromDate(new Date(now - 7 * 60 * 1000)),
      }
    );

    // Match 6 predictions
    mockPredictions.push(
      {
        id: `${firstUserId}_match-6`,
        userId: firstUserId,
        matchId: 'match-6',
        matchNumber: 6,
        predictedWinnerId: 'team-5',
        predictedWinnerName: 'Janakpur Bolts',
        predictedPomId: 'pom-34',
        predictedPomName: 'Player HH',
        teamAScoreCategory: 'D',
        teamAWickets: 7,
        teamBScoreCategory: 'C',
        teamBWickets: 6,
        submittedAt: Timestamp.fromDate(new Date(now - 1.8 * 60 * 60 * 1000)),
      },
      {
        id: 'user-2_match-6',
        userId: 'user-2',
        matchId: 'match-6',
        matchNumber: 6,
        predictedWinnerId: 'team-6',
        predictedWinnerName: 'Lumbini Lions',
        predictedPomId: 'pom-35',
        predictedPomName: 'Player II',
        teamAScoreCategory: 'E',
        teamAWickets: 5,
        teamBScoreCategory: 'D',
        teamBWickets: 7,
        submittedAt: Timestamp.fromDate(new Date(now - 55 * 60 * 1000)),
      },
      {
        id: 'user-3_match-6',
        userId: 'user-3',
        matchId: 'match-6',
        matchNumber: 6,
        predictedWinnerId: 'team-5',
        predictedWinnerName: 'Janakpur Bolts',
        predictedPomId: 'pom-36',
        predictedPomName: 'Player JJ',
        teamAScoreCategory: 'F',
        teamAWickets: 3,
        teamBScoreCategory: 'B',
        teamBWickets: 8,
        submittedAt: Timestamp.fromDate(new Date(now - 42 * 60 * 1000)),
      },
      {
        id: 'user-4_match-6',
        userId: 'user-4',
        matchId: 'match-6',
        matchNumber: 6,
        predictedWinnerId: 'team-6',
        predictedWinnerName: 'Lumbini Lions',
        predictedPomId: 'pom-37',
        predictedPomName: 'Player KK',
        teamAScoreCategory: 'C',
        teamAWickets: 6,
        teamBScoreCategory: 'E',
        teamBWickets: 5,
        submittedAt: Timestamp.fromDate(new Date(now - 28 * 60 * 1000)),
      },
      {
        id: 'user-5_match-6',
        userId: 'user-5',
        matchId: 'match-6',
        matchNumber: 6,
        predictedWinnerId: 'team-5',
        predictedWinnerName: 'Janakpur Bolts',
        predictedPomId: 'pom-38',
        predictedPomName: 'Player LL',
        teamAScoreCategory: 'B',
        teamAWickets: 8,
        teamBScoreCategory: 'D',
        teamBWickets: 6,
        submittedAt: Timestamp.fromDate(new Date(now - 16 * 60 * 1000)),
      },
      {
        id: 'user-6_match-6',
        userId: 'user-6',
        matchId: 'match-6',
        matchNumber: 6,
        predictedWinnerId: 'team-6',
        predictedWinnerName: 'Lumbini Lions',
        predictedPomId: 'pom-39',
        predictedPomName: 'Player MM',
        teamAScoreCategory: 'D',
        teamAWickets: 7,
        teamBScoreCategory: 'C',
        teamBWickets: 5,
        submittedAt: Timestamp.fromDate(new Date(now - 9 * 60 * 1000)),
      },
      {
        id: 'user-7_match-6',
        userId: 'user-7',
        matchId: 'match-6',
        matchNumber: 6,
        predictedWinnerId: 'team-5',
        predictedWinnerName: 'Janakpur Bolts',
        predictedPomId: 'pom-40',
        predictedPomName: 'Player NN',
        teamAScoreCategory: 'E',
        teamAWickets: 6,
        teamBScoreCategory: 'F',
        teamBWickets: 3,
        submittedAt: Timestamp.fromDate(new Date(now - 4 * 60 * 1000)),
      }
    );

    const mockTeams = new Map([
      ['team-1', { name: 'Kathmandu Gorkhas', shortCode: 'KTG' }],
      ['team-2', { name: 'Pokhara Avengers', shortCode: 'PKA' }],
      ['team-3', { name: 'Biratnagar Kings', shortCode: 'BRK' }],
      ['team-4', { name: 'Chitwan Rhinos', shortCode: 'CHR' }],
      ['team-5', { name: 'Janakpur Bolts', shortCode: 'JNB' }],
      ['team-6', { name: 'Lumbini Lions', shortCode: 'LML' }],
    ]);

    return {
      matches: mockMatches,
      userEntries: mockUserEntries,
      predictions: mockPredictions,
      teams: mockTeams,
    };
  }

  async function loadData() {
    try {
      if (!user) return;

      // Use mock data if flag is set
      if (USE_MOCK_DATA) {
        const mockData = generateMockData(user?.uid);
        
        setTournament({
          id: 'tournament-1',
          name: 'NPL Season 2',
          status: 'active',
          startDate: Timestamp.fromDate(new Date()),
          endDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        } as Tournament);

        const matchMap = new Map(mockData.matches.map((m) => [m.id, m]));
        setMatches(matchMap);
        setTeams(mockData.teams);

        const userEntriesMap = new Map(mockData.userEntries.map(ue => [ue.userId, ue]));

        // Filter predictions that should be visible (all are visible since we're using mock data)
        const visiblePredictions: PredictionWithUser[] = [];
        for (const prediction of mockData.predictions) {
          const match = matchMap.get(prediction.matchId);
          if (!match) continue;

          // For mock data, show all predictions (simulate past edit cutoff)
          const userEntry = userEntriesMap.get(prediction.userId);
          if (userEntry) {
            visiblePredictions.push({
              prediction,
              userEntry,
              match,
            });
          }
        }

        // Sort by match number first, then by submission time (latest first)
        visiblePredictions.sort((a, b) => {
          if (a.prediction.matchNumber !== b.prediction.matchNumber) {
            return a.prediction.matchNumber - b.prediction.matchNumber;
          }
          const aTime = a.prediction.submittedAt?.toDate().getTime() || 0;
          const bTime = b.prediction.submittedAt?.toDate().getTime() || 0;
          return bTime - aTime; // Descending order (latest first)
        });

        setPredictionsWithUsers(visiblePredictions);
        setLoading(false);
        return;
      }

      // Original code for real data
      const activeTournament = await getActiveTournament();
      if (!activeTournament) {
        setLoading(false);
        return;
      }
      setTournament(activeTournament);

      // Get all user entries
      const userEntries = await getLeaderboard(activeTournament.id);
      const userEntriesMap = new Map(userEntries.map(ue => [ue.userId, ue]));

      // Get all predictions
      const allPredictions = await getAllPredictions(activeTournament.id);

      // Get all matches
      const matchesData = await getMatches(activeTournament.id);
      const matchMap = new Map(matchesData.map((m) => [m.id, m]));
      setMatches(matchMap);

      // Get teams for short codes
      const teamsData = await getTeams(activeTournament.id);
      const teamMap = new Map(teamsData.map((t) => [t.id, { name: t.name, shortCode: t.shortCode }]));
      setTeams(teamMap);

      // Filter predictions that should be visible
      const visiblePredictions: PredictionWithUser[] = [];
      for (const prediction of allPredictions) {
        const match = matchMap.get(prediction.matchId);
        if (!match) continue;

        if (isPredictionVisible(prediction, match, matchesData)) {
          const userEntry = userEntriesMap.get(prediction.userId);
          if (userEntry) {
            visiblePredictions.push({
              prediction,
              userEntry,
              match,
            });
          }
        }
      }

      // Sort by match number first
      visiblePredictions.sort((a, b) => {
        if (a.prediction.matchNumber !== b.prediction.matchNumber) {
          return a.prediction.matchNumber - b.prediction.matchNumber;
        }
        // Within same match, sort by submission time (latest first)
        const aTime = a.prediction.submittedAt?.toDate().getTime() || 0;
        const bTime = b.prediction.submittedAt?.toDate().getTime() || 0;
        return bTime - aTime; // Descending order (latest first)
      });

      setPredictionsWithUsers(visiblePredictions);
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
      <div className="max-w-6xl mx-auto text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">No active tournament found.</p>
      </div>
    );
  }

  // Group predictions by match
  const predictionsByMatch = new Map<string, PredictionWithUser[]>();
  for (const item of predictionsWithUsers) {
    if (!predictionsByMatch.has(item.match.id)) {
      predictionsByMatch.set(item.match.id, []);
    }
    predictionsByMatch.get(item.match.id)!.push(item);
  }

  // Get unique matches
  const uniqueMatches = Array.from(predictionsByMatch.keys())
    .map(matchId => matches.get(matchId))
    .filter((m): m is Match => m !== undefined)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Battle Ground</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              See how other players are predicting (after edit deadline)
            </p>
          </div>
        </div>

      </div>

      {/* Predictions - Leaderboard Style */}
      {predictionsWithUsers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            No predictions available yet. Predictions will appear here after the edit deadline passes.
          </p>
        </div>
      ) : (
        <div>
          {/* Leaderboard Style Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <div className="inline-flex min-w-full">
                {/* Left Column - Users (Sticky) */}
                <div className="flex-shrink-0 sticky left-0 z-10 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                  <div className="w-64">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-3 py-2 font-semibold text-sm h-16 flex items-center border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-700 dark:text-slate-200">Player</span>
                    </div>
                    {/* User Rows */}
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(() => {
                        const userIds = Array.from(new Set(predictionsWithUsers.map(p => p.userEntry.userId)));
                        // Sort: current user first, then others
                        const sortedUserIds = userIds.sort((a, b) => {
                          if (a === user?.uid) return -1;
                          if (b === user?.uid) return 1;
                          return 0;
                        });
                        
                        return sortedUserIds.map((userId) => {
                          const userEntry = predictionsWithUsers.find(p => p.userEntry.userId === userId)?.userEntry;
                          if (!userEntry) return null;
                          const userName = userEntry.userName || userEntry.userEmail || 'Unknown User';
                          const isCurrentUser = userId === user?.uid;
                          
                          return (
                            <div
                              key={userId}
                              className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors h-20 flex items-center ${
                                isCurrentUser 
                                  ? 'bg-gradient-to-r from-gold-50 to-amber-50 dark:from-gold-900/20 dark:to-amber-900/20 border-l-4 border-l-gold-500' 
                                  : ''
                              }`}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                                  isCurrentUser 
                                    ? 'bg-gradient-to-br from-gold-500 to-amber-500' 
                                    : 'bg-gradient-to-br from-blue-500 to-purple-500'
                                }`}>
                                  {userName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                      {userName}
                                    </div>
                                    {isCurrentUser && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-gold-500 to-amber-500 text-white text-xs font-semibold rounded-full shadow-sm">
                                        <span>👤</span>
                                        <span>You</span>
                                      </span>
                                    )}
                                  </div>
                                  {userEntry.currentRank && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      Rank #{userEntry.currentRank}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* Right Side - Match Columns (Horizontally Scrollable) */}
                <div className="flex-1 overflow-x-auto">
                  <div className="inline-flex">
                    {uniqueMatches.map((match) => {
                      const matchPredictions = predictionsByMatch.get(match.id) || [];
                      const userIds = Array.from(new Set(predictionsWithUsers.map(p => p.userEntry.userId)));
                      // Sort: current user first, then others
                      const sortedUserIds = userIds.sort((a, b) => {
                        if (a === user?.uid) return -1;
                        if (b === user?.uid) return 1;
                        return 0;
                      });
                      
                      return (
                        <div
                          key={match.id}
                          className="flex-shrink-0 w-80 border-r border-gray-200 dark:border-gray-700"
                        >
                          {/* Match Header - Compact */}
                          <div className="bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-3 py-2 h-16 flex flex-col justify-center border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Match {match.matchNumber} {match.matchType !== 'league' && `(${match.matchType})`}
                              </span>
                              <div className="flex items-center gap-1.5 text-sm">
                                <span className="font-medium truncate max-w-[100px] text-slate-700 dark:text-slate-200">{teams.get(match.teamAId)?.shortCode || match.teamAName}</span>
                                <span className="text-slate-500 dark:text-slate-400">vs</span>
                                <span className="font-medium truncate max-w-[100px] text-slate-700 dark:text-slate-200">{teams.get(match.teamBId)?.shortCode || match.teamBName}</span>
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {format(match.matchDate.toDate(), 'MMM dd, h:mm a')}
                            </div>
                          </div>

                          {/* Predictions Rows */}
                          <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {sortedUserIds.map((userId) => {
                              const prediction = matchPredictions.find(p => p.userEntry.userId === userId);
                              const isCurrentUser = userId === user?.uid;
                              
                              return (
                                <div
                                  key={`${userId}_${match.id}`}
                                  className={`px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors h-20 flex items-center ${
                                    isCurrentUser 
                                      ? 'bg-gradient-to-r from-gold-50 to-amber-50 dark:from-gold-900/20 dark:to-amber-900/20' 
                                      : ''
                                  }`}
                                >
                                  {prediction ? (
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 font-mono text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-tight w-full">
                                      {formatPrediction(prediction.prediction, match)}
                                    </div>
                                  ) : (
                                    <div className="text-gray-400 dark:text-gray-600 text-xs italic w-full">
                                      No prediction
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

