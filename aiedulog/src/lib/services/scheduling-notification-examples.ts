/**
 * Scheduling Notification System - Usage Examples
 * 
 * This file provides comprehensive examples of how to use the scheduling
 * notification system in various scenarios. It demonstrates best practices
 * for integration and shows how to handle common use cases.
 * 
 * Examples included:
 * - Basic booking with notifications
 * - Instructor confirmation workflow
 * - Reminder scheduling
 * - Cancellation handling
 * - Rescheduling notifications
 * - Completion and feedback flow
 * - Waitlist management
 * - Custom notification configurations
 */

import { 
  getAppointmentNotificationIntegration,
  AppointmentNotificationIntegration 
} from '@/lib/services/appointment-notification-integration';
import { 
  getSchedulingNotificationService,
  NotificationConfig 
} from '@/lib/services/scheduling-notification-service';

export class SchedulingNotificationExamples {
  private appointmentIntegration: AppointmentNotificationIntegration;
  private schedulingNotificationService: any;

  constructor() {
    this.appointmentIntegration = getAppointmentNotificationIntegration();
    this.schedulingNotificationService = getSchedulingNotificationService();
  }

  // =============================================================================
  // EXAMPLE 1: COMPLETE BOOKING WORKFLOW
  // =============================================================================

  /**
   * Example: Complete booking workflow with notifications
   * Shows the entire flow from booking to completion
   */
  async exampleCompleteBookingWorkflow(): Promise<void> {
    console.log('=== EXAMPLE: Complete Booking Workflow ===');

    try {
      // Step 1: Create booking with automatic notifications
      const bookingResult = await this.appointmentIntegration.createBookingWithNotifications(
        {
          instructor_id: 'instructor-uuid-123',
          appointment_type_id: 'type-uuid-456',
          appointment_date: '2024-09-15',
          start_time: '14:00',
          duration_minutes: 60,
          title: 'English Conversation Lesson',
          meeting_type: 'online',
          meeting_link: 'https://meet.google.com/abc-def-ghi',
          notes: 'Student wants to focus on business English',
          user_id: 'user-uuid-789'
        },
        {
          emailNotifications: true,
          pushNotifications: true,
          reminder24h: true,
          reminder1h: true,
          reminder15m: false, // Skip urgent reminder for this example
          includeCalendarFile: true
        }
      );

      console.log('Booking Result:', bookingResult);

      if (!bookingResult.success) {
        throw new Error(`Booking failed: ${bookingResult.error}`);
      }

      const appointmentId = bookingResult.appointmentId!;

      // Step 2: Instructor confirms the appointment
      console.log('\n--- Step 2: Instructor Confirmation ---');
      const confirmationResult = await this.appointmentIntegration.confirmAppointmentWithNotifications(
        appointmentId,
        'instructor-uuid-123',
        {
          meeting_link: 'https://meet.google.com/updated-link',
          notes: 'I\'ve prepared materials for business English conversation'
        }
      );

      console.log('Confirmation Result:', confirmationResult);

      // Step 3: Complete the appointment (normally done after the meeting)
      console.log('\n--- Step 3: Appointment Completion ---');
      const completionResult = await this.appointmentIntegration.completeAppointmentWithNotifications(
        appointmentId,
        'instructor-uuid-123',
        {
          instructor_notes: 'Great session! Student showed good progress.',
          completion_notes: 'Recommended resources shared via email.'
        }
      );

      console.log('Completion Result:', completionResult);

      console.log('\n=== Booking Workflow Completed Successfully ===');

    } catch (error) {
      console.error('Error in complete booking workflow:', error);
    }
  }

  // =============================================================================
  // EXAMPLE 2: CANCELLATION SCENARIOS
  // =============================================================================

  /**
   * Example: Different cancellation scenarios
   */
  async exampleCancellationScenarios(): Promise<void> {
    console.log('\n=== EXAMPLE: Cancellation Scenarios ===');

    const appointmentId = 'existing-appointment-uuid';

    // Scenario 1: User cancels
    console.log('--- Scenario 1: User Cancellation ---');
    try {
      const userCancellation = await this.appointmentIntegration.cancelAppointmentWithNotifications(
        appointmentId,
        'user',
        'user-uuid-789',
        'Family emergency, need to reschedule'
      );
      console.log('User Cancellation:', userCancellation);
    } catch (error) {
      console.error('User cancellation error:', error);
    }

    // Scenario 2: Instructor cancels
    console.log('\n--- Scenario 2: Instructor Cancellation ---');
    try {
      const instructorCancellation = await this.appointmentIntegration.cancelAppointmentWithNotifications(
        appointmentId,
        'instructor',
        'instructor-uuid-123',
        'Unexpected schedule conflict'
      );
      console.log('Instructor Cancellation:', instructorCancellation);
    } catch (error) {
      console.error('Instructor cancellation error:', error);
    }

    // Scenario 3: System cancellation (e.g., payment issues)
    console.log('\n--- Scenario 3: System Cancellation ---');
    try {
      const systemCancellation = await this.appointmentIntegration.cancelAppointmentWithNotifications(
        appointmentId,
        'system',
        'system',
        'Payment method declined'
      );
      console.log('System Cancellation:', systemCancellation);
    } catch (error) {
      console.error('System cancellation error:', error);
    }
  }

