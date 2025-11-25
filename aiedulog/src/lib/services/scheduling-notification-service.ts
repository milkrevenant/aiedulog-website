/**
 * Scheduling Notification Service
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * 
 * Comprehensive notification system for appointment booking workflow.
 * Provides 11 specialized notification types with bilingual support,
 * multi-channel delivery, and calendar integration.
 * 
 * Features:
 * - Complete appointment lifecycle notifications
 * - Bilingual templates (Korean & English)
 * - Calendar file generation (ICS format)
 * - Smart reminder scheduling
 * - Multi-channel delivery (in-app, email, push, SMS)
 */

import { createNotificationService, NotificationData } from '@/lib/services/notification-service';
import { createClient } from '@/lib/supabase/server';
import { NotificationType, NotificationChannel, NotificationPriority } from '@/types/notification';

// Appointment-related interfaces
export interface AppointmentData {
  id: string;
  reference?: string;
  title: string;
  date: string;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  user_id: string;
  instructor_id: string;
  meeting_type: 'online' | 'offline' | 'hybrid';
  meeting_link?: string;
  meeting_location?: string;
  status: string;
  notes?: string;
  cancellation_reason?: string;
}

export interface UserData {
  id: string;
  full_name: string;
  email: string;
  preferred_language?: 'ko' | 'en';
}

export interface AppointmentTypeData {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price?: number;
}

export interface NotificationConfig {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  reminder24h?: boolean;
  reminder1h?: boolean;
  reminder15m?: boolean;
  includeCalendarFile?: boolean;
}

export class SchedulingNotificationService {
  private notificationService;
  private supabase: any;

