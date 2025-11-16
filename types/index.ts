import { Timestamp } from 'firebase/firestore';

export type MatchType = 'league' | 'playoff' | 'final';
export type MatchStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';
export type PlayerRole = 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';
export type ScoreCategory = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface Tournament {
  id: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: 'draft' | 'active' | 'completed';
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  shortCode: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  role: PlayerRole;
  photoUrl?: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  matchNumber: number;
  matchType: MatchType;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  teamALogoUrl?: string;
  teamBLogoUrl?: string;
  venue?: string;
  matchDate: Timestamp;
  deadline: Timestamp;
  status: MatchStatus;
  
  // Results (filled after match)
  winnerId?: string;
  winnerName?: string;
  momId?: string;
  momName?: string;
  firstInningsScore?: number;
  firstInningsWickets?: number;
  isReducedOvers?: boolean;
}

export interface UserEntry {
  id: string; // same as userId
  userId: string;
  tournamentId: string;
  userName: string;
  userEmail: string;
  seasonTeamId: string;
  seasonTeamName: string;
  
  // Tournament predictions
  playerOfTournamentId?: string;
  playerOfTournamentName?: string;
  highestWicketTakerId?: string;
  highestWicketTakerName?: string;
  highestRunScorerId?: string;
  highestRunScorerName?: string;
  
  totalPoints: number;
  totalPenalties: number;
  netPoints: number;
  currentRank: number;
  isPaid: boolean;
  createdAt: Timestamp;
}

export interface Prediction {
  id: string; // format: {userId}_{matchId}
  userId: string;
  matchId: string;
  matchNumber: number;
  
  // User predictions
  predictedWinnerId: string;
  predictedWinnerName: string;
  predictedPomId?: string; // Player of the Match (renamed from MoM)
  predictedPomName?: string;
  
  // Team A batting first predictions
  teamAScoreCategory?: ScoreCategory;
  teamAWickets?: number;
  
  // Team B batting first predictions
  teamBScoreCategory?: ScoreCategory;
  teamBWickets?: number;
  
  // Match-specific predictions
  highestRunBatsmanId?: string;
  highestRunBatsmanName?: string;
  highestWicketBowlerId?: string;
  highestWicketBowlerName?: string;
  
  // Scoring (calculated after match)
  pointsEarned?: number;
  isCorrectWinner?: boolean;
  isCorrectPom?: boolean;
  isCorrectScoreCategory?: boolean;
  isCorrectWickets?: boolean;
  isCorrectTeamAScore?: boolean;
  isCorrectTeamAWickets?: boolean;
  isCorrectTeamBScore?: boolean;
  isCorrectTeamBWickets?: boolean;
  isCorrectHighestRunBatsman?: boolean;
  isCorrectHighestWicketBowler?: boolean;
  seasonTeamAdjustment?: number; // +1, -1, or 0
  
  submittedAt: Timestamp;
  scoredAt?: Timestamp;
}

export interface ScoringResult {
  points: number;
  breakdown: {
    basePoints: number;
    winnerBonus: number;
    momBonus: number;
    scoreBonus: number;
    wicketsBonus: number;
    seasonTeamAdjustment: number;
  };
  isCorrectWinner: boolean;
  isCorrectPom: boolean;
  isCorrectScoreCategory: boolean;
  isCorrectWickets: boolean;
}

