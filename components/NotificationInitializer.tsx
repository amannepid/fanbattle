'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  getNotificationManager, 
  ClientNotificationScheduler,
  ruleEngine,
  CutoffReminderRule,
} from '@/lib/notifications';
import { getMatches, getUserPredictions, getPrediction, getActiveTournament } from '@/lib/firestore';
import { logger } from '@/lib/notifications';
import type { Match, Prediction } from '@/types';

export function NotificationInitializer() {
  const { user } = useAuth();
  const initializedRef = useRef(false);
  const schedulerRef = useRef<ClientNotificationScheduler | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          logger.info('Service Worker registered', { scope: registration.scope });
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  logger.info('New service worker available');
                }
              });
            }
          });
        })
        .catch((error) => {
          logger.error('Service Worker registration failed', { error });
        });
    }

    // Initialize notification system
    const initNotifications = async () => {
      if (initializedRef.current || !user) {
        return;
      }

      try {
        const manager = getNotificationManager();
        await manager.initialize();
        manager.setUserId(user.uid);

        // Register cutoff reminder rule
        const cutoffRule = new CutoffReminderRule(
          async () => {
            const tournament = await getActiveTournament();
            if (!tournament) return [];
            return getMatches(tournament.id);
          },
          async (userId: string) => {
            return getUserPredictions(userId);
          },
          async (userId: string, matchId: string) => {
            const prediction = await getPrediction(userId, matchId);
            return prediction !== null;
          }
        );

        ruleEngine.register(cutoffRule);

        // Create and start scheduler
        const scheduler = new ClientNotificationScheduler(manager);
        scheduler.setManager(manager);
        scheduler.start();
        schedulerRef.current = scheduler;

        // Subscribe user to notifications
        await manager.subscribe(user.uid);

        initializedRef.current = true;
        logger.info('Notification system initialized', { userId: user.uid });
      } catch (error) {
        logger.error('Error initializing notification system', { error });
      }
    };

    if (user) {
      initNotifications();
    }

    // Cleanup
    return () => {
      if (schedulerRef.current) {
        schedulerRef.current.stop();
        schedulerRef.current = null;
      }
      initializedRef.current = false;
    };
  }, [user]);

  return null; // This component doesn't render anything
}

