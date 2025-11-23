import { NotificationRule } from '../rule-engine';
import { Notification, NotificationContext, NotificationType, NotificationPriority } from '../../core/types';
import { getNextMatchDayMatches, getNepalDay } from '@/lib/prediction-rules';
import { Match } from '@/types';
import { configManager } from '../../config/config';
import { logger } from '../../utils/logger';

// Helper function to get cutoff time (8 PM CST on previous CST day)
function getCutoffTimeForNepalDay(nepalDay: Date): Date {
  const cstDateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(nepalDay);
  
  const [month, day, year] = cstDateStr.split('/').map(Number);
  
  let cutoffYear = year;
  let cutoffMonth = month - 1;
  let cutoffDay = day;
  
  const cutoffDate = new Date(Date.UTC(cutoffYear, cutoffMonth, cutoffDay));
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() + 1);
  cutoffDate.setUTCHours(2, 0, 0, 0);
  
  return cutoffDate;
}

function getFirstMatchOfDay(match: Match, allMatches: Match[]): Match | null {
  const matchDate = match.matchDate.toDate();
  const matchNepalDay = getNepalDay(matchDate);
  const matchNepalDayKey = matchNepalDay.toISOString();
  
  const sameDayMatches = allMatches
    .filter(m => {
      const mDate = m.matchDate.toDate();
      const mNepalDay = getNepalDay(mDate);
      return mNepalDay.toISOString() === matchNepalDayKey;
    })
    .sort((a, b) => 
      a.matchDate.toDate().getTime() - b.matchDate.toDate().getTime()
    );
    
  return sameDayMatches[0] || null;
}

export class CutoffReminderRule implements NotificationRule {
  name = 'cutoff_reminder';

  constructor(
    private getAllMatches: () => Promise<Match[]>,
    private getUserPredictions: (userId: string) => Promise<any[]>,
    private hasUserPredicted: (userId: string, matchId: string) => Promise<boolean>
  ) {}

  async evaluate(context: NotificationContext): Promise<boolean> {
    try {
      const { userId, matchId, allMatches, userPredictions } = context;

      if (!allMatches || !Array.isArray(allMatches)) {
        return false;
      }

      // Get matches that need reminders
      const nextMatchDayMatches = getNextMatchDayMatches(allMatches);
      
      if (nextMatchDayMatches.length === 0) {
        return false;
      }

      const now = new Date();
      const config = configManager.get();
      const reminderHours = config.scheduling.cutoffReminderHours;

      // Check each match
      for (const match of nextMatchDayMatches) {
        // Check if user has already predicted
        const hasPredicted = matchId 
          ? await this.hasUserPredicted(userId, matchId)
          : userPredictions?.some((p: any) => p.matchId === match.id) || false;

        if (hasPredicted) {
          continue;
        }

        // Calculate cutoff time
        const matchDate = match.matchDate.toDate();
        const nepalDay = getNepalDay(matchDate);
        const cutoffTime = getCutoffTimeForNepalDay(nepalDay);

        // Also check 6 hours before first match of day
        const firstMatchOfDay = getFirstMatchOfDay(match, allMatches);
        if (firstMatchOfDay) {
          const firstMatchStartTime = firstMatchOfDay.matchDate.toDate();
          const editCutoffTime = new Date(firstMatchStartTime);
          editCutoffTime.setHours(editCutoffTime.getHours() - 6);
          
          // Use the earlier cutoff time
          const actualCutoffTime = cutoffTime < editCutoffTime ? cutoffTime : editCutoffTime;
          
          // Check if we're within reminder window (2 hours before cutoff)
          const reminderTime = new Date(actualCutoffTime);
          reminderTime.setHours(reminderTime.getHours() - reminderHours);
          
          const timeUntilReminder = reminderTime.getTime() - now.getTime();
          const timeUntilCutoff = actualCutoffTime.getTime() - now.getTime();

          // Trigger if we're past reminder time but before cutoff
          if (timeUntilReminder <= 0 && timeUntilCutoff > 0) {
            logger.debug('Cutoff reminder should be sent', {
              matchId: match.id,
              matchNumber: match.matchNumber,
              cutoffTime: actualCutoffTime.toISOString(),
              reminderTime: reminderTime.toISOString(),
            });
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error('Error evaluating cutoff reminder rule', { error, context });
      return false;
    }
  }

  async getNotification(context: NotificationContext): Promise<Notification | null> {
    try {
      const { userId, matchId, allMatches, userPredictions } = context;

      if (!allMatches || !Array.isArray(allMatches)) {
        return null;
      }

      const nextMatchDayMatches = getNextMatchDayMatches(allMatches);
      
      if (nextMatchDayMatches.length === 0) {
        return null;
      }

      // Find the match that needs reminder
      for (const match of nextMatchDayMatches) {
        const hasPredicted = matchId 
          ? await this.hasUserPredicted(userId, matchId)
          : userPredictions?.some((p: any) => p.matchId === match.id) || false;

        if (hasPredicted) {
          continue;
        }

        const matchDate = match.matchDate.toDate();
        const nepalDay = getNepalDay(matchDate);
        const cutoffTime = getCutoffTimeForNepalDay(nepalDay);

        const firstMatchOfDay = getFirstMatchOfDay(match, allMatches);
        if (firstMatchOfDay) {
          const firstMatchStartTime = firstMatchOfDay.matchDate.toDate();
          const editCutoffTime = new Date(firstMatchStartTime);
          editCutoffTime.setHours(editCutoffTime.getHours() - 6);
          
          const actualCutoffTime = cutoffTime < editCutoffTime ? cutoffTime : editCutoffTime;
          const now = new Date();
          const config = configManager.get();
          const reminderHours = config.scheduling.cutoffReminderHours;
          
          const reminderTime = new Date(actualCutoffTime);
          reminderTime.setHours(reminderTime.getHours() - reminderHours);
          
          const timeUntilReminder = reminderTime.getTime() - now.getTime();
          const timeUntilCutoff = actualCutoffTime.getTime() - now.getTime();

          if (timeUntilReminder <= 0 && timeUntilCutoff > 0) {
            // Create notification
            const hoursUntilCutoff = Math.round(timeUntilCutoff / (1000 * 60 * 60));
            
            return {
              id: `cutoff-reminder-${match.id}-${userId}`,
              type: NotificationType.CUTOFF_REMINDER,
              userId,
              title: 'Match Prediction Reminder',
              body: `Match #${match.matchNumber} (${match.teamAName} vs ${match.teamBName}) cutoff in ${hoursUntilCutoff} hour${hoursUntilCutoff !== 1 ? 's' : ''}. Make your prediction!`,
              data: {
                matchId: match.id,
                matchNumber: match.matchNumber,
                teamAName: match.teamAName,
                teamBName: match.teamBName,
                url: `/predict/${match.id}`,
              },
              priority: hoursUntilCutoff <= 1 ? NotificationPriority.URGENT : NotificationPriority.HIGH,
              expiresAt: actualCutoffTime,
              createdAt: new Date(),
            };
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('Error generating cutoff reminder notification', { error, context });
      return null;
    }
  }
}

