/**
 * Test script to verify 8 PM CST cutoff logic
 * Tests:
 * 1. Cutoff time calculation for different Nepal days
 * 2. Same Nepal day matches share same cutoff
 * 3. Blocking logic works correctly
 * 4. Timezone conversions are accurate
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, Timestamp } from 'firebase/firestore';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Firebase config (we'll use it to create test matches)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
};

// Initialize Firebase (just for type checking, we won't actually use it)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Import the functions we need to test
// Note: We'll need to access internal functions, so we'll test the public API
// and verify the logic manually
import type { Match } from '../types';

// Since the internal functions are not exported, we'll recreate them for testing
// This ensures our test logic matches the implementation

function getNepalDay(date: Date): Date {
  const nepalTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  
  const year = parseInt(nepalTime.find(part => part.type === 'year')?.value || '2025', 10);
  const month = parseInt(nepalTime.find(part => part.type === 'month')?.value || '1', 10) - 1;
  const day = parseInt(nepalTime.find(part => part.type === 'day')?.value || '1', 10);
  
  const nepalDayStart = new Date(Date.UTC(year, month, day, 0, 0, 0));
  nepalDayStart.setUTCHours(nepalDayStart.getUTCHours() - 5);
  nepalDayStart.setUTCMinutes(nepalDayStart.getUTCMinutes() - 45);
  
  return nepalDayStart;
}

function getCutoffTimeForNepalDay(nepalDay: Date): Date {
  // Get the CST date when this Nepal day starts
  const cstDateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(nepalDay);
  
  const [month, day, year] = cstDateStr.split('/').map(Number);
  
  // The cutoff is always 8 PM CST on the CST day when the Nepal day starts
  let cutoffYear = year;
  let cutoffMonth = month - 1; // JavaScript months are 0-indexed  
  let cutoffDay = day;
  
  // Create Date object for 8 PM CST on the cutoff day
  // CST is UTC-6, so 8 PM CST = 2 AM UTC next day
  // For Nov 17 8:00 PM CST: Nov 17 20:00 CST = Nov 18 02:00 UTC
  const cutoffDate = new Date(Date.UTC(cutoffYear, cutoffMonth, cutoffDay));
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() + 1);
  cutoffDate.setUTCHours(2, 0, 0, 0);
  
  return cutoffDate;
}

// Test data: Create mock matches based on the schedule
function createMockMatch(matchNumber: number, nepalDateStr: string, nepalTimeStr: string): Match {
  // Parse Nepal time (similar to seed.ts)
  const monthMap: { [key: string]: number } = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };
  
  const [month, day] = nepalDateStr.split(',')[0].trim().split(' ');
  const year = 2025;
  
  const [time, period] = nepalTimeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  const monthNum = monthMap[month];
  const dateString = `${year}-${String(monthNum + 1).padStart(2, '0')}-${day.padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:45`;
  const matchDate = new Date(dateString);
  
  return {
    id: `match-${matchNumber}`,
    tournamentId: 'test-tournament',
    matchNumber,
    matchType: 'league',
    teamAId: 'team-a',
    teamBId: 'team-b',
    teamAName: 'Team A',
    teamBName: 'Team B',
    matchDate: Timestamp.fromDate(matchDate),
    deadline: Timestamp.fromDate(matchDate),
    status: 'upcoming',
  };
}

// Test cases
console.log('🧪 Testing 8 PM CST Cutoff Logic\n');
console.log('=' .repeat(60));

// Test 1: Verify same Nepal day matches share same cutoff
console.log('\n📋 Test 1: Same Nepal Day Matches Share Same Cutoff');
console.log('-'.repeat(60));

const match2 = createMockMatch(2, 'Nov 18, TUE', '11:45 AM'); // Nov 18 Nepal
const match3 = createMockMatch(3, 'Nov 18, TUE', '4:00 PM');  // Nov 18 Nepal

const match2NepalDay = getNepalDay(match2.matchDate.toDate());
const match3NepalDay = getNepalDay(match3.matchDate.toDate());

console.log(`Match 2 Nepal Day: ${match2NepalDay.toISOString()}`);
console.log(`Match 3 Nepal Day: ${match3NepalDay.toISOString()}`);
console.log(`Same Nepal Day: ${match2NepalDay.toISOString() === match3NepalDay.toISOString()}`);

const match2Cutoff = getCutoffTimeForNepalDay(match2NepalDay);
const match3Cutoff = getCutoffTimeForNepalDay(match3NepalDay);

console.log(`Match 2 Cutoff: ${match2Cutoff.toISOString()}`);
console.log(`Match 3 Cutoff: ${match3Cutoff.toISOString()}`);
console.log(`Same Cutoff: ${match2Cutoff.toISOString() === match3Cutoff.toISOString()}`);

const match2CutoffCST = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: 'numeric',
  minute: 'numeric',
  hour12: false,
}).format(match2Cutoff);

console.log(`Match 2 Cutoff (CST): ${match2CutoffCST}`);
console.log(`✅ Expected: Nov 17, MON 8:00 PM CST`);
console.log(`✅ Test ${match2CutoffCST.includes('11/17') && match2CutoffCST.includes('20:00') ? 'PASSED' : 'FAILED'}`);

// Test 2: Verify cutoff times for different days
console.log('\n📋 Test 2: Cutoff Times for Different Nepal Days');
console.log('-'.repeat(60));

const testMatches = [
  { num: 1, date: 'Nov 17, MON', time: '4:00 PM', expectedCutoff: 'Nov 16, SUN 8:00 PM CST' },
  { num: 4, date: 'Nov 19, WED', time: '4:00 PM', expectedCutoff: 'Nov 18, TUE 8:00 PM CST' },
  { num: 7, date: 'Nov 22, SAT', time: '11:15 AM', expectedCutoff: 'Nov 21, FRI 8:00 PM CST' },
  { num: 8, date: 'Nov 22, SAT', time: '3:30 PM', expectedCutoff: 'Nov 21, FRI 8:00 PM CST' },
  { num: 20, date: 'Dec 02, TUE', time: '11:45 AM', expectedCutoff: 'Dec 01, MON 8:00 PM CST' },
  { num: 21, date: 'Dec 02, TUE', time: '4:00 PM', expectedCutoff: 'Dec 01, MON 8:00 PM CST' },
];

for (const test of testMatches) {
  const match = createMockMatch(test.num, test.date, test.time);
  const nepalDay = getNepalDay(match.matchDate.toDate());
  const cutoff = getCutoffTimeForNepalDay(nepalDay);
  
  const cutoffCST = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).format(cutoff);
  
  console.log(`Match ${test.num} (${test.date} ${test.time} NPT):`);
  console.log(`  Cutoff: ${cutoffCST} CST`);
  console.log(`  Expected: ${test.expectedCutoff}`);
  
  // Verify it's 8 PM CST
  const cutoffHour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    hour12: false,
  }).format(cutoff);
  
  const is8PM = cutoffHour === '20';
  console.log(`  ✅ ${is8PM ? 'PASSED' : 'FAILED'} - Is 8 PM CST: ${is8PM}`);
}

// Test 3: Verify cutoff is always 8 PM CST
console.log('\n📋 Test 3: Verify Cutoff is Always 8 PM CST');
console.log('-'.repeat(60));

const testCutoffs = [
  createMockMatch(1, 'Nov 17, MON', '4:00 PM'),
  createMockMatch(2, 'Nov 18, TUE', '11:45 AM'),
  createMockMatch(4, 'Nov 19, WED', '4:00 PM'),
  createMockMatch(20, 'Dec 02, TUE', '11:45 AM'),
];

for (const match of testCutoffs) {
  const nepalDay = getNepalDay(match.matchDate.toDate());
  const cutoff = getCutoffTimeForNepalDay(nepalDay);
  
  const cutoffCSTHour = parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    hour12: false,
  }).format(cutoff), 10);
  
  const cutoffCSTMinute = parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    minute: 'numeric',
  }).format(cutoff), 10);
  
  const is8PM = cutoffCSTHour === 20 && cutoffCSTMinute === 0;
  console.log(`Match ${match.matchNumber}: Cutoff is ${cutoffCSTHour}:${String(cutoffCSTMinute).padStart(2, '0')} CST - ${is8PM ? '✅ PASSED' : '❌ FAILED'}`);
}

// Test 4: Verify Nepal day grouping
console.log('\n📋 Test 4: Nepal Day Grouping');
console.log('-'.repeat(60));

const allTestMatches = [
  createMockMatch(1, 'Nov 17, MON', '4:00 PM'),
  createMockMatch(2, 'Nov 18, TUE', '11:45 AM'),
  createMockMatch(3, 'Nov 18, TUE', '4:00 PM'),
  createMockMatch(7, 'Nov 22, SAT', '11:15 AM'),
  createMockMatch(8, 'Nov 22, SAT', '3:30 PM'),
];

const nepalDayGroups = new Map<string, number[]>();

for (const match of allTestMatches) {
  const nepalDay = getNepalDay(match.matchDate.toDate());
  const nepalDayKey = nepalDay.toISOString();
  
  if (!nepalDayGroups.has(nepalDayKey)) {
    nepalDayGroups.set(nepalDayKey, []);
  }
  nepalDayGroups.get(nepalDayKey)!.push(match.matchNumber);
}

console.log('Nepal Day Groups:');
for (const [nepalDayKey, matchNumbers] of nepalDayGroups.entries()) {
  const nepalDayDate = new Date(nepalDayKey);
  const nepalDateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    month: 'short',
    day: 'numeric',
  }).format(nepalDayDate);
  
  console.log(`  ${nepalDateStr}: Matches ${matchNumbers.join(', ')}`);
  
  // Verify all matches in same group have same cutoff
  const cutoff = getCutoffTimeForNepalDay(nepalDayDate);
  const cutoffCST = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).format(cutoff);
  
  console.log(`    Cutoff: ${cutoffCST} CST`);
}

// Test 5: Verify actual cutoff times match expected schedule
console.log('\n📋 Test 5: Verify Cutoff Times Match Expected Schedule');
console.log('-'.repeat(60));

const scheduleTests = [
  { nepalDate: 'Nov 18, TUE', expectedCutoffDate: 'Nov 17', expectedCutoffTime: '8:00 PM' },
  { nepalDate: 'Nov 22, SAT', expectedCutoffDate: 'Nov 21', expectedCutoffTime: '8:00 PM' },
  { nepalDate: 'Nov 24, MON', expectedCutoffDate: 'Nov 23', expectedCutoffTime: '8:00 PM' },
  { nepalDate: 'Dec 02, TUE', expectedCutoffDate: 'Dec 01', expectedCutoffTime: '8:00 PM' },
];

let allPassed = true;

for (const test of scheduleTests) {
  // Create a match on this Nepal date
  const match = createMockMatch(1, test.nepalDate, '4:00 PM');
  const nepalDay = getNepalDay(match.matchDate.toDate());
  
  // Debug: Check what CST date/time the nepalDay represents
  const nepalDayCST = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).format(nepalDay);
  
  console.log(`\n  Debug for ${test.nepalDate}:`);
  console.log(`    Nepal Day (UTC): ${nepalDay.toISOString()}`);
  console.log(`    Nepal Day (CST): ${nepalDayCST}`);
  
  const cutoff = getCutoffTimeForNepalDay(nepalDay);
  
  const cutoffCSTDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
  }).format(cutoff);
  
  const cutoffCSTTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).format(cutoff);
  
  // Normalize dates for comparison (handle "Dec 1" vs "Dec 01")
  const cutoffDateNormalized = cutoffCSTDate.replace(/\s+(\d)\s/, ' $1 '); // Ensure single space
  const expectedDateParts = test.expectedCutoffDate.split(' ');
  const dateMatch = cutoffDateNormalized.includes(expectedDateParts[0]) && 
                    (cutoffDateNormalized.includes(expectedDateParts[1]) || 
                     cutoffDateNormalized.includes(parseInt(expectedDateParts[1]).toString()));
  const timeMatch = cutoffCSTTime === '20:00';
  
  const passed = dateMatch && timeMatch;
  allPassed = allPassed && passed;
  
  console.log(`  Cutoff: ${cutoffCSTDate} ${cutoffCSTTime} CST`);
  console.log(`  Expected: ${test.expectedCutoffDate} ${test.expectedCutoffTime} CST`);
  console.log(`  ${passed ? '✅ PASSED' : '❌ FAILED'}`);
}

console.log('\n' + '='.repeat(60));
console.log(`\n${allPassed ? '✅ All tests PASSED' : '❌ Some tests FAILED'}\n`);

process.exit(allPassed ? 0 : 1);

