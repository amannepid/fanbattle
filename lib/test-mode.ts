/**
 * TEST MODE CONFIGURATION
 * 
 * This file contains test mode settings for local development.
 * IMPORTANT: This is for LOCAL DEVELOPMENT ONLY. Never enable in production.
 */

// Test mode flag - set to true only in local development
export const TEST_MODE_ENABLED = process.env.NODE_ENV === 'development' && 
  process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === 'true';

// Test user IDs for test mode
export const TEST_USER_IDS = {
  USER_1: 'test-user-1-id',
  USER_2: 'test-user-2-id',
  USER_3: 'test-user-3-id',
  USER_4: 'test-user-4-id',
};

// Test user emails (for admin check)
export const TEST_USER_EMAILS = {
  USER_1: 'test-user-1@test.com', // Admin
  USER_2: 'test-user-2@test.com',
  USER_3: 'test-user-3@test.com',
  USER_4: 'test-user-4@test.com',
};

// Test user names
export const TEST_USER_NAMES = {
  USER_1: 'Test Admin',
  USER_2: 'Test Player 2',
  USER_3: 'Test Player 3',
  USER_4: 'Test Player 4',
};

// Maximum number of test logins allowed
export const MAX_TEST_LOGINS = 2;

