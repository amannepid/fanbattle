const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

console.log('✅ Firebase initialized');
console.log('🔍 Checking Firestore access...');

getDocs(collection(db, 'test'))
  .then(() => {
    console.log('✅ Firestore is accessible!');
    process.exit(0);
  })
  .catch((error) => {
    console.log('❌ Firestore error:', error.message);
    if (error.message.includes('not found')) {
      console.log('\n📝 ACTION REQUIRED:');
      console.log('   1. Go to: https://console.firebase.google.com/project/npl-fan-battle/firestore');
      console.log('   2. Click "Create Database"');
      console.log('   3. Choose "Production mode"');
      console.log('   4. Select location (asia-south1 recommended)');
      console.log('   5. Click "Enable"\n');
    }
    process.exit(1);
  });
