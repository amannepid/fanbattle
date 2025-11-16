import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
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

console.log('Firebase Config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

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
  
  // Convert 12-hour to 24-hour format
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  // Create date in Nepal timezone (UTC+5:45)
  // Format: YYYY-MM-DDTHH:mm:ss+05:45
  const monthNum = monthMap[month];
  const dateString = `${year}-${String(monthNum + 1).padStart(2, '0')}-${day.padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:45`;
  
  return new Date(dateString);
}

// 31 matches from the 2025 NPL schedule
const scheduleData = [
  { date: "Nov 17, MON", match: "Janakpur Bolts vs Kathmandu Gorkhas", time: "4:00 PM" },
  { date: "Nov 18, TUE", match: "Chitwan Rhinos vs Karnali Yaks", time: "11:45 AM" },
  { date: "Nov 18, TUE", match: "Biratnagar Kings vs Pokhara Avengers", time: "4:00 PM" },
  { date: "Nov 19, WED", match: "Kathmandu Gorkhas vs Sudurpaschim Royals", time: "4:00 PM" },
  { date: "Nov 20, THU", match: "Lumbini Lions vs Chitwan Rhinos", time: "4:00 PM" },
  { date: "Nov 21, FRI", match: "Pokhara Avengers vs Sudurpaschim Royals", time: "4:00 PM" },
  { date: "Nov 22, SAT", match: "Karnali Yaks vs Lumbini Lions", time: "11:15 AM" },
  { date: "Nov 22, SAT", match: "Kathmandu Gorkhas vs Biratnagar Kings", time: "3:30 PM" },
  { date: "Nov 24, MON", match: "Janakpur Bolts vs Biratnagar Kings", time: "11:45 AM" },
  { date: "Nov 24, MON", match: "Sudurpaschim Royals vs Karnali Yaks", time: "4:00 PM" },
  { date: "Nov 25, TUE", match: "Kathmandu Gorkhas vs Lumbini Lions", time: "4:00 PM" },
  { date: "Nov 26, WED", match: "Biratnagar Kings vs Chitwan Rhinos", time: "4:00 PM" },
  { date: "Nov 27, THU", match: "Lumbini Lions vs Sudurpaschim Royals", time: "11:45 AM" },
  { date: "Nov 27, THU", match: "Janakpur Bolts vs Pokhara Avengers", time: "4:00 PM" },
  { date: "Nov 28, FRI", match: "Chitwan Rhinos vs Kathmandu Gorkhas", time: "11:45 AM" },
  { date: "Nov 28, FRI", match: "Karnali Yaks vs Biratnagar Kings", time: "4:00 PM" },
  { date: "Nov 29, SAT", match: "Pokhara Avengers vs Lumbini Lions", time: "11:15 AM" },
  { date: "Nov 29, SAT", match: "Sudurpaschim Royals vs Janakpur Bolts", time: "3:30 PM" },
  { date: "Nov 30, SUN", match: "Karnali Yaks vs Kathmandu Gorkhas", time: "3:30 PM" },
  { date: "Dec 02, TUE", match: "Janakpur Bolts vs Chitwan Rhinos", time: "11:45 AM" },
  { date: "Dec 02, TUE", match: "Pokhara Avengers vs Karnali Yaks", time: "4:00 PM" },
  { date: "Dec 03, WED", match: "Biratnagar Kings vs Lumbini Lions", time: "4:00 PM" },
  { date: "Dec 04, THU", match: "Pokhara Avengers vs Kathmandu Gorkhas", time: "11:45 AM" },
  { date: "Dec 04, THU", match: "Sudurpaschim Royals vs Chitwan Rhinos", time: "4:00 PM" },
  { date: "Dec 05, FRI", match: "Lumbini Lions vs Janakpur Bolts", time: "4:00 PM" },
  { date: "Dec 06, SAT", match: "Sudurpaschim Royals vs Biratnagar Kings", time: "11:15 AM" },
  { date: "Dec 06, SAT", match: "Chitwan Rhinos vs Pokhara Avengers", time: "3:30 PM" },
  { date: "Dec 07, SUN", match: "Karnali Yaks vs Janakpur Bolts", time: "3:30 PM" },
  { date: "Dec 09, TUE", match: "Qualifier 1 (1st vs 2nd)", time: "4:00 PM" },
  { date: "Dec 10, WED", match: "Eliminator (3rd vs 4th)", time: "4:00 PM" },
  { date: "Dec 11, THU", match: "Qualifier 2 (Loser Q1 vs Winner Eliminator)", time: "4:00 PM" },
  { date: "Dec 13, SAT", match: "Grand Finale", time: "3:30 PM" },
];