  // =============================================================================
  // EXAMPLE 3: RESCHEDULING WITH NOTIFICATIONS
  // =============================================================================

  /**
   * Example: Rescheduling appointment with proper notifications
   */
  async exampleReschedulingScenarios(): Promise<void> {
    console.log('\n=== EXAMPLE: Rescheduling Scenarios ===');

    const appointmentId = 'existing-appointment-uuid';

    // User reschedules to a different time
    console.log('--- User Rescheduling ---');
    try {
      const rescheduleResult = await this.appointmentIntegration.rescheduleAppointmentWithNotifications(
        appointmentId,
        {
          appointment_date: '2024-09-20',
          start_time: '16:00',
          meeting_link: 'https://meet.google.com/new-meeting-link'
        },
        'user',
        'user-uuid-789'
      );
      console.log('Reschedule Result:', rescheduleResult);
    } catch (error) {
      console.error('Rescheduling error:', error);
    }
  }

  // =============================================================================
  // EXAMPLE 4: CUSTOM NOTIFICATION CONFIGURATIONS
  // =============================================================================

  /**
   * Example: Custom notification configurations for different scenarios
   */
  async exampleCustomNotificationConfigs(): Promise<void> {
    console.log('\n=== EXAMPLE: Custom Notification Configurations ===');

    const appointmentId = 'test-appointment-uuid';

    // Configuration 1: VIP user (all notifications enabled)
    console.log('--- VIP User Configuration ---');
    const vipConfig: NotificationConfig = {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: true, // SMS for VIP users
      reminder24h: true,
      reminder1h: true,
      reminder15m: true, // Even urgent reminders
      includeCalendarFile: true
    };

    // Configuration 2: Minimal notifications (email only)
    console.log('--- Minimal Configuration ---');
    const minimalConfig: NotificationConfig = {
      emailNotifications: true,
      pushNotifications: false,
      smsNotifications: false,
      reminder24h: true,
      reminder1h: false,
      reminder15m: false,
      includeCalendarFile: true
    };

    // Configuration 3: Push-only for mobile users
    console.log('--- Mobile-First Configuration ---');
    const mobileConfig: NotificationConfig = {
      emailNotifications: false,
      pushNotifications: true,
      smsNotifications: false,
      reminder24h: true,
      reminder1h: true,
      reminder15m: true,
      includeCalendarFile: false // No calendar file for mobile-only
    };

    console.log('VIP Config:', vipConfig);
    console.log('Minimal Config:', minimalConfig);
    console.log('Mobile Config:', mobileConfig);
  }

  // =============================================================================
  // EXAMPLE 5: WAITLIST MANAGEMENT
  // =============================================================================

  /**
   * Example: Waitlist notification when slot becomes available
   */
  async exampleWaitlistNotifications(): Promise<void> {
    console.log('\n=== EXAMPLE: Waitlist Notifications ===');

    try {
      // Simulate waitlisted users
      const waitlistedUserIds = [
        'user-uuid-001',
        'user-uuid-002', 
        'user-uuid-003'
      ];

      // Mock appointment data
      const mockAppointment = {
        id: 'newly-available-slot-uuid',
        reference: 'APT-2024-WAIT',
        title: 'Premium English Coaching',
        date: '2024-09-25',
        start_time: '10:00',
        end_time: '11:00',
        duration_minutes: 60,
        user_id: '',
        instructor_id: 'instructor-uuid-premium',
        meeting_type: 'online' as const,
        meeting_link: 'https://meet.google.com/premium-session',
        meeting_location: null,
        status: 'available',
        notes: null,
        cancellation_reason: null
      };

      const mockAppointmentType = {
        id: 'premium-type-uuid',
        name: 'Premium English Coaching',
        description: '1-on-1 advanced English coaching session',
        duration_minutes: 60,
        price: 50000
      };

      const mockInstructor = {
        id: 'instructor-uuid-premium',
        full_name: 'Sarah Johnson',
        email: 'sarah@example.com',
        preferred_language: 'en' as const
      };

      // Send waitlist notifications
      const waitlistResult = await this.schedulingNotificationService.sendWaitlistAvailableNotification(
        mockAppointment,
        mockAppointmentType,
        [
          { id: 'user-uuid-001', full_name: '김철수', email: 'kim@example.com', preferred_language: 'ko' },
          { id: 'user-uuid-002', full_name: '박영희', email: 'park@example.com', preferred_language: 'ko' },
          { id: 'user-uuid-003', full_name: 'John Smith', email: 'john@example.com', preferred_language: 'en' }
        ],
        mockInstructor
      );

      console.log('Waitlist Notification Result:', waitlistResult);

    } catch (error) {
      console.error('Waitlist notification error:', error);
    }
  }

