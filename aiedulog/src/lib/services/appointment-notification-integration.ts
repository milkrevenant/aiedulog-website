/**
 * Appointment-Notification Integration Service
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * 
 * This service integrates the appointment booking system with the comprehensive
 * scheduling notification system. It provides high-level methods that handle
 * both appointment operations and their corresponding notifications.
 * 
 * Features:
 * - Automatic notification sending on appointment events
 * - Smart reminder scheduling based on appointment timing
 * - Multi-channel notification delivery
 * - User preference respecting
 * - Error handling and fallback mechanisms
 */

import { createClient } from '@/lib/supabase/server';
import { getSchedulingNotificationService, NotificationConfig } from '@/lib/services/scheduling-notification-service';
import { getNotificationService } from '@/lib/services/notification-service';

export interface AppointmentBookingResult {
  success: boolean;
  appointmentId?: string;
  notificationsSent?: boolean;
  notificationResults?: any;
  error?: string;
}

export interface AppointmentUpdateResult {
  success: boolean;
  appointmentId?: string;
  notificationsSent?: boolean;
  notificationResults?: any;
  error?: string;
}

export class AppointmentNotificationIntegration {
  private supabase: any;
  private schedulingNotificationService: any;
  private notificationService: any;

  constructor() {
    this.schedulingNotificationService = getSchedulingNotificationService();
    this.notificationService = getNotificationService();
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = createClient();
    }
    return this.supabase;
  }

  // =============================================================================
  // BOOKING WITH NOTIFICATIONS
  // =============================================================================

  /**
   * Create appointment booking with comprehensive notifications
   */
  async createBookingWithNotifications(
    bookingData: {
      instructor_id: string;
      appointment_type_id: string;
      appointment_date: string;
      start_time: string;
      duration_minutes: number;
      title: string;
      meeting_type: 'online' | 'offline' | 'hybrid';
      meeting_link?: string;
      meeting_location?: string;
      notes?: string;
      user_id: string;
    },
    notificationConfig: NotificationConfig = {}
  ): Promise<AppointmentBookingResult> {
    const supabase = await this.getSupabase();

    try {
      // Start transaction for atomic operation
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          ...bookingData,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          appointment_type:appointment_types(*),
          user:user_id(id, full_name, email, preferred_language),
          instructor:instructor_id(id, full_name, email, preferred_language)
        `)
        .single();

      if (appointmentError) {
        throw new Error(`Failed to create appointment: ${appointmentError.message}`);
      }

      // Send comprehensive booking notifications
      let notificationResults;
      try {
        // Get user notification preferences
        const userPreferences = await this.getUserNotificationPreferences(bookingData.user_id);
        
        // Merge user preferences with config
        const finalConfig = this.mergeNotificationConfig(userPreferences, notificationConfig);

        notificationResults = await this.schedulingNotificationService.sendBookingConfirmation(
          appointment,
          appointment.appointment_type,
          appointment.user,
          appointment.instructor,
          finalConfig
        );

        // Create tracking record for notification analytics
        await this.trackNotificationEvent({
          appointment_id: appointment.id,
          event_type: 'booking_created',
          notification_results: notificationResults
        });

      } catch (notificationError) {
        console.error('Failed to send booking notifications:', notificationError);
        
        // Don't fail the entire operation, but log the error
        notificationResults = {
          success: false,
          error: notificationError instanceof Error ? notificationError.message : 'Unknown notification error'
        };
      }

      return {
        success: true,
        appointmentId: appointment.id,
        notificationsSent: notificationResults?.success || false,
        notificationResults
      };

    } catch (error) {
      console.error('Error creating booking with notifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =============================================================================
  // APPOINTMENT CONFIRMATION
  // =============================================================================

  /**
   * Confirm appointment with notification to user
   */
  async confirmAppointmentWithNotifications(
    appointmentId: string,
    instructorId: string,
    confirmationData?: {
      meeting_link?: string;
      meeting_location?: string;
      notes?: string;
    }
  ): Promise<AppointmentUpdateResult> {
    const supabase = await this.getSupabase();

    try {
      // Update appointment status
      const { data: appointment, error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          ...confirmationData
        })
        .eq('id', appointmentId)
        .eq('instructor_id', instructorId)
        .select(`
          *,
          appointment_type:appointment_types(*),
          user:user_id(id, full_name, email, preferred_language),
          instructor:instructor_id(id, full_name, email, preferred_language)
        `)
        .single();

      if (updateError) {
        throw new Error(`Failed to confirm appointment: ${updateError.message}`);
      }

      // Send confirmation notification
      let notificationResults;
      try {
        notificationResults = await this.schedulingNotificationService.sendAppointmentConfirmation(
          appointment,
          appointment.appointment_type,
          appointment.user,
          appointment.instructor,
          { emailNotifications: true, pushNotifications: true }
        );

        // Track notification event
        await this.trackNotificationEvent({
          appointment_id: appointmentId,
          event_type: 'appointment_confirmed',
          notification_results: notificationResults
        });

      } catch (notificationError) {
        console.error('Failed to send confirmation notification:', notificationError);
        notificationResults = {
          success: false,
          error: notificationError instanceof Error ? notificationError.message : 'Unknown error'
        };
      }

      return {
        success: true,
        appointmentId,
        notificationsSent: notificationResults?.success || false,
        notificationResults
      };

    } catch (error) {
      console.error('Error confirming appointment with notifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =============================================================================
  // APPOINTMENT CANCELLATION
  // =============================================================================

  /**
   * Cancel appointment with notifications to both parties
   */
  async cancelAppointmentWithNotifications(
    appointmentId: string,
    cancelledBy: 'user' | 'instructor' | 'system',
    userId: string,
    reason?: string
  ): Promise<AppointmentUpdateResult> {
    const supabase = await this.getSupabase();

    try {
      // Get appointment data first
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          appointment_type:appointment_types(*),
          user:user_id(id, full_name, email, preferred_language),
          instructor:instructor_id(id, full_name, email, preferred_language)
        `)
        .eq('id', appointmentId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch appointment: ${fetchError.message}`);
      }

      // Verify user can cancel this appointment
      if (cancelledBy === 'user' && appointment.user_id !== userId) {
        throw new Error('User can only cancel their own appointments');
      }
      if (cancelledBy === 'instructor' && appointment.instructor_id !== userId) {
        throw new Error('Instructor can only cancel their own appointments');
      }

      // Update appointment status
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason
        })
        .eq('id', appointmentId);

      if (updateError) {
        throw new Error(`Failed to cancel appointment: ${updateError.message}`);
      }

      // Send cancellation notifications
      let notificationResults;
      try {
        notificationResults = await this.schedulingNotificationService.sendCancellationNotification(
          { ...appointment, status: 'cancelled', cancellation_reason: reason },
          appointment.appointment_type,
          appointment.user,
          appointment.instructor,
          cancelledBy,
          reason
        );

        // Track notification event
        await this.trackNotificationEvent({
          appointment_id: appointmentId,
          event_type: 'appointment_cancelled',
          notification_results: notificationResults
        });

      } catch (notificationError) {
        console.error('Failed to send cancellation notifications:', notificationError);
        notificationResults = {
          success: false,
          error: notificationError instanceof Error ? notificationError.message : 'Unknown error'
        };
      }

      return {
        success: true,
        appointmentId,
        notificationsSent: notificationResults?.success || false,
        notificationResults
      };

    } catch (error) {
      console.error('Error cancelling appointment with notifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =============================================================================
  // APPOINTMENT RESCHEDULING
  // =============================================================================

  /**
   * Reschedule appointment with notifications
   */
  async rescheduleAppointmentWithNotifications(
    originalAppointmentId: string,
    newAppointmentData: {
      appointment_date: string;
      start_time: string;
      duration_minutes?: number;
      meeting_link?: string;
      meeting_location?: string;
    },
    rescheduledBy: 'user' | 'instructor' | 'system',
    userId: string
  ): Promise<AppointmentUpdateResult> {
    const supabase = await this.getSupabase();

    try {
      // Get original appointment
      const { data: originalAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          appointment_type:appointment_types(*),
          user:user_id(id, full_name, email, preferred_language),
          instructor:instructor_id(id, full_name, email, preferred_language)
        `)
        .eq('id', originalAppointmentId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch original appointment: ${fetchError.message}`);
      }

      // Update appointment with new details
      const { data: updatedAppointment, error: updateError } = await supabase
        .from('appointments')
        .update({
          ...newAppointmentData,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalAppointmentId)
        .select(`
          *,
          appointment_type:appointment_types(*),
          user:user_id(id, full_name, email, preferred_language),
          instructor:instructor_id(id, full_name, email, preferred_language)
        `)
        .single();

      if (updateError) {
        throw new Error(`Failed to reschedule appointment: ${updateError.message}`);
      }

      // Send reschedule notifications
      let notificationResults;
      try {
        notificationResults = await this.schedulingNotificationService.sendRescheduleNotification(
          originalAppointment,
          updatedAppointment,
          updatedAppointment.appointment_type,
          updatedAppointment.user,
          updatedAppointment.instructor,
          rescheduledBy
        );

        // Track notification event
        await this.trackNotificationEvent({
          appointment_id: originalAppointmentId,
          event_type: 'appointment_rescheduled',
          notification_results: notificationResults
        });

      } catch (notificationError) {
        console.error('Failed to send reschedule notifications:', notificationError);
        notificationResults = {
          success: false,
          error: notificationError instanceof Error ? notificationError.message : 'Unknown error'
        };
      }

      return {
        success: true,
        appointmentId: originalAppointmentId,
        notificationsSent: notificationResults?.success || false,
        notificationResults
      };

    } catch (error) {
      console.error('Error rescheduling appointment with notifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =============================================================================
  // APPOINTMENT COMPLETION
  // =============================================================================

  /**
   * Complete appointment with feedback request notification
   */
  async completeAppointmentWithNotifications(
    appointmentId: string,
    instructorId: string,
    completionData?: {
      instructor_notes?: string;
      completion_notes?: string;
    }
  ): Promise<AppointmentUpdateResult> {
    const supabase = await this.getSupabase();

    try {
      // Update appointment status
      const { data: appointment, error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          ...completionData
        })
        .eq('id', appointmentId)
        .eq('instructor_id', instructorId)
        .select(`
          *,
          appointment_type:appointment_types(*),
          user:user_id(id, full_name, email, preferred_language),
          instructor:instructor_id(id, full_name, email, preferred_language)
        `)
        .single();

      if (updateError) {
        throw new Error(`Failed to complete appointment: ${updateError.message}`);
      }

      // Send completion notification with feedback request
      let notificationResults;
      try {
        notificationResults = await this.schedulingNotificationService.sendCompletionNotification(
          appointment,
          appointment.appointment_type,
          appointment.user,
          appointment.instructor,
          'instructor'
        );

        // Track notification event
        await this.trackNotificationEvent({
          appointment_id: appointmentId,
          event_type: 'appointment_completed',
          notification_results: notificationResults
        });

      } catch (notificationError) {
        console.error('Failed to send completion notification:', notificationError);
        notificationResults = {
          success: false,
          error: notificationError instanceof Error ? notificationError.message : 'Unknown error'
        };
      }

      return {
        success: true,
        appointmentId,
        notificationsSent: notificationResults?.success || false,
        notificationResults
      };

    } catch (error) {
      console.error('Error completing appointment with notifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =============================================================================
  // REMINDER MANAGEMENT
  // =============================================================================

  /**
   * Schedule all reminder notifications for an appointment
   */
  async scheduleAppointmentReminders(
    appointmentId: string,
    reminderConfig?: {
      reminder24h?: boolean;
      reminder1h?: boolean;
      reminder15m?: boolean;
    }
  ): Promise<{ success: boolean; remindersScheduled: number; error?: string }> {
    const supabase = await this.getSupabase();

    try {
      // Get appointment data
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          appointment_type:appointment_types(*),
          user:user_id(id, full_name, email, preferred_language),
          instructor:instructor_id(id, full_name, email, preferred_language)
        `)
        .eq('id', appointmentId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch appointment: ${fetchError.message}`);
      }

      // Get user preferences for reminders
      const userPreferences = await this.getUserNotificationPreferences(appointment.user_id);
      
      const config: NotificationConfig = {
        reminder24h: reminderConfig?.reminder24h ?? userPreferences?.appointment_reminders_24h ?? true,
        reminder1h: reminderConfig?.reminder1h ?? userPreferences?.appointment_reminders_1h ?? true,
        reminder15m: reminderConfig?.reminder15m ?? userPreferences?.appointment_reminders_15m ?? false,
        emailNotifications: true,
        pushNotifications: true
      };

      const result = await this.schedulingNotificationService.scheduleReminderNotifications(
        appointment,
        appointment.appointment_type,
        appointment.user,
        appointment.instructor,
        config
      );

      return result;

    } catch (error) {
      console.error('Error scheduling appointment reminders:', error);
      return {
        success: false,
        remindersScheduled: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get user notification preferences for scheduling
   */
  private async getUserNotificationPreferences(userId: string): Promise<any> {
    const supabase = await this.getSupabase();

    try {
      const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('category', 'schedule')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch user notification preferences:', error);
        return null;
      }

      return preferences;
    } catch (error) {
      console.error('Error getting user notification preferences:', error);
      return null;
    }
  }

  /**
   * Merge user preferences with explicit notification config
   */
  private mergeNotificationConfig(
    userPreferences: any, 
    explicitConfig: NotificationConfig
  ): NotificationConfig {
    return {
      emailNotifications: explicitConfig.emailNotifications ?? userPreferences?.channels?.includes('email') ?? true,
      pushNotifications: explicitConfig.pushNotifications ?? userPreferences?.channels?.includes('push') ?? true,
      smsNotifications: explicitConfig.smsNotifications ?? userPreferences?.channels?.includes('sms') ?? false,
      reminder24h: explicitConfig.reminder24h ?? userPreferences?.appointment_reminders_24h ?? true,
      reminder1h: explicitConfig.reminder1h ?? userPreferences?.appointment_reminders_1h ?? true,
      reminder15m: explicitConfig.reminder15m ?? userPreferences?.appointment_reminders_15m ?? false,
      includeCalendarFile: explicitConfig.includeCalendarFile ?? true
    };
  }

  /**
   * Track notification events for analytics
   */
  private async trackNotificationEvent(eventData: {
    appointment_id: string;
    event_type: string;
    notification_results: any;
  }): Promise<void> {
    const supabase = await this.getSupabase();

    try {
      await supabase
        .from('notification_events')
        .insert({
          appointment_id: eventData.appointment_id,
          event_type: eventData.event_type,
          success: eventData.notification_results?.success || false,
          results: eventData.notification_results,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to track notification event:', error);
      // Don't throw error as this is just for analytics
    }
  }
}

// Export factory function
export const createAppointmentNotificationIntegration = () => new AppointmentNotificationIntegration();

// Export singleton getter
export const getAppointmentNotificationIntegration = () => createAppointmentNotificationIntegration();