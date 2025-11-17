'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, signInAnonymously } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { TEST_MODE_ENABLED, TEST_USER_EMAILS } from './test-mode';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsTestUser: (userNumber: 1 | 2) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check for test user in localStorage first
    if (TEST_MODE_ENABLED && typeof window !== 'undefined') {
      const testUserStr = localStorage.getItem('testUser');
      if (testUserStr) {
        try {
          const testUser = JSON.parse(testUserStr);
          // Create a mock user object
          const mockUser = {
            uid: testUser.uid,
            email: testUser.email,
            displayName: testUser.displayName,
          } as User;
          
          setUser(mockUser);
          setIsAdmin(testUser.userNumber === 1);
          setLoading(false);
          return;
        } catch (e) {
          console.error('Error parsing test user:', e);
        }
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        // Check if user is admin
        const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
        const userEmailLower = (user.email || '').toLowerCase();
        
        // In test mode, User 1 is admin
        let userIsAdmin = false;
        if (TEST_MODE_ENABLED && user.email === TEST_USER_EMAILS.USER_1) {
          userIsAdmin = true;
        } else {
          userIsAdmin = adminEmails.includes(userEmailLower);
        }
        
        console.log('🔐 Admin Check:', {
          userEmail: user.email,
          userEmailLower: userEmailLower,
          adminEmails: adminEmails,
          isAdmin: userIsAdmin,
          testMode: TEST_MODE_ENABLED,
          envVariable: process.env.NEXT_PUBLIC_ADMIN_EMAILS,
          matchFound: adminEmails.includes(userEmailLower)
        });
        
        setIsAdmin(userIsAdmin);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInAsTestUser = async (userNumber: 1 | 2) => {
    if (!TEST_MODE_ENABLED) {
      throw new Error('Test mode is not enabled');
    }
    
    try {
      // Sign in anonymously first
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      
      // Update the user's email and display name to match test user
      const testEmail = userNumber === 1 ? TEST_USER_EMAILS.USER_1 : TEST_USER_EMAILS.USER_2;
      const testName = userNumber === 1 ? 'Test Admin' : 'Test Player 2';
      
      // Note: Firebase Auth doesn't allow updating email for anonymous users
      // We'll use a custom claim or store this in Firestore
      // For now, we'll use the UID to identify test users
      console.log('🧪 Test user signed in:', { userNumber, uid: user.uid, email: testEmail });
    } catch (error) {
      console.error('Error signing in as test user:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clear test user from localStorage
      if (TEST_MODE_ENABLED && typeof window !== 'undefined') {
        localStorage.removeItem('testUser');
      }
      await firebaseSignOut(auth);
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInAsTestUser, signOut, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

