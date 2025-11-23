/**
 * Verify VAPID key is configured
 * Usage: tsx scripts/verify-vapid-key.ts
 */

console.log('🔍 Checking VAPID Key Configuration...\n');

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;

if (!vapidKey) {
  console.log('❌ NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set');
  console.log('\n📝 To fix:');
  console.log('1. Go to Firebase Console → Project Settings → Cloud Messaging');
  console.log('2. Find "Web Push certificates" section');
  console.log('3. Copy the Key (not Key ID)');
  console.log('4. Add to .env.local: NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-key-here');
  process.exit(1);
}

if (vapidKey.length < 50) {
  console.log('⚠️  VAPID key seems too short. Make sure you copied the full key.');
  console.log(`   Current length: ${vapidKey.length} characters`);
  console.log('   Expected: ~87 characters (base64 encoded)');
}

if (!messagingSenderId) {
  console.log('⚠️  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is not set');
} else {
  console.log('✅ Messaging Sender ID is configured');
}

console.log('\n✅ VAPID Key is configured!');
console.log(`   Key length: ${vapidKey.length} characters`);
console.log(`   Key preview: ${vapidKey.substring(0, 20)}...`);
console.log('\n💡 Note: Restart your dev server after adding the key!');

