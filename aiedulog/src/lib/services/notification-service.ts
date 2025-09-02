/**
 * Enterprise Notification Service
 * 
 * Comprehensive notification system with:
 * - Multi-channel delivery (in-app, email, push, SMS)
 * - Real-time notifications via WebSockets/SSE
 * - Template-based messaging
 * - User preference management
 * - Analytics and tracking
 * - Integration with scheduling system
 */

import { createClient } from '@/lib/supabase/server';
import { createClient as createClientClient } from '@/lib/supabase/client';

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms' | 'webhook';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical' | 'urgent';
export type NotificationCategory = 'schedule' | 'content' | 'system' | 'security' | 'user' | 'admin' | 'marketing';
export type DeliveryStatus = 'pending' | 'processing' | 'delivered' | 'failed' | 'bounced' | 'clicked' | 'expired';

export interface NotificationData {
  id?: string;
  userId?: string;
  userGroup?: string;
  title: string;
  message: string;
  category: NotificationCategory;
  type: string;
  priority: NotificationPriority;
  scheduleId?: string;
  relatedContentType?: string;
  relatedContentId?: string;
  link?: string;
  actionData?: Record<string, any>;
  metadata?: Record<string, any>;
  channels: NotificationChannel[];
  scheduledFor?: string;
  expiresAt?: string;
  templateKey?: string;
  templateData?: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  templateKey: string;
  templateName: string;
  templateType: 'email_html' | 'email_text' | 'push_notification' | 'in_app_notification' | 'sms_message' | 'webhook_payload';
  category: NotificationCategory;
  subjectTemplate?: string;
  contentTemplate: string;
  variables: Record<string, string>;
  language: string;
  isActive: boolean;
}

export interface NotificationPreferences {
  userId: string;
  category: NotificationCategory;
  channels: NotificationChannel[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
  digestFrequency: 'immediate' | 'daily' | 'weekly' | 'never';
  maxNotificationsPerHour: number;
  scheduleNotifications: boolean;
  contentNotifications: boolean;
  systemNotifications: boolean;
  marketingNotifications: boolean;
  isActive: boolean;
}

export interface DeliveryTracker {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  recipient: string;
  status: DeliveryStatus;
  externalId?: string;
  providerName?: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  failedAt?: string;
  errorMessage?: string;
  retryCount: number;
  nextRetryAt?: string;
}

export class NotificationService {
  private supabase;
  
  constructor(serverMode = true) {
    this.supabase = serverMode ? createClient() : createClientClient();
  }

  /**
   * Create and send a notification
   */
  async createNotification(data: NotificationData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const supabase = await this.supabase;
      
      // Process template if provided
      let finalTitle = data.title;
      let finalMessage = data.message;
      
      if (data.templateKey && data.templateData) {
        const template = await this.getTemplate(data.templateKey);
        if (template) {
          finalTitle = this.replaceTemplateVariables(template.subjectTemplate || data.title, data.templateData);
          finalMessage = this.replaceTemplateVariables(template.contentTemplate, data.templateData);
        }
      }

      // Create notification record
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id: data.userId,
          user_group: data.userGroup,
          title: finalTitle,
          message: finalMessage,
          category: data.category,
          type: data.type,
          priority: data.priority,
          schedule_id: data.scheduleId,
          related_content_type: data.relatedContentType,
          related_content_id: data.relatedContentId,
          link: data.link,
          action_data: data.actionData || {},
          metadata: {
            ...data.metadata,
            template_key: data.templateKey,
            template_data: data.templateData
          },
          channels: data.channels,
          scheduled_for: data.scheduledFor,
          expires_at: data.expiresAt
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create notification:', error);
        return { success: false, error: error.message };
      }

      // Queue for delivery
      await this.queueNotificationForDelivery(notification.id, data.priority);

      return { success: true, notificationId: notification.id };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Create bulk notifications
   */
  async createBulkNotifications(
    userIds: string[],
    baseData: Omit<NotificationData, 'userId'>
  ): Promise<{ success: boolean; notificationIds?: string[]; errors?: string[] }> {
    const results: { success: boolean; notificationId?: string; error?: string }[] = [];
    
    for (const userId of userIds) {
      const result = await this.createNotification({
        ...baseData,
        userId
      });
      results.push(result);
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      success: successful.length > 0,
      notificationIds: successful.map(r => r.notificationId!),
      errors: failed.map(r => r.error!)
    };
  }

