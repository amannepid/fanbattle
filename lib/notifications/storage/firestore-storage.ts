import { INotificationStorage, NotificationSubscription, NotificationPreference, NotificationLog } from './storage.interface';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { logger } from '../utils/logger';

const COLLECTIONS = {
  notificationSubscriptions: 'notificationSubscriptions',
  notificationPreferences: 'notificationPreferences',
  notificationLogs: 'notificationLogs',
};

export class FirestoreNotificationStorage implements INotificationStorage {
  async saveSubscription(subscription: NotificationSubscription): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.notificationSubscriptions, subscription.userId);
      await setDoc(docRef, {
        ...subscription,
        createdAt: Timestamp.fromDate(subscription.createdAt),
        updatedAt: Timestamp.fromDate(subscription.updatedAt),
      }, { merge: true });
      logger.debug('Saved notification subscription', { userId: subscription.userId });
    } catch (error) {
      logger.error('Error saving notification subscription', { error, userId: subscription.userId });
      throw error;
    }
  }

  async getSubscription(userId: string): Promise<NotificationSubscription | null> {
    try {
      const docRef = doc(db, COLLECTIONS.notificationSubscriptions, userId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as NotificationSubscription;
    } catch (error) {
      logger.error('Error getting notification subscription', { error, userId });
      throw error;
    }
  }

  async deleteSubscription(userId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.notificationSubscriptions, userId);
      await deleteDoc(docRef);
      logger.debug('Deleted notification subscription', { userId });
    } catch (error) {
      logger.error('Error deleting notification subscription', { error, userId });
      throw error;
    }
  }

  async getAllSubscriptions(): Promise<NotificationSubscription[]> {
    try {
      const q = query(collection(db, COLLECTIONS.notificationSubscriptions));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as NotificationSubscription;
      });
    } catch (error) {
      logger.error('Error getting all notification subscriptions', { error });
      throw error;
    }
  }

  async savePreference(preference: NotificationPreference): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.notificationPreferences, preference.userId);
      await setDoc(docRef, {
        ...preference,
        createdAt: Timestamp.fromDate(preference.createdAt),
        updatedAt: Timestamp.fromDate(preference.updatedAt),
      }, { merge: true });
      logger.debug('Saved notification preference', { userId: preference.userId });
    } catch (error) {
      logger.error('Error saving notification preference', { error, userId: preference.userId });
      throw error;
    }
  }

  async getPreference(userId: string): Promise<NotificationPreference | null> {
    try {
      const docRef = doc(db, COLLECTIONS.notificationPreferences, userId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as NotificationPreference;
    } catch (error) {
      logger.error('Error getting notification preference', { error, userId });
      throw error;
    }
  }

  async saveNotificationLog(log: NotificationLog): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.notificationLogs, log.id);
      
      // Build log data explicitly to avoid Firestore issues
      const logData: {
        id: string;
        userId: string;
        notificationId: string;
        type: string;
        channel: string;
        status: 'sent' | 'failed' | 'pending';
        retryCount: number;
        createdAt: Timestamp;
        sentAt?: Timestamp;
        error?: string;
      } = {
        id: log.id,
        userId: log.userId,
        notificationId: log.notificationId,
        type: log.type,
        channel: log.channel,
        status: log.status,
        retryCount: log.retryCount,
        createdAt: Timestamp.fromDate(log.createdAt),
      };

      // Only include optional fields if they exist
      if (log.sentAt) {
        logData.sentAt = Timestamp.fromDate(log.sentAt);
      }
      if (log.error) {
        logData.error = log.error;
      }

      await setDoc(docRef, logData);
      logger.debug('Saved notification log', { logId: log.id });
    } catch (error) {
      logger.error('Error saving notification log', { error, logId: log.id });
      // Don't throw - logging is non-critical, notification was sent successfully
    }
  }

  async getNotificationLogs(userId: string, limitCount: number = 50): Promise<NotificationLog[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.notificationLogs),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          sentAt: data.sentAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
        } as NotificationLog;
      });
    } catch (error) {
      logger.error('Error getting notification logs', { error, userId });
      throw error;
    }
  }
}

export const firestoreStorage = new FirestoreNotificationStorage();

