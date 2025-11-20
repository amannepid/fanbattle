'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Trophy, Loader2, TestTube } from 'lucide-react';
import { TEST_MODE_ENABLED, TEST_USER_NAMES } from '@/lib/test-mode';

export default function LoginPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');
  const [showTestMode, setShowTestMode] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    setError('');
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Failed to sign in. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleTestModeLogin = async (userNumber: 1 | 2) => {
    if (!TEST_MODE_ENABLED) {
      setError('Test mode is not enabled');
      return;
    }

    setError('');
    setSigningIn(true);
    try {
      // Store test user info in localStorage
      const testUserInfo = {
        uid: userNumber === 1 ? 'test-user-1-id' : 'test-user-2-id',
        email: userNumber === 1 ? 'test-user-1@test.com' : 'test-user-2@test.com',
        displayName: userNumber === 1 ? TEST_USER_NAMES.USER_1 : TEST_USER_NAMES.USER_2,
        isTestUser: true,
        userNumber,
      };
      localStorage.setItem('testUser', JSON.stringify(testUserInfo));
      
      // Reload the page to trigger auth context update
      window.location.href = '/';
    } catch (error) {
      console.error('Test mode login error:', error);
      setError('Failed to sign in as test user.');
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-3 sm:mb-4">
            <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-primary-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
            Welcome to FanBattle
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            NPL Fantasy Cricket Predictor
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {TEST_MODE_ENABLED && (
            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg">
              <div className="flex items-center space-x-1.5 sm:space-x-2 mb-1.5 sm:mb-2">
                <TestTube className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                <p className="text-xs sm:text-sm font-bold text-yellow-900 dark:text-yellow-200">
                  TEST MODE ENABLED
                </p>
              </div>
              <p className="text-[10px] sm:text-xs text-yellow-800 dark:text-yellow-300 mb-2 sm:mb-3">
                Choose a test user to login (max 2 logins)
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleTestModeLogin(1)}
                  disabled={signingIn}
                  className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-2 bg-yellow-500 text-yellow-900 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base min-h-[44px]"
                >
                  <span className="truncate">{TEST_USER_NAMES.USER_1}</span>
                  <span className="text-[10px] sm:text-xs bg-yellow-700 text-yellow-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded flex-shrink-0 ml-2">ADMIN</span>
                </button>
                <button
                  onClick={() => handleTestModeLogin(2)}
                  disabled={signingIn}
                  className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-2 bg-yellow-500 text-yellow-900 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base min-h-[44px]"
                >
                  <span className="truncate">{TEST_USER_NAMES.USER_2}</span>
                  <span className="text-[10px] sm:text-xs bg-yellow-700 text-yellow-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded flex-shrink-0 ml-2">PLAYER</span>
                </button>
              </div>
            </div>
          )}

          {!showTestMode && TEST_MODE_ENABLED && (
            <button
              onClick={() => setShowTestMode(true)}
              className="w-full text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white min-h-[44px]"
            >
              Or sign in with Google
            </button>
          )}

          {(!TEST_MODE_ENABLED || showTestMode) && (
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {signingIn ? (
                <Loader2 className="h-5 w-5 animate-spin text-gray-900" />
              ) : (
                <>
                  <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="text-sm sm:text-base text-gray-900 font-medium">Sign in with Google</span>
                </>
              )}
            </button>
          )}

          {error && (
            <div className="text-red-600 text-xs sm:text-sm text-center bg-red-50 dark:bg-red-900/20 p-2.5 sm:p-3 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          <p>First match starts:</p>
          <p className="font-bold text-primary-600">November 17, 4:00 PM NST</p>
        </div>
      </div>
    </div>
  );
}

