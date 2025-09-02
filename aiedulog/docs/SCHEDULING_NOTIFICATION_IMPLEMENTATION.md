# Scheduling Notification System Implementation Guide

## Overview

This document outlines the comprehensive notification system for the scheduling functionality, including templates, services, and API endpoints that have been implemented.

## 🎯 Features Implemented

### 1. Notification Templates
- **11 comprehensive notification types** for scheduling events
- **Bilingual support** (Korean & English)
- **Multi-channel delivery** (in-app, email, push, SMS)
- **Professional email templates** with HTML formatting
- **Calendar integration** support

### 2. Notification Types Covered

#### Booking Flow
- `appointment_created` - Booking confirmation for users
- `instructor_new_booking` - New booking alert for instructors
- `appointment_confirmed` - Instructor confirmation notification

#### Reminders
- `appointment_reminder_24h` - 24-hour advance reminder
- `appointment_reminder_1h` - 1-hour advance reminder  
- `appointment_reminder_15m` - 15-minute urgent reminder

#### Status Changes
- `appointment_cancelled` - Cancellation notifications
- `appointment_rescheduled` - Reschedule notifications
- `appointment_completed` - Completion with feedback request
- `appointment_no_show` - No-show notifications

#### Waitlist
- `waitlist_available` - Slot availability alert

### 3. Services Created

#### SchedulingNotificationService
**Location**: `/src/lib/services/scheduling-notifications.ts`

**Key Methods**:
- `sendBookingConfirmation()` - Comprehensive booking notifications
- `sendAppointmentConfirmation()` - Instructor confirmation flow
- `scheduleReminderNotifications()` - Smart reminder scheduling
- `sendCancellationNotification()` - Cancellation handling
- `sendRescheduleNotification()` - Reschedule communications
- `sendCompletionNotification()` - Post-appointment feedback
- `sendNoShowNotification()` - No-show handling
- `sendWaitlistAvailableNotification()` - Waitlist management
- `generateICSFile()` - Calendar file generation

#### Enhanced SchedulingService
**Location**: `/src/lib/services/scheduling-service.ts`

**New Methods Added**:
- `confirmAppointment()` - Instructor confirmation with notifications
- `completeAppointment()` - Mark complete with feedback request
- `markNoShow()` - Handle no-show scenarios

**Updated Methods**:
- Enhanced `createBooking()` with comprehensive notifications
- Enhanced `rescheduleAppointment()` with proper notifications
- Enhanced `cancelAppointment()` with detailed communications

### 4. API Endpoints

#### Scheduling Notifications API
**Location**: `/src/app/api/notifications/scheduling/route.ts`

**Supported Actions**:

**POST** `/api/notifications/scheduling`
- `send_booking_confirmation` - Send booking confirmation
- `send_appointment_confirmation` - Send appointment confirmation
- `schedule_reminders` - Schedule reminder notifications
- `send_cancellation` - Send cancellation notifications
- `send_reschedule` - Send reschedule notifications
- `send_completion` - Send completion notifications
- `send_no_show` - Send no-show notifications
- `send_waitlist_available` - Send waitlist notifications
- `generate_calendar_file` - Generate ICS calendar file

**GET** `/api/notifications/scheduling`
- `get_notification_preferences` - Get user preferences
- `get_appointment_notifications` - Get appointment-specific notifications

**PUT** `/api/notifications/scheduling`
- `update_notification_preferences` - Update notification preferences

## 📋 Database Migration

### Migration File
**Location**: `/supabase/migrations/20250901_scheduling_notification_templates.sql`

**What it includes**:
- All 11 notification templates in Korean
- Key templates in English for international users
- Comprehensive template variables for data substitution
- Default notification preferences for scheduling category
- Proper categorization and channel configuration

### To Apply Migration

```bash
# If using Supabase CLI
supabase db push

# Or run the SQL directly in your Supabase dashboard
# Copy contents of 20250901_scheduling_notification_templates.sql
```

## 🚀 Usage Examples

### 1. Basic Booking with Notifications

```typescript
import { schedulingService } from '@/lib/services/scheduling-service';

const bookingResult = await schedulingService.createBooking({
  instructor_id: 'instructor-uuid',
  appointment_type_id: 'type-uuid',
  appointment_date: '2024-09-15',
  start_time: '14:00',
  title: 'English Conversation Lesson',
  send_notifications: true // This triggers comprehensive notifications
}, userId);

if (bookingResult.success) {
  console.log('Booking created with notifications sent');
}
```