// 8 NPL teams
const teams = [
  { name: "Biratnagar Kings", shortCode: "BRK", logoUrl: "/teams/biratnagar-kings.jpg", primaryColor: "#1E3A8A", secondaryColor: "#FBBF24" },
  { name: "Chitwan Rhinos", shortCode: "CHR", logoUrl: "/teams/chitwan-rhinos.jpg", primaryColor: "#EA580C", secondaryColor: "#FB923C" },
  { name: "Janakpur Bolts", shortCode: "JNB", logoUrl: "/teams/janakpur-bolts.jpg", primaryColor: "#1E40AF", secondaryColor: "#EC4899" },
  { name: "Karnali Yaks", shortCode: "KRY", logoUrl: "/teams/karnali-yaks.jpg", primaryColor: "#1E3A8A", secondaryColor: "#FBBF24" },
  { name: "Kathmandu Gorkhas", shortCode: "KTG", logoUrl: "/teams/kathmandu-gorkhas.jpg", primaryColor: "#4C1D95", secondaryColor: "#F59E0B" },
  { name: "Lumbini Lions", shortCode: "LML", logoUrl: "/teams/lumbini-lions.jpg", primaryColor: "#DC2626", secondaryColor: "#FCA5A5" },
  { name: "Pokhara Avengers", shortCode: "PKA", logoUrl: "/teams/pokhara-avengers.jpg", primaryColor: "#991B1B", secondaryColor: "#F59E0B" },
  { name: "Sudurpaschim Royals", shortCode: "SPR", logoUrl: "/teams/sudurpaschim-royals.jpg", primaryColor: "#2563EB", secondaryColor: "#FBBF24" },
];

// Note: Players are imported separately via CSV/JSON import scripts
// Run: npm run import-players (for CSV) or npm run import-players-json (for JSON)

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  try {
    // 1. Create tournament
    console.log('Creating tournament...');
    const tournamentId = 'npl-2025-season-2';
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await setDoc(tournamentRef, {
      name: 'Nepal Premier League 2025 - Season 2',
      startDate: Timestamp.fromDate(parseNepalTime('Nov 17, MON', '4:00 PM')),
      endDate: Timestamp.fromDate(parseNepalTime('Dec 13, SAT', '3:30 PM')),
      status: 'active',
    });
    console.log('✅ Tournament created\n');

    // 2. Create teams
    console.log('Creating teams...');
    const teamMap: { [key: string]: string } = {};
    for (const team of teams) {
      const teamId = team.shortCode.toLowerCase();
      teamMap[team.name] = teamId;
      const teamRef = doc(db, 'teams', teamId);
      await setDoc(teamRef, {
        tournamentId,
        name: team.name,
        shortCode: team.shortCode,
        logoUrl: team.logoUrl,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
      });
      console.log(`  ✓ ${team.name}`);
    }
    console.log('✅ All teams created\n');

    // 3. Skip player creation (players are imported separately via CSV/JSON)
    console.log('Skipping player creation...');
    console.log('  ℹ️  Players should be imported separately using:');
    console.log('     - npm run import-players (for CSV)');
    console.log('     - npm run import-players-json (for JSON)');
    console.log('  ℹ️  Current players in database will be preserved\n');

    // 4. Create matches
    console.log('Creating matches...');
    for (let i = 0; i < scheduleData.length; i++) {
      const item = scheduleData[i];
      const matchNumber = i + 1;
      
      // Determine match type from match name
      let matchType: 'league' | 'qualifier' | 'eliminator' | 'final';
      if (item.match.includes('Qualifier 1') || item.match.includes('Qualifier 2')) {
        matchType = 'qualifier';
      } else if (item.match.includes('Eliminator')) {
        matchType = 'eliminator';
      } else if (item.match.includes('Final') || item.match.includes('Finale')) {
        matchType = 'final';
      } else {
        matchType = 'league';
      }
      
      // Parse teams
      let teamAName, teamBName, teamAId, teamBId;
      
      if (item.match.includes('vs')) {
        [teamAName, teamBName] = item.match.split(' vs ').map(t => t.trim());
        teamAId = teamMap[teamAName];
        teamBId = teamMap[teamBName];
      } else {
        // Playoff matches (TBD teams)
        teamAName = item.match;
        teamBName = '';
        teamAId = 'tbd';
        teamBId = 'tbd';
      }
      
      const matchDate = parseNepalTime(item.date, item.time);
      const matchId = `match-${matchNumber}`;
      const matchRef = doc(db, 'matches', matchId);
      
      // Set deadline to match start time (users can predict until match starts)
      const deadline = new Date(matchDate);
      
      // Get team logos
      const teamAData = teams.find(t => t.name === teamAName);
      const teamBData = teams.find(t => t.name === teamBName);
      
      await setDoc(matchRef, {
        tournamentId,
        matchNumber,
        matchType,
        teamAId: teamAId || 'tbd',
        teamBId: teamBId || 'tbd',
        teamAName: teamAName || 'TBD',
        teamBName: teamBName || 'TBD',
        teamALogoUrl: teamAData?.logoUrl || '',
        teamBLogoUrl: teamBData?.logoUrl || '',
        venue: 'TU Cricket Ground, Kirtipur',
        matchDate: Timestamp.fromDate(matchDate),
        deadline: Timestamp.fromDate(deadline), // Deadline is at match start time
        status: 'upcoming' as const,
      });
      
      console.log(`  ✓ Match ${matchNumber}: ${teamAName} vs ${teamBName} (${item.date} ${item.time})`);
    }
    console.log('✅ All 31 matches created\n');

    console.log('🎉 Database seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`  - 1 tournament`);
    console.log(`  - 8 teams`);
    console.log(`  - Players (import separately via CSV/JSON)`);
    console.log(`  - 31 matches`);
    console.log('\n✨ Ready to start!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed script
seedDatabase().then(() => {
  console.log('\n✅ Seed complete. You can now run: npm run dev');
  process.exit(0);
});

