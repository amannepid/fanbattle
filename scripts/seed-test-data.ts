/**
 * TEST MODE DATA SEEDER
 * 
 * This script creates comprehensive test data for local development testing.
 * It creates:
 * - Test users (User 1 as admin, User 2 as regular, User 3/4 as dummy)
 * - Test players (clearly marked with [TEST] prefix)
 * - Test matches (league match 2, playoffs, final)
 * - Tournament setup
 * 
 * IMPORTANT: This is for LOCAL DEVELOPMENT ONLY. Never run in production.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp, getDocs } from 'firebase/firestore';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Helper to convert Nepal Time to UTC
function parseNepalTime(dateStr: string, timeStr: string): Date {
  const monthMap: { [key: string]: number } = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };
  
  const [month, day] = dateStr.split(',')[0].trim().split(' ');
  const year = 2025;
  
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  const monthNum = monthMap[month];
  const dateString = `${year}-${String(monthNum + 1).padStart(2, '0')}-${day.padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:45`;
  
  return new Date(dateString);
}

async function seedTestData() {
  console.log('🧪 Starting TEST MODE data seed...\n');
  console.log('⚠️  WARNING: This will create test data for local development only!\n');

  try {
    // 1. Create Tournament
    console.log('Creating test tournament...');
    const tournamentId = 'test-tournament-2025';
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await setDoc(tournamentRef, {
      name: 'NPL Season 2 - TEST MODE',
      status: 'active',
      createdAt: Timestamp.now(),
    });
    console.log('✅ Tournament created\n');

    // 2. Create Teams
    console.log('Creating test teams...');
    const teams = [
      { id: 'test-team-1', name: 'Kathmandu Gorkhas', shortCode: 'KTG' },
      { id: 'test-team-2', name: 'Pokhara Avengers', shortCode: 'PKA' },
      { id: 'test-team-3', name: 'Biratnagar Kings', shortCode: 'BRK' },
      { id: 'test-team-4', name: 'Chitwan Rhinos', shortCode: 'CHR' },
    ];

    for (const team of teams) {
      const teamRef = doc(db, 'teams', team.id);
      await setDoc(teamRef, {
        tournamentId,
        name: team.name,
        shortCode: team.shortCode,
        logoUrl: `/teams/${team.shortCode.toLowerCase()}.jpg`,
      });
    }
    console.log('✅ Teams created\n');

    // 3. Create Test Players (clearly marked with [TEST])
    console.log('Creating test players...');
    const testPlayers = [
      // Team 1 - Kathmandu Gorkhas
      { teamId: 'test-team-1', name: '[TEST] KTG-Bat-1', role: 'batsman', battingStyle: 'Right', bowlingStyle: '' },
      { teamId: 'test-team-1', name: '[TEST] KTG-Bat-2', role: 'batsman', battingStyle: 'Left', bowlingStyle: '' },
      { teamId: 'test-team-1', name: '[TEST] KTG-Bowl-1', role: 'bowler', battingStyle: 'Right', bowlingStyle: 'Right-arm fast' },
      { teamId: 'test-team-1', name: '[TEST] KTG-Bowl-2', role: 'bowler', battingStyle: 'Left', bowlingStyle: 'Left-arm spin' },
      { teamId: 'test-team-1', name: '[TEST] KTG-AR-1', role: 'all-rounder', battingStyle: 'Right', bowlingStyle: 'Right-arm medium' },
      { teamId: 'test-team-1', name: '[TEST] KTG-WK-1', role: 'wicket-keeper', battingStyle: 'Right', bowlingStyle: '' },
      
      // Team 2 - Pokhara Avengers
      { teamId: 'test-team-2', name: '[TEST] PKA-Bat-1', role: 'batsman', battingStyle: 'Right', bowlingStyle: '' },
      { teamId: 'test-team-2', name: '[TEST] PKA-Bat-2', role: 'batsman', battingStyle: 'Left', bowlingStyle: '' },
      { teamId: 'test-team-2', name: '[TEST] PKA-Bowl-1', role: 'bowler', battingStyle: 'Right', bowlingStyle: 'Right-arm fast' },
      { teamId: 'test-team-2', name: '[TEST] PKA-Bowl-2', role: 'bowler', battingStyle: 'Left', bowlingStyle: 'Left-arm spin' },
      { teamId: 'test-team-2', name: '[TEST] PKA-AR-1', role: 'all-rounder', battingStyle: 'Right', bowlingStyle: 'Right-arm medium' },
      { teamId: 'test-team-2', name: '[TEST] PKA-WK-1', role: 'wicket-keeper', battingStyle: 'Right', bowlingStyle: '' },
      
      // Team 3 - Biratnagar Kings
      { teamId: 'test-team-3', name: '[TEST] BRK-Bat-1', role: 'batsman', battingStyle: 'Right', bowlingStyle: '' },
      { teamId: 'test-team-3', name: '[TEST] BRK-Bat-2', role: 'batsman', battingStyle: 'Left', bowlingStyle: '' },
      { teamId: 'test-team-3', name: '[TEST] BRK-Bowl-1', role: 'bowler', battingStyle: 'Right', bowlingStyle: 'Right-arm fast' },
      { teamId: 'test-team-3', name: '[TEST] BRK-Bowl-2', role: 'bowler', battingStyle: 'Left', bowlingStyle: 'Left-arm spin' },
      { teamId: 'test-team-3', name: '[TEST] BRK-AR-1', role: 'all-rounder', battingStyle: 'Right', bowlingStyle: 'Right-arm medium' },
      { teamId: 'test-team-3', name: '[TEST] BRK-WK-1', role: 'wicket-keeper', battingStyle: 'Right', bowlingStyle: '' },
      
      // Team 4 - Chitwan Rhinos
      { teamId: 'test-team-4', name: '[TEST] CHR-Bat-1', role: 'batsman', battingStyle: 'Right', bowlingStyle: '' },
      { teamId: 'test-team-4', name: '[TEST] CHR-Bat-2', role: 'batsman', battingStyle: 'Left', bowlingStyle: '' },
      { teamId: 'test-team-4', name: '[TEST] CHR-Bowl-1', role: 'bowler', battingStyle: 'Right', bowlingStyle: 'Right-arm fast' },
      { teamId: 'test-team-4', name: '[TEST] CHR-Bowl-2', role: 'bowler', battingStyle: 'Left', bowlingStyle: 'Left-arm spin' },
      { teamId: 'test-team-4', name: '[TEST] CHR-AR-1', role: 'all-rounder', battingStyle: 'Right', bowlingStyle: 'Right-arm medium' },
      { teamId: 'test-team-4', name: '[TEST] CHR-WK-1', role: 'wicket-keeper', battingStyle: 'Right', bowlingStyle: '' },
    ];

    for (const player of testPlayers) {
      const playerRef = doc(collection(db, 'players'));
      await setDoc(playerRef, {
        tournamentId,
        teamId: player.teamId,
        name: player.name,
        role: player.role,
        battingStyle: player.battingStyle,
        bowlingStyle: player.bowlingStyle || '',
      });
    }
    console.log('✅ Test players created (marked with [TEST] prefix)\n');

    // 4. Create Matches
    console.log('Creating test matches...');
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0); // 2 PM tomorrow

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    dayAfter.setHours(14, 0, 0, 0);

    const threeDaysLater = new Date(tomorrow);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    threeDaysLater.setHours(14, 0, 0, 0);

    const matches = [
      {
        id: 'test-match-2',
        matchNumber: 2,
        matchType: 'league',
        teamAId: 'test-team-1',
        teamBId: 'test-team-2',
        teamAName: 'Kathmandu Gorkhas',
        teamBName: 'Pokhara Avengers',
        matchDate: Timestamp.fromDate(tomorrow),
        deadline: Timestamp.fromDate(new Date(tomorrow.getTime() - 6 * 60 * 60 * 1000)), // 6 hours before
        status: 'upcoming',
      },
      {
        id: 'test-match-qualifier',
        matchNumber: 3,
        matchType: 'qualifier',
        teamAId: 'test-team-1',
        teamBId: 'test-team-3',
        teamAName: 'Kathmandu Gorkhas',
        teamBName: 'Biratnagar Kings',
        matchDate: Timestamp.fromDate(dayAfter),
        deadline: Timestamp.fromDate(new Date(dayAfter.getTime() - 6 * 60 * 60 * 1000)),
        status: 'upcoming',
      },
      {
        id: 'test-match-final',
        matchNumber: 4,
        matchType: 'final',
        teamAId: 'test-team-1',
        teamBId: 'test-team-2',
        teamAName: 'Kathmandu Gorkhas',
        teamBName: 'Pokhara Avengers',
        matchDate: Timestamp.fromDate(threeDaysLater),
        deadline: Timestamp.fromDate(new Date(threeDaysLater.getTime() - 6 * 60 * 60 * 1000)),
        status: 'upcoming',
      },
    ];

    for (const match of matches) {
      const matchRef = doc(db, 'matches', match.id);
      await setDoc(matchRef, {
        tournamentId,
        ...match,
      });
    }
    console.log('✅ Test matches created\n');

    // 5. Create Test User Entries
    console.log('Creating test user entries...');
    const testUserEntries = [
      {
        userId: 'test-user-1-id',
        userName: 'Test Admin',
        userEmail: 'test-user-1@test.com',
        seasonTeamId: 'test-team-1',
        seasonTeamName: 'Kathmandu Gorkhas',
        playerOfTournamentId: '', // Will be set later
        playerOfTournamentName: '',
        highestWicketTakerId: '', // Will be set later
        highestWicketTakerName: '',
        highestRunScorerId: '', // Will be set later
        highestRunScorerName: '',
      },
      {
        userId: 'test-user-2-id',
        userName: 'Test Player 2',
        userEmail: 'test-user-2@test.com',
        seasonTeamId: 'test-team-2',
        seasonTeamName: 'Pokhara Avengers',
        playerOfTournamentId: '',
        playerOfTournamentName: '',
        highestWicketTakerId: '',
        highestWicketTakerName: '',
        highestRunScorerId: '',
        highestRunScorerName: '',
      },
      {
        userId: 'test-user-3-id',
        userName: 'Test Player 3',
        userEmail: 'test-user-3@test.com',
        seasonTeamId: 'test-team-3',
        seasonTeamName: 'Biratnagar Kings',
        playerOfTournamentId: '',
        playerOfTournamentName: '',
        highestWicketTakerId: '',
        highestWicketTakerName: '',
        highestRunScorerId: '',
        highestRunScorerName: '',
      },
      {
        userId: 'test-user-4-id',
        userName: 'Test Player 4',
        userEmail: 'test-user-4@test.com',
        seasonTeamId: 'test-team-4',
        seasonTeamName: 'Chitwan Rhinos',
        playerOfTournamentId: '',
        playerOfTournamentName: '',
        highestWicketTakerId: '',
        highestWicketTakerName: '',
        highestRunScorerId: '',
        highestRunScorerName: '',
      },
    ];

    // Get players for tournament predictions
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const allPlayers = playersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as { id: string; name: string; teamId: string }));

    // Get players from each team
    const team1Players = allPlayers.filter((p) => p.teamId === 'test-team-1');
    const team2Players = allPlayers.filter((p) => p.teamId === 'test-team-2');
    const team3Players = allPlayers.filter((p) => p.teamId === 'test-team-3');
    const team4Players = allPlayers.filter((p) => p.teamId === 'test-team-4');
    const allTeamPlayers = [...team1Players, ...team2Players, ...team3Players, ...team4Players];

    for (let i = 0; i < testUserEntries.length; i++) {
      const userEntry = testUserEntries[i];
      
      // Assign tournament predictions from test players (cycling through players)
      if (allTeamPlayers.length >= 3) {
        const playerIndex = i * 3;
        userEntry.playerOfTournamentId = allTeamPlayers[playerIndex % allTeamPlayers.length].id;
        userEntry.playerOfTournamentName = allTeamPlayers[playerIndex % allTeamPlayers.length].name;
        userEntry.highestWicketTakerId = allTeamPlayers[(playerIndex + 1) % allTeamPlayers.length].id;
        userEntry.highestWicketTakerName = allTeamPlayers[(playerIndex + 1) % allTeamPlayers.length].name;
        userEntry.highestRunScorerId = allTeamPlayers[(playerIndex + 2) % allTeamPlayers.length].id;
        userEntry.highestRunScorerName = allTeamPlayers[(playerIndex + 2) % allTeamPlayers.length].name;
      }

      const userEntryRef = doc(db, 'userEntries', userEntry.userId);
      await setDoc(userEntryRef, {
        tournamentId,
        ...userEntry,
        totalPoints: 0,
        totalPenalties: 0,
        netPoints: 0,
        currentRank: 0,
        isPaid: true,
        createdAt: Timestamp.now(),
      });
    }
    console.log('✅ Test user entries created\n');

    console.log('✅ TEST MODE data seeding completed!\n');
    console.log('📝 Test Users:');
    console.log('   - User 1: test-user-1@test.com (ADMIN - can complete matches)');
    console.log('   - User 2: test-user-2@test.com (Regular user)');
    console.log('   - User 3: test-user-3@test.com (Dummy user)');
    console.log('   - User 4: test-user-4@test.com (Dummy user)');
    console.log('\n📝 Test Players: All marked with [TEST] prefix');
    console.log('\n📝 Test Matches:');
    console.log('   - Match 2: League (KTG vs PKA)');
    console.log('   - Match 3: Qualifier (KTG vs BRK)');
    console.log('   - Match 4: Final (KTG vs PKA)');
    console.log('\n⚠️  Remember: This is TEST DATA only for local development!');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
}

seedTestData()
  .then(() => {
    console.log('\n✅ Test data seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test data seeding failed:', error);
    process.exit(1);
  });