  /**
   * Create schedule-related notification
   */
  async createScheduleNotification(
    scheduleId: string,
    eventType: 'schedule_created' | 'schedule_executed' | 'schedule_failed' | 'schedule_reminder',
    userIds: string[],
    contentTitle: string,
    scheduleType: string,
    scheduledTime?: string,
    errorMessage?: string
  ): Promise<{ success: boolean; notificationIds?: string[] }> {
    const templates = {
      schedule_created: {
        title: '새로운 스케줄이 생성되었습니다',
        template: 'schedule_created',
        priority: 'normal' as NotificationPriority,
        channels: ['in_app', 'email'] as NotificationChannel[]
      },
      schedule_executed: {
        title: '스케줄이 성공적으로 실행되었습니다',
        template: 'schedule_success',
        priority: 'normal' as NotificationPriority,
        channels: ['in_app'] as NotificationChannel[]
      },
      schedule_failed: {
        title: '스케줄 실행이 실패했습니다',
        template: 'schedule_failure',
        priority: 'high' as NotificationPriority,
        channels: ['in_app', 'email'] as NotificationChannel[]
      },
      schedule_reminder: {
        title: '스케줄 실행 알림',
        template: 'schedule_reminder',
        priority: 'high' as NotificationPriority,
        channels: ['in_app', 'push'] as NotificationChannel[]
      }
    };

    const config = templates[eventType];
    const templateData = {
      content_title: contentTitle,
      schedule_type: scheduleType,
      scheduled_time: scheduledTime,
      error_message: errorMessage
    };

    const result = await this.createBulkNotifications(userIds, {
      title: config.title,
      message: `${contentTitle}에 대한 ${scheduleType} 작업`,
      category: 'schedule',
      type: eventType,
      priority: config.priority,
      scheduleId,
      relatedContentType: 'schedule',
      relatedContentId: scheduleId,
      channels: config.channels,
      templateKey: config.template,
      templateData
    });

    return result;
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      category?: NotificationCategory;
      unreadOnly?: boolean;
      includeArchived?: boolean;
    } = {}
  ): Promise<{ notifications: any[]; total: number }> {
    try {
      const supabase = await this.supabase;
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId);

      if (options.category) {
        query = query.eq('category', options.category);
      }

      if (options.unreadOnly) {
        query = query.eq('is_read', false);
      }

      if (!options.includeArchived) {
        query = query.eq('is_archived', false);
      }

      query = query.order('created_at', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data: notifications, error, count } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return { notifications: [], total: 0 };
      }

