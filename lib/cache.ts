// Simple in-memory cache with TTL for Firestore reads optimization

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries (call periodically)
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const cache = new SimpleCache();

// Cache keys
export const CACHE_KEYS = {
  activeTournament: 'activeTournament',
  tournament: (id: string) => `tournament:${id}`,
  matches: (tournamentId: string) => `matches:${tournamentId}`,
  match: (id: string) => `match:${id}`,
  teams: (tournamentId: string) => `teams:${tournamentId}`,
  team: (id: string) => `team:${id}`,
  players: (teamId: string) => `players:${teamId}`,
  allPlayers: (tournamentId: string) => `allPlayers:${tournamentId}`,
  leaderboard: (tournamentId: string) => `leaderboard:${tournamentId}`,
  userEntry: (userId: string) => `userEntry:${userId}`,
  userPredictions: (userId: string) => `userPredictions:${userId}`,
  matchPredictions: (matchId: string) => `matchPredictions:${matchId}`,
  allPredictions: (tournamentId: string) => `allPredictions:${tournamentId}`,
};

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000);
}