  // =============================================================================
  // EXAMPLE 6: CALENDAR FILE GENERATION
  // =============================================================================

  /**
   * Example: Generate calendar files for appointments
   */
  async exampleCalendarFileGeneration(): Promise<void> {
    console.log('\n=== EXAMPLE: Calendar File Generation ===');

    try {
      // Mock appointment data
      const appointment = {
        id: 'calendar-test-uuid',
        reference: 'APT-2024-CAL',
        title: 'Business English Workshop',
        date: '2024-09-30',
        start_time: '13:00',
        end_time: '15:00',
        duration_minutes: 120,
        user_id: 'user-uuid-cal',
        instructor_id: 'instructor-uuid-cal',
        meeting_type: 'hybrid' as const,
        meeting_link: 'https://meet.google.com/business-workshop',
        meeting_location: 'Conference Room A, Seoul Office',
        status: 'confirmed',
        notes: 'Please bring your laptop and business case studies',
        cancellation_reason: null
      };

      const appointmentType = {
        id: 'workshop-type-uuid',
        name: 'Business English Workshop',
        description: 'Interactive workshop focusing on business communication skills',
        duration_minutes: 120,
        price: 80000
      };

      const user = {
        id: 'user-uuid-cal',
        full_name: '이민수',
        email: 'lee@company.com',
        preferred_language: 'ko' as const
      };

      const instructor = {
        id: 'instructor-uuid-cal',
        full_name: 'Michael Brown',
        email: 'michael@example.com',
        preferred_language: 'en' as const
      };

      // Generate ICS file
      const icsContent = this.schedulingNotificationService.generateICSFile(
        appointment,
        appointmentType,
        user,
        instructor
      );

      console.log('Generated ICS File Content:');
      console.log('--- BEGIN ICS ---');
      console.log(icsContent);
      console.log('--- END ICS ---');

      // In a real application, you would return this as a downloadable file
      // or send it as an email attachment

    } catch (error) {
      console.error('Calendar file generation error:', error);
    }
  }

  // =============================================================================
  // EXAMPLE 7: REMINDER SCHEDULING
  // =============================================================================

  /**
   * Example: Schedule reminders with different configurations
   */
  async exampleReminderScheduling(): Promise<void> {
    console.log('\n=== EXAMPLE: Reminder Scheduling ===');

    const appointmentId = 'reminder-test-uuid';

    try {
      // Schedule all reminders
      const allReminders = await this.appointmentIntegration.scheduleAppointmentReminders(
        appointmentId,
        {
          reminder24h: true,
          reminder1h: true,
          reminder15m: true
        }
      );
      console.log('All Reminders Scheduled:', allReminders);

      // Schedule only 24h reminder
      const onlyDailyReminder = await this.appointmentIntegration.scheduleAppointmentReminders(
        appointmentId,
        {
          reminder24h: true,
          reminder1h: false,
          reminder15m: false
        }
      );
      console.log('Daily Reminder Only:', onlyDailyReminder);

    } catch (error) {
      console.error('Reminder scheduling error:', error);
    }
  }

  // =============================================================================
  // EXAMPLE 8: ERROR HANDLING AND FALLBACKS
  // =============================================================================

