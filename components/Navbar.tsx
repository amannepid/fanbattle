'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sparkles, LayoutDashboard, Swords, Trophy, ShieldCheck, LogOut } from 'lucide-react';

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
    const base = "flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2 rounded-lg font-medium transition-all duration-200 min-h-[44px] min-w-[44px]";
    if (isActive(path)) {
      return `${base} bg-gold-500/20 text-gold-500 border border-gold-500/30 shadow-sm`;
    }
    return `${base} text-white/80 hover:text-white hover:bg-white/10`;
  };

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-navy-500 via-navy-600 to-navy-500 shadow-xl border-b border-gold-500/30 backdrop-blur-md">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16 min-h-[56px]">
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 md:gap-3 group min-w-0 flex-shrink max-w-[60%] sm:max-w-none">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-gold-500/20 rounded-full blur-md group-hover:bg-gold-500/30 transition"></div>
              <Image 
                src="/logo.png" 
                alt="NPL Fan Battle" 
                width={48} 
                height={48}
                className="relative h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 object-contain transform group-hover:scale-110 transition-transform duration-200"
              />
            </div>
            <div className="flex flex-col min-w-0 flex-shrink">
              <span className="text-xs sm:text-sm md:text-lg font-bold text-white leading-tight tracking-tight truncate">
                NPL Fan Battle
              </span>
              <span className="text-[9px] sm:text-[10px] md:text-xs text-gold-500 font-semibold flex items-center gap-0.5 sm:gap-1 truncate">
                <Trophy className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 flex-shrink-0" />
                <span className="hidden sm:inline">Season 2 • </span>2025
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0">
            {user ? (
              <>
                {/* Main Nav Links - Show on larger screens (1024px+) */}
                <div className="hidden lg:flex items-center gap-1">
                  <Link href="/" className={getNavLinkClasses('/')}>
                    <Sparkles className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                  <Link href="/dashboard" className={getNavLinkClasses('/dashboard')}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link href="/battleground" className={getNavLinkClasses('/battleground')}>
                    <Swords className="h-4 w-4" />
                    <span>Battle Ground</span>
                  </Link>
                  <Link href="/leaderboard" className={getNavLinkClasses('/leaderboard')}>
                    <Trophy className="h-4 w-4" />
                    <span>Leaderboard</span>
                  </Link>
                </div>

                {/* Mobile Nav - Icons Only */}
                <div className="flex lg:hidden items-center gap-0.5 sm:gap-1">
                  <Link href="/" className={getNavLinkClasses('/')} title="Home">
                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Link>
                  <Link href="/dashboard" className={getNavLinkClasses('/dashboard')} title="Dashboard">
                    <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Link>
                  <Link href="/battleground" className={getNavLinkClasses('/battleground')} title="Battle Ground">
                    <Swords className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Link>
                  <Link href="/leaderboard" className={getNavLinkClasses('/leaderboard')} title="Leaderboard">
                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Link>
                </div>

                {/* Divider */}
                <div className="h-6 sm:h-8 w-px bg-white/20 mx-1 sm:mx-2"></div>

                {/* Admin Button */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-500 rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all duration-200 font-bold shadow-lg hover:shadow-gold-500/50 hover:scale-105 transform min-h-[44px] min-w-[44px]"
                    title="Admin"
                  >
                    <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-white/80 hover:text-crimson-500 hover:bg-crimson-500/10 rounded-lg transition-all duration-200 border border-transparent hover:border-crimson-500/30 min-h-[44px] min-w-[44px]"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center justify-center px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-500 rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all duration-200 font-bold shadow-lg hover:shadow-gold-500/50 hover:scale-105 transform min-h-[44px] text-xs sm:text-sm md:text-base whitespace-nowrap"
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