      return { notifications: notifications || [], total: count || 0 };
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      return { notifications: [], total: 0 };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId?: string): Promise<boolean> {
    try {
      const supabase = await this.supabase;
      
      let query = supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;
      
      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const supabase = await this.supabase;
      
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return false;
    }
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId: string, userId?: string): Promise<boolean> {
    try {
      const supabase = await this.supabase;
      
      let query = supabase
        .from('notifications')
        .update({
          is_archived: true,
          archived_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;
      
      if (error) {
        console.error('Error archiving notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in archiveNotification:', error);
      return false;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const supabase = await this.supabase;
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('is_archived', false);

      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  }

  /**
   * Manage user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences[]> {
    try {
      const supabase = await this.supabase;
      
      const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting preferences:', error);
        return [];
      }

      return preferences || [];
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      return [];
    }
  }

  async updateUserPreferences(
    userId: string,
    category: NotificationCategory,
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      const supabase = await this.supabase;
      
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          category,
          ...preferences
        }, {
          onConflict: 'user_id,category'
        });

      if (error) {
        console.error('Error updating preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateUserPreferences:', error);
      return false;
    }
  }

  /**
   * Template management
   */
  async getTemplate(templateKey: string): Promise<NotificationTemplate | null> {
    try {
      const supabase = await this.supabase;
      
      const { data: template, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('template_key', templateKey)
        .eq('is_active', true)
        .single();

      if (error || !template) {
        return null;
      }

      return template;
    } catch (error) {
      console.error('Error getting template:', error);
      return null;
    }
  }

  async createTemplate(template: Omit<NotificationTemplate, 'id'>): Promise<{ success: boolean; templateId?: string }> {
    try {
      const supabase = await this.supabase;
      
      const { data, error } = await supabase
        .from('notification_templates')
        .insert(template)
        .select()
        .single();

      if (error) {
        console.error('Error creating template:', error);
        return { success: false };
      }

      return { success: true, templateId: data.id };
    } catch (error) {
      console.error('Error in createTemplate:', error);
      return { success: false };
    }
  }

  /**
   * Analytics and metrics
   */
  async getNotificationAnalytics(
    startDate: string,
    endDate: string,
    category?: NotificationCategory,
    channel?: NotificationChannel
  ): Promise<any[]> {
    try {
      const supabase = await this.supabase;
      
      let query = supabase
        .from('notification_analytics')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (category) {
        query = query.eq('category', category);
      }

      if (channel) {
        query = query.eq('channel', channel);
      }

      const { data: analytics, error } = await query
        .order('date', { ascending: true });

      if (error) {
        console.error('Error getting analytics:', error);
        return [];
      }

      return analytics || [];
    } catch (error) {
      console.error('Error in getNotificationAnalytics:', error);
      return [];
    }
  }

  /**
   * Real-time notification delivery
   */
  async setupRealtimeNotifications(userId: string, callback: (notification: any) => void): Promise<() => void> {
    const supabase = createClientClient();
    
    const subscription = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        callback(payload.new);
      })
      .subscribe();

    // Return cleanup function
    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Private helper methods
   */
  private replaceTemplateVariables(template: string, data: Record<string, any>): string {
    let result = template;
    Object.entries(data).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value || ''));
    });
    return result;
  }

  private async queueNotificationForDelivery(notificationId: string, priority: NotificationPriority): Promise<void> {
    try {
      const supabase = await this.supabase;
      
      await supabase
        .from('notification_queue')
        .insert({
          notification_id: notificationId,
          priority,
          scheduled_for: priority === 'critical' || priority === 'urgent' 
            ? new Date().toISOString()
            : new Date(Date.now() + 60000).toISOString() // 1 minute delay for non-critical
        });
    } catch (error) {
      console.error('Error queuing notification:', error);
    }
  }

  /**
   * Process notification queue (for background workers)
   */
  async processNotificationQueue(batchSize = 10): Promise<{ processed: number; errors: string[] }> {
    try {
      const supabase = await this.supabase;
      
      // Get pending notifications from queue
      const { data: queueItems, error } = await supabase
        .from('notification_queue')
        .select(`
          *,
          notification:notification_id (*)
        `)
        .eq('status', 'queued')
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('scheduled_for', { ascending: true })
        .limit(batchSize);

      if (error || !queueItems?.length) {
        return { processed: 0, errors: [] };
      }

      const errors: string[] = [];
      let processed = 0;

      for (const item of queueItems) {
        try {
          // Mark as processing
          await supabase
            .from('notification_queue')
            .update({
              status: 'processing',
              processing_started_at: new Date().toISOString()
            })
            .eq('id', item.id);

          // Process each channel
          const notification = item.notification;
          if (notification) {
            for (const channel of notification.channels) {
              await this.deliverNotification(notification.id, channel, notification);
            }
          }

          // Mark as completed
          await supabase
            .from('notification_queue')
            .update({
              status: 'completed',
              processing_completed_at: new Date().toISOString()
            })
            .eq('id', item.id);

          processed++;
        } catch (error) {
          console.error(`Error processing notification queue item ${item.id}:`, error);
          errors.push(`Queue item ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);

          // Mark as failed
          await supabase
            .from('notification_queue')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              retry_count: item.retry_count + 1
            })
            .eq('id', item.id);
        }
      }

      return { processed, errors };
    } catch (error) {
      console.error('Error processing notification queue:', error);
      return { processed: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  /**
   * Deliver notification through specific channel
   */
  private async deliverNotification(
    notificationId: string,
    channel: NotificationChannel,
    notification: any
  ): Promise<void> {
    const supabase = await this.supabase;

    try {
      // Create delivery tracking record
      const { data: delivery, error } = await supabase
        .from('notification_deliveries')
        .insert({
          notification_id: notificationId,
          channel,
          recipient: await this.getRecipientForChannel(notification.user_id, channel),
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create delivery record: ${error.message}`);
      }

      // Deliver based on channel
      let deliveryResult;
      switch (channel) {
        case 'in_app':
          deliveryResult = await this.deliverInAppNotification(notification);
          break;
        case 'email':
          deliveryResult = await this.deliverEmailNotification(notification);
          break;
        case 'push':
          deliveryResult = await this.deliverPushNotification(notification);
          break;
        case 'sms':
          deliveryResult = await this.deliverSmsNotification(notification);
          break;
        case 'webhook':
          deliveryResult = await this.deliverWebhookNotification(notification);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      // Update delivery status
      await supabase
        .from('notification_deliveries')
        .update({
          status: deliveryResult.success ? 'delivered' : 'failed',
          sent_at: new Date().toISOString(),
          delivered_at: deliveryResult.success ? new Date().toISOString() : null,
          external_id: deliveryResult.externalId,
          provider_name: deliveryResult.provider,
          error_message: deliveryResult.error,
          provider_response: deliveryResult.response || {}
        })
        .eq('id', delivery.id);

    } catch (error) {
      console.error(`Error delivering notification ${notificationId} via ${channel}:`, error);
      throw error;
    }
  }

  private async getRecipientForChannel(userId: string, channel: NotificationChannel): Promise<string> {
    const supabase = await this.supabase;
    
    switch (channel) {
      case 'in_app':
        return userId;
      case 'email':
        const { data: identity } = await supabase
          .from('identities')
          .select('email')
          .eq('id', userId)
          .single();
        return identity?.email || '';
      case 'push':
        // Would get device token from user_profiles or device_tokens table
        return userId; // Placeholder
      case 'sms':
        // Would get phone number from user_profiles
        return userId; // Placeholder
      case 'webhook':
        return userId;
      default:
        return userId;
    }
  }

  private async deliverInAppNotification(notification: any): Promise<{ success: boolean; externalId?: string; provider?: string; error?: string; response?: any }> {
    // In-app notifications are already stored in the database
    return { success: true, provider: 'in_app' };
  }

  private async deliverEmailNotification(notification: any): Promise<{ success: boolean; externalId?: string; provider?: string; error?: string; response?: any }> {
    // Integrate with email service (SendGrid, AWS SES, etc.)
    // This is a placeholder implementation
    console.log('Delivering email notification:', notification.title);
    return { success: true, provider: 'email_service', externalId: `email_${Date.now()}` };
  }

  private async deliverPushNotification(notification: any): Promise<{ success: boolean; externalId?: string; provider?: string; error?: string; response?: any }> {
    // Integrate with push notification service (Firebase, APNs, etc.)
    console.log('Delivering push notification:', notification.title);
    return { success: true, provider: 'push_service', externalId: `push_${Date.now()}` };
  }

  private async deliverSmsNotification(notification: any): Promise<{ success: boolean; externalId?: string; provider?: string; error?: string; response?: any }> {
    // Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log('Delivering SMS notification:', notification.title);
    return { success: true, provider: 'sms_service', externalId: `sms_${Date.now()}` };
  }

  private async deliverWebhookNotification(notification: any): Promise<{ success: boolean; externalId?: string; provider?: string; error?: string; response?: any }> {
    // Send webhook notification
    console.log('Delivering webhook notification:', notification.title);
    return { success: true, provider: 'webhook', externalId: `webhook_${Date.now()}` };
  }
}

// Export factory function instead of singleton to avoid cookies context issues
export const createNotificationService = (serverMode = true) => new NotificationService(serverMode);

// Export singleton getter that creates instance on demand within request context
export const getNotificationService = () => createNotificationService(true);