  constructor() {
    this.notificationService = createNotificationService();
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = createClient();
    }
    return this.supabase;
  }

  // =============================================================================
  // BOOKING CONFIRMATION NOTIFICATIONS
  // =============================================================================

  /**
   * Send comprehensive booking confirmation to user and instructor
   */
  async sendBookingConfirmation(
    appointment: AppointmentData,
    appointmentType: AppointmentTypeData,
    user: UserData,
    instructor: UserData,
    config: NotificationConfig = {}
  ): Promise<{ success: boolean; errors?: string[] }> {
    const errors: string[] = [];

    try {
      // Default configuration
      const finalConfig = {
        emailNotifications: true,
        pushNotifications: true,
        reminder24h: true,
        reminder1h: true,
        includeCalendarFile: true,
        ...config
      };

      // Prepare template data
      const templateData = this.prepareAppointmentTemplateData(
        appointment,
        appointmentType,
        user,
        instructor
      );

      // Determine channels
      const channels: NotificationChannel[] = ['in_app'];
      if (finalConfig.emailNotifications) channels.push('email');
      if (finalConfig.pushNotifications) channels.push('push');
      if (finalConfig.smsNotifications) channels.push('sms');

      // Send confirmation to user
      const userResult = await this.notificationService.createNotification({
        userId: user.id,
        title: this.getLocalizedTitle('appointment_created', user.preferred_language),
        message: this.getLocalizedMessage('appointment_created', user.preferred_language, templateData),
        category: 'schedule',
        type: 'appointment_created',
        priority: 'high',
        channels,
        link: `/dashboard/appointments/${appointment.id}`,
        templateKey: 'appointment_created',
        templateData,
        actionData: {
          appointment_id: appointment.id,
          action_type: 'booking_confirmation',
          calendar_integration: finalConfig.includeCalendarFile
        }
      });

      if (!userResult.success) {
        errors.push(`User notification failed: ${userResult.error}`);
      }

      // Send new booking alert to instructor
      const instructorResult = await this.notificationService.createNotification({
        userId: instructor.id,
        title: this.getLocalizedTitle('instructor_new_booking', instructor.preferred_language),
        message: this.getLocalizedMessage('instructor_new_booking', instructor.preferred_language, templateData),
        category: 'schedule',
        type: 'instructor_new_booking',
        priority: 'high',
        channels,
        link: `/instructor/appointments/${appointment.id}`,
        templateKey: 'instructor_new_booking',
        templateData,
        actionData: {
          appointment_id: appointment.id,
          action_type: 'new_booking_alert',
          requires_confirmation: appointment.status === 'pending'
        }
      });

      if (!instructorResult.success) {
        errors.push(`Instructor notification failed: ${instructorResult.error}`);
      }

      // Schedule reminder notifications
      if (finalConfig.reminder24h || finalConfig.reminder1h || finalConfig.reminder15m) {
        await this.scheduleReminderNotifications(appointment, appointmentType, user, instructor, finalConfig);
      }

      return {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error('Error sending booking confirmation:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // =============================================================================
  // CONFIRMATION NOTIFICATIONS
  // =============================================================================

  /**
   * Send appointment confirmation when instructor confirms booking
   */
  async sendAppointmentConfirmation(
    appointment: AppointmentData,
    appointmentType: AppointmentTypeData,
    user: UserData,
    instructor: UserData,
    config: NotificationConfig = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const templateData = this.prepareAppointmentTemplateData(
        appointment,
        appointmentType,
        user,
        instructor
      );

      const channels: NotificationChannel[] = ['in_app', 'email'];
      if (config.pushNotifications) channels.push('push');

      const result = await this.notificationService.createNotification({
        userId: user.id,
        title: this.getLocalizedTitle('appointment_confirmed', user.preferred_language),
        message: this.getLocalizedMessage('appointment_confirmed', user.preferred_language, templateData),
        category: 'schedule',
        type: 'appointment_confirmed',
        priority: 'high',
        channels,
        link: `/dashboard/appointments/${appointment.id}`,
        templateKey: 'appointment_confirmed',
        templateData,
        actionData: {
          appointment_id: appointment.id,
          action_type: 'confirmation',
          meeting_ready: true
        }
      });

      return result;

    } catch (error) {
      console.error('Error sending appointment confirmation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =============================================================================
  // REMINDER NOTIFICATIONS
  // =============================================================================

  /**
   * Schedule all reminder notifications for an appointment
   */
  async scheduleReminderNotifications(
    appointment: AppointmentData,
    appointmentType: AppointmentTypeData,
    user: UserData,
    instructor: UserData,
    config: NotificationConfig
  ): Promise<{ success: boolean; remindersScheduled: number }> {
    let remindersScheduled = 0;

    try {
      const appointmentDateTime = new Date(`${appointment.date} ${appointment.start_time}`);
      const templateData = this.prepareAppointmentTemplateData(
        appointment,
        appointmentType,
        user,
        instructor
      );

      // 24-hour reminder
      if (config.reminder24h) {
        const reminder24h = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
        if (reminder24h > new Date()) {
          await this.scheduleReminderNotification(
            appointment,
            user,
            instructor,
            'appointment_reminder_24h',
            reminder24h.toISOString(),
            templateData,
            ['in_app', 'email']
          );
          remindersScheduled++;
        }
      }

      // 1-hour reminder
      if (config.reminder1h) {
        const reminder1h = new Date(appointmentDateTime.getTime() - 60 * 60 * 1000);
        if (reminder1h > new Date()) {
          await this.scheduleReminderNotification(
            appointment,
            user,
            instructor,
            'appointment_reminder_1h',
            reminder1h.toISOString(),
            templateData,
            ['in_app', 'push']
          );
          remindersScheduled++;
        }
      }

      // 15-minute reminder
      if (config.reminder15m) {
        const reminder15m = new Date(appointmentDateTime.getTime() - 15 * 60 * 1000);
        if (reminder15m > new Date()) {
          await this.scheduleReminderNotification(
            appointment,
            user,
            instructor,
            'appointment_reminder_15m',
            reminder15m.toISOString(),
            templateData,
            ['in_app', 'push', 'sms']
          );
          remindersScheduled++;
        }
      }

      return { success: true, remindersScheduled };

    } catch (error) {
      console.error('Error scheduling reminder notifications:', error);
      return { success: false, remindersScheduled };
    }
  }

  private async scheduleReminderNotification(
    appointment: AppointmentData,
    user: UserData,
    instructor: UserData,
    type: NotificationType,
    scheduledFor: string,
    templateData: Record<string, any>,
    channels: NotificationChannel[]
  ): Promise<void> {
    // Schedule for user
    await this.notificationService.createNotification({
      userId: user.id,
      title: this.getLocalizedTitle(type, user.preferred_language),
      message: this.getLocalizedMessage(type, user.preferred_language, templateData),
      category: 'schedule',
      type,
      priority: type === 'appointment_reminder_15m' ? 'urgent' : 'high',
      channels,
      scheduledFor,
      link: `/dashboard/appointments/${appointment.id}`,
      templateKey: type,
      templateData,
      actionData: {
        appointment_id: appointment.id,
        action_type: 'reminder',
        urgency_level: type === 'appointment_reminder_15m' ? 'urgent' : 'normal'
      }
    });

    // Schedule for instructor
    await this.notificationService.createNotification({
      userId: instructor.id,
      title: this.getLocalizedTitle(type, instructor.preferred_language),
      message: this.getLocalizedMessage(type, instructor.preferred_language, templateData),
      category: 'schedule',
      type,
      priority: type === 'appointment_reminder_15m' ? 'urgent' : 'high',
      channels,
      scheduledFor,
      link: `/instructor/appointments/${appointment.id}`,
      templateKey: type,
      templateData,
      actionData: {
        appointment_id: appointment.id,
        action_type: 'reminder',
        urgency_level: type === 'appointment_reminder_15m' ? 'urgent' : 'normal'
      }
    });
  }

  // =============================================================================
  // STATUS CHANGE NOTIFICATIONS
  // =============================================================================

  /**
   * Send cancellation notification to both parties
   */
  async sendCancellationNotification(
    appointment: AppointmentData,
    appointmentType: AppointmentTypeData,
    user: UserData,
    instructor: UserData,
    cancelledBy: 'user' | 'instructor' | 'system',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const templateData = {
        ...this.prepareAppointmentTemplateData(appointment, appointmentType, user, instructor),
        cancellation_reason: reason || '',
        cancelled_by: cancelledBy,
        cancelled_by_name: cancelledBy === 'user' ? user.full_name : 
                          cancelledBy === 'instructor' ? instructor.full_name : '시스템'
      };

      const channels: NotificationChannel[] = ['in_app', 'email'];

      // Send to user (unless user cancelled)
      if (cancelledBy !== 'user') {
        await this.notificationService.createNotification({
          userId: user.id,
          title: this.getLocalizedTitle('appointment_cancelled', user.preferred_language),
          message: this.getLocalizedMessage('appointment_cancelled', user.preferred_language, templateData),
          category: 'schedule',
          type: 'appointment_cancelled',
          priority: 'high',
          channels,
          link: `/dashboard/appointments`,
          templateKey: 'appointment_cancelled',
          templateData,
          actionData: {
            appointment_id: appointment.id,
            action_type: 'cancellation',
            can_rebook: true
          }
        });
      }

      // Send to instructor (unless instructor cancelled)
      if (cancelledBy !== 'instructor') {
        await this.notificationService.createNotification({
          userId: instructor.id,
          title: this.getLocalizedTitle('appointment_cancelled', instructor.preferred_language),
          message: this.getLocalizedMessage('appointment_cancelled', instructor.preferred_language, templateData),
          category: 'schedule',
          type: 'appointment_cancelled',
          priority: 'high',
          channels,
          link: `/instructor/appointments`,
          templateKey: 'appointment_cancelled',
          templateData,
          actionData: {
            appointment_id: appointment.id,
            action_type: 'cancellation',
            time_slot_available: true
          }
        });
      }

      return { success: true };

    } catch (error) {
      console.error('Error sending cancellation notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send reschedule notification to both parties
   */
  async sendRescheduleNotification(
    originalAppointment: AppointmentData,
    newAppointment: AppointmentData,
    appointmentType: AppointmentTypeData,
    user: UserData,
    instructor: UserData,
    rescheduledBy: 'user' | 'instructor' | 'system'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const templateData = {
        ...this.prepareAppointmentTemplateData(newAppointment, appointmentType, user, instructor),
        original_date: this.formatDate(originalAppointment.date),
        original_time: this.formatTime(originalAppointment.start_time),
        rescheduled_by: rescheduledBy,
        rescheduled_by_name: rescheduledBy === 'user' ? user.full_name : 
                            rescheduledBy === 'instructor' ? instructor.full_name : '시스템'
      };

      const channels: NotificationChannel[] = ['in_app', 'email'];

      // Send to both parties
      const notifications = [
        {
          userId: user.id,
          link: `/dashboard/appointments/${newAppointment.id}`,
          language: user.preferred_language
        },
        {
          userId: instructor.id,
          link: `/instructor/appointments/${newAppointment.id}`,
          language: instructor.preferred_language
        }
      ];

      for (const notif of notifications) {
        await this.notificationService.createNotification({
          userId: notif.userId,
          title: this.getLocalizedTitle('appointment_rescheduled', notif.language),
          message: this.getLocalizedMessage('appointment_rescheduled', notif.language, templateData),
          category: 'schedule',
          type: 'appointment_rescheduled',
          priority: 'high',
          channels,
          link: notif.link,
          templateKey: 'appointment_rescheduled',
          templateData,
          actionData: {
            appointment_id: newAppointment.id,
            action_type: 'reschedule',
            calendar_update_required: true
          }
        });
      }

      return { success: true };

    } catch (error) {
      console.error('Error sending reschedule notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send completion notification with feedback request
   */
  async sendCompletionNotification(
    appointment: AppointmentData,
    appointmentType: AppointmentTypeData,
    user: UserData,
    instructor: UserData,
    completedBy: 'instructor' | 'system' = 'instructor'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const templateData = {
        ...this.prepareAppointmentTemplateData(appointment, appointmentType, user, instructor),
        completed_by: completedBy,
        feedback_url: `/appointments/${appointment.id}/feedback`
      };

      const channels: NotificationChannel[] = ['in_app', 'email'];

      // Send to user
      await this.notificationService.createNotification({
        userId: user.id,
        title: this.getLocalizedTitle('appointment_completed', user.preferred_language),
        message: this.getLocalizedMessage('appointment_completed', user.preferred_language, templateData),
        category: 'schedule',
        type: 'appointment_completed',
        priority: 'normal',
        channels,
        link: `/appointments/${appointment.id}/feedback`,
        templateKey: 'appointment_completed',
        templateData,
        actionData: {
          appointment_id: appointment.id,
          action_type: 'completion',
          feedback_requested: true
        }
      });

      return { success: true };

    } catch (error) {
      console.error('Error sending completion notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send no-show notification
   */
  async sendNoShowNotification(
    appointment: AppointmentData,
    appointmentType: AppointmentTypeData,
    user: UserData,
    instructor: UserData,
    noShowBy: 'user' | 'instructor'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const templateData = {
        ...this.prepareAppointmentTemplateData(appointment, appointmentType, user, instructor),
        no_show_party: noShowBy,
        rebook_url: '/scheduling'
      };

      const channels: NotificationChannel[] = ['in_app', 'email'];

      // Send to the party that showed up
      const notifyUserId = noShowBy === 'user' ? instructor.id : user.id;
      const notifyLanguage = noShowBy === 'user' ? instructor.preferred_language : user.preferred_language;
      const notifyLink = noShowBy === 'user' ? '/instructor/appointments' : '/dashboard/appointments';

      await this.notificationService.createNotification({
        userId: notifyUserId,
        title: this.getLocalizedTitle('appointment_no_show', notifyLanguage),
        message: this.getLocalizedMessage('appointment_no_show', notifyLanguage, templateData),
        category: 'schedule',
        type: 'appointment_no_show',
        priority: 'high',
        channels,
        link: notifyLink,
        templateKey: 'appointment_no_show',
        templateData,
        actionData: {
          appointment_id: appointment.id,
          action_type: 'no_show',
          no_show_party: noShowBy
        }
      });

      return { success: true };

    } catch (error) {
      console.error('Error sending no-show notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send waitlist availability notification
   */
  async sendWaitlistAvailableNotification(
    appointment: AppointmentData,
    appointmentType: AppointmentTypeData,
    waitlistedUsers: UserData[],
    instructor: UserData
  ): Promise<{ success: boolean; notifiedUsers: number }> {
    let notifiedUsers = 0;

    try {
      for (const user of waitlistedUsers) {
        const templateData = this.prepareAppointmentTemplateData(
          appointment,
          appointmentType,
          user,
          instructor
        );

        await this.notificationService.createNotification({
          userId: user.id,
          title: this.getLocalizedTitle('waitlist_available', user.preferred_language),
          message: this.getLocalizedMessage('waitlist_available', user.preferred_language, templateData),
          category: 'schedule',
          type: 'waitlist_available',
          priority: 'urgent',
          channels: ['in_app', 'push', 'email'],
          // Expire in 30 minutes to maintain urgency
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          link: `/scheduling/book/${appointment.id}`,
          templateKey: 'waitlist_available',
          templateData,
          actionData: {
            appointment_id: appointment.id,
            action_type: 'waitlist_availability',
            expires_soon: true
          }
        });

        notifiedUsers++;
      }

      return { success: true, notifiedUsers };

    } catch (error) {
      console.error('Error sending waitlist notifications:', error);
      return { success: false, notifiedUsers };
    }
  }

  // =============================================================================
  // CALENDAR INTEGRATION
  // =============================================================================

  /**
   * Generate ICS calendar file for appointment
   */
  generateICSFile(
    appointment: AppointmentData,
    appointmentType: AppointmentTypeData,
    user: UserData,
    instructor: UserData
  ): string {
    const startDate = new Date(`${appointment.date} ${appointment.start_time}`);
    const endDate = appointment.end_time 
      ? new Date(`${appointment.date} ${appointment.end_time}`)
      : new Date(startDate.getTime() + appointment.duration_minutes * 60 * 1000);

    const formatDateTime = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AIedulog//Appointment Booking//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:appointment-${appointment.id}@aiedulog.com`,
      `DTSTAMP:${formatDateTime(new Date())}`,
      `DTSTART:${formatDateTime(startDate)}`,
      `DTEND:${formatDateTime(endDate)}`,
      `SUMMARY:${appointment.title} - ${appointmentType.name}`,
      `DESCRIPTION:${this.generateCalendarDescription(appointment, appointmentType, user, instructor)}`,
      `LOCATION:${appointment.meeting_type === 'online' ? (appointment.meeting_link || 'Online') : (appointment.meeting_location || 'TBD')}`,
      `ORGANIZER:CN=${instructor.full_name}:MAILTO:${instructor.email}`,
      `ATTENDEE:CN=${user.full_name}:MAILTO:${user.email}`,
      'STATUS:CONFIRMED',
      'CLASS:PUBLIC',
      'TRANSP:OPAQUE',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder: Appointment in 15 minutes',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  }

  private generateCalendarDescription(
    appointment: AppointmentData,
    appointmentType: AppointmentTypeData,
    user: UserData,
    instructor: UserData
  ): string {
    const parts = [
      `약속 유형: ${appointmentType.name}`,
      `강사: ${instructor.full_name}`,
      `학생: ${user.full_name}`,
      `일시: ${this.formatDate(appointment.date)} ${this.formatTime(appointment.start_time)}`,
      `소요 시간: ${appointment.duration_minutes}분`
    ];

    if (appointment.meeting_type === 'online' && appointment.meeting_link) {
      parts.push(`미팅 링크: ${appointment.meeting_link}`);
    }

    if (appointment.meeting_type === 'offline' && appointment.meeting_location) {
      parts.push(`장소: ${appointment.meeting_location}`);
    }

    if (appointment.notes) {
      parts.push(`참고사항: ${appointment.notes}`);
    }

    return parts.join('\\n\\n');
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Prepare comprehensive template data for notifications
   */
  private prepareAppointmentTemplateData(
    appointment: AppointmentData,
    appointmentType: AppointmentTypeData,
    user: UserData,
    instructor: UserData
  ): Record<string, any> {
    return {
      // Appointment details
      appointment_id: appointment.id,
      appointment_reference: appointment.reference || `APT-${appointment.id.slice(-8).toUpperCase()}`,
      appointment_title: appointment.title,
      appointment_date: this.formatDate(appointment.date),
      appointment_time: this.formatTime(appointment.start_time),
      appointment_end_time: appointment.end_time ? this.formatTime(appointment.end_time) : null,
      appointment_duration: `${appointment.duration_minutes}분`,
      appointment_type: appointmentType.name,
      appointment_description: appointmentType.description,
      appointment_price: appointmentType.price,
      
      // User details
      user_name: user.full_name,
      user_email: user.email,
      
      // Instructor details
      instructor_name: instructor.full_name,
      instructor_email: instructor.email,
      
      // Meeting details
      meeting_type: appointment.meeting_type,
      meeting_link: appointment.meeting_link,
      meeting_location: appointment.meeting_location,
      
      // Status and notes
      appointment_status: appointment.status,
      appointment_notes: appointment.notes,
      
      // URLs
      dashboard_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/appointments`,
      appointment_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/appointments/${appointment.id}`,
      booking_url: `${process.env.NEXT_PUBLIC_SITE_URL}/scheduling`,
      
      // System info
      site_name: 'AIedulog',
      site_url: process.env.NEXT_PUBLIC_SITE_URL,
      support_email: 'support@aiedulog.com',
      
      // Formatting helpers
      formatted_datetime: `${this.formatDate(appointment.date)} ${this.formatTime(appointment.start_time)}`,
      day_of_week: this.getDayOfWeek(appointment.date),
      
      // Calendar integration
      calendar_link: `${process.env.NEXT_PUBLIC_SITE_URL}/api/appointments/${appointment.id}/calendar`,
    };
  }

  private getLocalizedTitle(type: NotificationType, language: string = 'ko'): string {
    const titles: Record<string, Record<string, string>> = {
      appointment_created: {
        ko: '예약이 완료되었습니다',
        en: 'Booking Confirmed'
      },
      instructor_new_booking: {
        ko: '새로운 예약이 있습니다',
        en: 'New Booking Received'
      },
      appointment_confirmed: {
        ko: '예약이 확정되었습니다',
        en: 'Appointment Confirmed'
      },
      appointment_reminder_24h: {
        ko: '내일 약속이 있습니다',
        en: 'Appointment Tomorrow'
      },
      appointment_reminder_1h: {
        ko: '1시간 후 약속이 있습니다',
        en: 'Appointment in 1 Hour'
      },
      appointment_reminder_15m: {
        ko: '곧 약속 시간입니다',
        en: 'Appointment Starting Soon'
      },
      appointment_cancelled: {
        ko: '예약이 취소되었습니다',
        en: 'Appointment Cancelled'
      },
      appointment_rescheduled: {
        ko: '예약 시간이 변경되었습니다',
        en: 'Appointment Rescheduled'
      },
      appointment_completed: {
        ko: '수업이 완료되었습니다',
        en: 'Session Completed'
      },
      appointment_no_show: {
        ko: '약속에 참석하지 않았습니다',
        en: 'No Show Recorded'
      },
      waitlist_available: {
        ko: '원하시는 시간대가 예약 가능합니다',
        en: 'Slot Available'
      }
    };

    return titles[type]?.[language] || titles[type]?.['ko'] || type;
  }

  private getLocalizedMessage(
    type: NotificationType, 
    language: string = 'ko', 
    data: Record<string, any>
  ): string {
    const messages: Record<string, Record<string, string>> = {
      appointment_created: {
        ko: `${data.appointment_type} 예약이 완료되었습니다. 일시: ${data.formatted_datetime}`,
        en: `Your ${data.appointment_type} booking is confirmed for ${data.formatted_datetime}`
      },
      instructor_new_booking: {
        ko: `${data.user_name}님이 ${data.appointment_type}을 예약했습니다. 일시: ${data.formatted_datetime}`,
        en: `${data.user_name} booked ${data.appointment_type} for ${data.formatted_datetime}`
      },
      appointment_confirmed: {
        ko: `${data.instructor_name} 강사님이 예약을 확정했습니다. 준비해주세요!`,
        en: `${data.instructor_name} confirmed your appointment. Get ready!`
      },
      appointment_reminder_24h: {
        ko: `내일 ${data.appointment_time}에 ${data.appointment_type} 약속이 있습니다.`,
        en: `You have ${data.appointment_type} tomorrow at ${data.appointment_time}`
      },
      appointment_reminder_1h: {
        ko: `1시간 후 ${data.appointment_type} 약속이 시작됩니다.`,
        en: `Your ${data.appointment_type} starts in 1 hour`
      },
      appointment_reminder_15m: {
        ko: `15분 후 ${data.appointment_type} 약속이 시작됩니다. 준비해주세요!`,
        en: `Your ${data.appointment_type} starts in 15 minutes. Get ready!`
      },
      appointment_cancelled: {
        ko: `${data.appointment_type} 예약이 취소되었습니다.`,
        en: `Your ${data.appointment_type} appointment has been cancelled`
      },
      appointment_rescheduled: {
        ko: `예약이 ${data.appointment_date} ${data.appointment_time}으로 변경되었습니다.`,
        en: `Your appointment has been rescheduled to ${data.appointment_date} ${data.appointment_time}`
      },
      appointment_completed: {
        ko: `${data.appointment_type} 수업이 완료되었습니다. 후기를 남겨주세요!`,
        en: `Your ${data.appointment_type} session is complete. Please leave feedback!`
      },
      appointment_no_show: {
        ko: `예약하신 ${data.appointment_type}에 참석하지 않으셨습니다.`,
        en: `You missed your ${data.appointment_type} appointment`
      },
      waitlist_available: {
        ko: `${data.appointment_type} - ${data.formatted_datetime} 시간대가 예약 가능합니다!`,
        en: `${data.appointment_type} slot available for ${data.formatted_datetime}!`
      }
    };

    return messages[type]?.[language] || messages[type]?.['ko'] || `Notification: ${type}`;
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }

  private formatTime(timeString: string): string {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('ko-KR', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  private getDayOfWeek(dateString: string): string {
    const date = new Date(dateString);
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return days[date.getDay()];
  }
}

// Export factory function for server-side usage
export const createSchedulingNotificationService = () => new SchedulingNotificationService();

// Export singleton getter
export const getSchedulingNotificationService = () => createSchedulingNotificationService();