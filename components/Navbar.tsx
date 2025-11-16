'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Home, BarChart3, User, LogOut, Shield, Trophy } from 'lucide-react';

export default function Navbar() {
  const { user, signOut, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Helper to check if link is active
  const isActive = (path: string) => pathname === path;

  // Helper to get nav link classes
  const getNavLinkClasses = (path: string) => {
    const base = "flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200";
    if (isActive(path)) {
      return `${base} bg-gold-500/20 text-gold-500 border border-gold-500/30 shadow-sm`;
    }
    return `${base} text-white/80 hover:text-white hover:bg-white/10`;
  };

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-navy-500 via-navy-600 to-navy-500 shadow-xl border-b border-gold-500/30 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gold-500/20 rounded-full blur-md group-hover:bg-gold-500/30 transition"></div>
              <Image 
                src="/logo.png" 
                alt="NPL Fan Battle" 
                width={48} 
                height={48}
                className="relative h-12 w-12 object-contain transform group-hover:scale-110 transition-transform duration-200"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white leading-tight tracking-tight">
                NPL Fan Battle
              </span>
              <span className="text-xs text-gold-500 font-semibold flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                Season 2 • 2025
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Main Nav Links */}
                <div className="hidden md:flex items-center gap-1">
                  <Link href="/" className={getNavLinkClasses('/')}>
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                  <Link href="/dashboard" className={getNavLinkClasses('/dashboard')}>
                    <User className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link href="/leaderboard" className={getNavLinkClasses('/leaderboard')}>
                    <BarChart3 className="h-4 w-4" />
                    <span>Leaderboard</span>
                  </Link>
                </div>

                {/* Mobile Nav - Icons Only */}
                <div className="flex md:hidden items-center gap-1">
                  <Link href="/" className={getNavLinkClasses('/')}>
                    <Home className="h-5 w-5" />
                  </Link>
                  <Link href="/dashboard" className={getNavLinkClasses('/dashboard')}>
                    <User className="h-5 w-5" />
                  </Link>
                  <Link href="/leaderboard" className={getNavLinkClasses('/leaderboard')}>
                    <BarChart3 className="h-5 w-5" />
                  </Link>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-white/20 mx-2"></div>

                {/* Admin Button */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-500 rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all duration-200 font-bold shadow-lg hover:shadow-gold-500/50 hover:scale-105 transform"
                  >
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-white/80 hover:text-crimson-500 hover:bg-crimson-500/10 rounded-lg transition-all duration-200 border border-transparent hover:border-crimson-500/30"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-6 py-2.5 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-500 rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all duration-200 font-bold shadow-lg hover:shadow-gold-500/50 hover:scale-105 transform"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