### 2. Instructor Confirmation

```typescript
const confirmResult = await schedulingService.confirmAppointment(
  appointmentId,
  instructorId
);

// This automatically sends confirmation notification to the user
```

### 3. Custom Notification Configuration

```typescript
import { schedulingNotificationService } from '@/lib/services/scheduling-notifications';

await schedulingNotificationService.sendBookingConfirmation(
  appointment,
  appointmentType,
  {
    emailNotifications: true,
    pushNotifications: true,
    reminder24h: true,
    reminder1h: true,
    reminder15m: false // Skip 15-minute reminder
  }
);
```

### 4. Calendar File Generation

```typescript
// Generate ICS file for appointment
const icsContent = schedulingNotificationService.generateICSFile(
  appointment,
  appointmentType
);

// Or via API
const response = await fetch('/api/notifications/scheduling', {
  method: 'POST',
  body: JSON.stringify({
    action: 'generate_calendar_file',
    appointmentId: 'appointment-uuid'
  })
});

const icsFile = await response.text();
```

## 🎨 Template Customization

### Email Templates
All email templates support HTML formatting and include:
- Professional styling with inline CSS
- Action buttons for meeting links
- Responsive design for mobile devices
- Branded elements (can be customized)

### Template Variables
Each template supports rich data substitution:

```javascript
{
  "appointment_date": "2024년 9월 15일 일요일",
  "appointment_time": "오후 2:00",
  "instructor_name": "김영희",
  "appointment_type": "영어 회화 수업",
  "meeting_link": "https://meet.google.com/abc-def-ghi",
  "booking_reference": "APT-2024-001",
  // ... many more variables
}
```

## ⚙️ Configuration Options

### Notification Preferences
Users can control:
- Channel preferences (in-app, email, push, SMS)
- Quiet hours
- Reminder timing preferences
- Frequency controls
- Category-specific settings

### System Configuration
Environment variables needed:
```env
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
# For calendar links and dashboard links in emails
```

## 🔧 Integration Points

### 1. With Scheduling System
- Automatic notification sending on booking events
- Smart reminder scheduling based on appointment time
- Status-change notifications (confirm, cancel, reschedule)

### 2. With User Preferences
- Respects user notification preferences
- Channel selection (in-app, email, push)
- Quiet hours and frequency controls

### 3. With Calendar Systems
- ICS file generation for calendar imports
- Google Calendar integration links
- Meeting platform integration (Zoom, Google Meet)

## 🧪 Testing

### Test Notification Flow
```typescript
// Test booking confirmation
await fetch('/api/notifications/scheduling', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'send_booking_confirmation',
    appointmentId: 'test-appointment-id',
    config: {
      emailNotifications: true,
      reminder24h: true
    }
  })
});
```

### Template Testing
- All templates include sample data for testing
- Email templates can be previewed in browser
- Push notification formats are mobile-optimized

## 🚨 Error Handling

The system includes comprehensive error handling:
- Graceful degradation if notifications fail
- Retry mechanisms for failed deliveries
- Detailed logging for debugging
- User-friendly error messages

## 📊 Analytics & Tracking

Built-in analytics track:
- Notification delivery rates
- Open rates for emails
- Click-through rates
- Channel effectiveness
- Template performance

## 🔐 Security

- All notifications respect RLS policies
- Template variables are sanitized
- User permissions are verified
- Audit trails for all notifications

## 📱 Mobile Support

- Push notifications for mobile apps
- Responsive email templates
- SMS support for urgent notifications
- Offline notification queuing

## 🌐 Internationalization

- Korean templates (default)
- English templates for international users
- Extensible for additional languages
- Date/time localization support

## 🎯 Next Steps

1. **Apply the migration** to install templates
2. **Configure environment variables** for site URL
3. **Test notification flow** with sample appointments
4. **Customize email templates** with branding
5. **Set up push notification services** (Firebase, etc.)
6. **Configure SMS provider** if needed
7. **Monitor analytics** and optimize templates

## 📞 Support

For implementation questions:
1. Check template variables match your data structure
2. Verify notification preferences are set correctly
3. Test with sample appointments first
4. Monitor delivery tracking in notification_deliveries table

The system is designed to be comprehensive yet flexible, allowing for easy customization while providing professional-grade notification capabilities out of the box.