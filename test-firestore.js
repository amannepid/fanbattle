const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyByUEJonppg3Sh8UVaqBgqfcIu51sgm8nQ",
  authDomain: "npl-fan-battle.firebaseapp.com",
  projectId: "npl-fan-battle",
  storageBucket: "npl-fan-battle.firebasestorage.app",
  messagingSenderId: "631136089590",
  appId: "1:631136089590:web:d5122b959dbf4ffcd743d7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('🔍 Testing Firestore write permissions...\n');

async function test() {
  try {
    const testRef = doc(db, 'test', 'test-doc');
    await setDoc(testRef, { message: 'Hello from FanBattle!', timestamp: new Date() });
    console.log('✅ Write successful!');
    
    const docSnap = await getDoc(testRef);
    console.log('✅ Read successful!');
    console.log('📄 Data:', docSnap.data());
    console.log('\n✨ Firestore is working! You can now run: npm run seed\n');
    process.exit(0);
  } catch (error) {
    console.log('❌ Error:', error.code, '-', error.message);
    console.log('\n📝 ACTION REQUIRED:');
    console.log('   1. Go to: https://console.firebase.google.com/project/npl-fan-battle/firestore/rules');
    console.log('   2. Replace the rules with:');
    console.log('      rules_version = \'2\';');
    console.log('      service cloud.firestore {');
    console.log('        match /databases/{database}/documents {');
    console.log('          match /{document=**} {');
    console.log('            allow read, write: if true;');
    console.log('          }');
    console.log('        }');
    console.log('      }');
    console.log('   3. Click "Publish"');
    console.log('   4. Wait 1 minute, then run this test again\n');
    process.exit(1);
  }
}

test();