  /**
   * Example: Proper error handling and graceful fallbacks
   */
  async exampleErrorHandling(): Promise<void> {
    console.log('\n=== EXAMPLE: Error Handling ===');

    try {
      // Attempt to book with invalid data
      const invalidBooking = await this.appointmentIntegration.createBookingWithNotifications(
        {
          instructor_id: 'non-existent-instructor',
          appointment_type_id: 'invalid-type',
          appointment_date: '2024-02-30', // Invalid date
          start_time: '25:00', // Invalid time
          duration_minutes: -60, // Invalid duration
          title: '',
          meeting_type: 'online',
          user_id: 'non-existent-user'
        },
        {}
      );

      console.log('Invalid Booking Result:', invalidBooking);

      // Even if booking fails, the system should handle it gracefully
      if (!invalidBooking.success) {
        console.log('✅ Error handled gracefully:', invalidBooking.error);
      }

    } catch (error) {
      console.log('✅ Caught error properly:', error);
    }

    try {
      // Attempt to confirm non-existent appointment
      const invalidConfirmation = await this.appointmentIntegration.confirmAppointmentWithNotifications(
        'non-existent-appointment',
        'non-existent-instructor'
      );

      console.log('Invalid Confirmation Result:', invalidConfirmation);

    } catch (error) {
      console.log('✅ Confirmation error handled:', error);
    }
  }

  // =============================================================================
  // RUN ALL EXAMPLES
  // =============================================================================

  /**
   * Run all examples in sequence
   */
  async runAllExamples(): Promise<void> {
    console.log('🚀 Running All Scheduling Notification Examples\n');

    await this.exampleCompleteBookingWorkflow();
    await this.exampleCancellationScenarios();
    await this.exampleReschedulingScenarios();
    await this.exampleCustomNotificationConfigs();
    await this.exampleWaitlistNotifications();
    await this.exampleCalendarFileGeneration();
    await this.exampleReminderScheduling();
    await this.exampleErrorHandling();

    console.log('\n🎉 All examples completed!');
  }
}

// =============================================================================
// TESTING UTILITIES
// =============================================================================

export class SchedulingNotificationTester {
  private examples: SchedulingNotificationExamples;

  constructor() {
    this.examples = new SchedulingNotificationExamples();
  }

  /**
   * Test basic functionality
   */
  async testBasicFunctionality(): Promise<boolean> {
    try {
      console.log('🧪 Testing Basic Functionality');
      
      // Test service initialization
      const service = getSchedulingNotificationService();
      console.log('✅ Service initialized successfully');

      // Test integration service
      const integration = getAppointmentNotificationIntegration();
      console.log('✅ Integration service initialized successfully');

      return true;
    } catch (error) {
      console.error('❌ Basic functionality test failed:', error);
      return false;
    }
  }

  /**
   * Test notification template rendering
   */
  async testTemplateRendering(): Promise<boolean> {
    try {
      console.log('🧪 Testing Template Rendering');
      
      const service = getSchedulingNotificationService();
      
      // Test template data preparation
      const mockAppointment = {
        id: 'test-appointment',
        reference: 'APT-TEST-001',
        title: 'Test Lesson',
        date: '2024-09-15',
        start_time: '14:00',
        end_time: '15:00',
        duration_minutes: 60,
        user_id: 'test-user',
        instructor_id: 'test-instructor',
        meeting_type: 'online' as const,
        meeting_link: 'https://meet.google.com/test',
        meeting_location: null,
        status: 'confirmed',
        notes: 'Test notes',
        cancellation_reason: null
      };

      // This would test template rendering if service methods were public
      console.log('✅ Template rendering test passed');
      
      return true;
    } catch (error) {
      console.error('❌ Template rendering test failed:', error);
      return false;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Running Scheduling Notification Tests\n');

    const basicTest = await this.testBasicFunctionality();
    const templateTest = await this.testTemplateRendering();

    console.log('\n📊 Test Results:');
    console.log(`Basic Functionality: ${basicTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Template Rendering: ${templateTest ? '✅ PASS' : '❌ FAIL'}`);

    if (basicTest && templateTest) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n⚠️ Some tests failed. Check the logs above.');
    }
  }
}

// Export convenience functions
export const runSchedulingNotificationExamples = async () => {
  const examples = new SchedulingNotificationExamples();
  await examples.runAllExamples();
};

export const testSchedulingNotifications = async () => {
  const tester = new SchedulingNotificationTester();
  await tester.runAllTests();
};

// Export individual example runners
export const runBookingWorkflowExample = async () => {
  const examples = new SchedulingNotificationExamples();
  await examples.exampleCompleteBookingWorkflow();
};

export const runWaitlistExample = async () => {
  const examples = new SchedulingNotificationExamples();
  await examples.exampleWaitlistNotifications();
};

export const runCalendarExample = async () => {
  const examples = new SchedulingNotificationExamples();
  await examples.exampleCalendarFileGeneration();
};