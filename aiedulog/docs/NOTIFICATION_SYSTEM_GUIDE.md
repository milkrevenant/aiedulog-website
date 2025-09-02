# Comprehensive Notification System Documentation

## Overview

The AiEduLog notification system is an enterprise-grade, multi-channel notification platform that integrates seamlessly with the existing scheduling system. It provides real-time notifications, template-based messaging, user preferences management, and comprehensive analytics.

## Architecture

### Core Components

1. **Database Schema**: Enhanced notification tables with scheduling integration
2. **Notification Service**: TypeScript service class for managing notifications
3. **API Endpoints**: REST APIs for CRUD operations and analytics
4. **Real-time Delivery**: Server-Sent Events and WebSocket support
5. **Admin Interface**: React components for system management
6. **Background Workers**: Queue processing for reliable delivery

### Key Features

- **Multi-channel delivery**: In-app, email, push, SMS, webhook
- **Template system**: Reusable templates with variable substitution
- **User preferences**: Granular control over notification types and channels
- **Real-time notifications**: Live updates via WebSocket/SSE
- **Analytics dashboard**: Delivery metrics and performance tracking
- **Scheduling integration**: Automatic notifications for schedule events
- **Enterprise security**: Row-level security and audit logging

## Database Schema

### Core Tables

#### `notifications`
The main table storing notification records:
```sql
- id (UUID): Primary key
- user_id (UUID): Target user
- user_group (VARCHAR): For group targeting
- title (VARCHAR): Notification title
- message (TEXT): Notification content
- category (ENUM): schedule, content, system, security, user, admin, marketing
- type (VARCHAR): Specific notification type
- priority (ENUM): low, normal, high, critical, urgent
- channels (ARRAY): Delivery channels
- schedule_id (UUID): Related schedule (optional)
- is_read (BOOLEAN): Read status
- is_archived (BOOLEAN): Archive status
- created_at (TIMESTAMPTZ): Creation time
```

#### `notification_templates`
Template definitions for consistent messaging:
```sql
- id (UUID): Primary key
- template_key (VARCHAR): Unique identifier
- template_name (VARCHAR): Human-readable name
- template_type (ENUM): email_html, email_text, push_notification, etc.
- category (ENUM): Notification category
- subject_template (TEXT): Email subject template
- content_template (TEXT): Message template with variables
- variables (JSONB): Expected variable definitions
- is_active (BOOLEAN): Template status
```

#### `notification_preferences`
User-specific notification settings:
```sql
- id (UUID): Primary key
- user_id (UUID): User reference
- category (ENUM): Preference category
- channels (ARRAY): Allowed channels
- quiet_hours_start/end (TIME): Do not disturb period
- timezone (VARCHAR): User timezone
- digest_frequency (ENUM): immediate, daily, weekly, never
- max_notifications_per_hour (INTEGER): Rate limiting
```

#### `notification_deliveries`
Delivery tracking and metrics:
```sql
- id (UUID): Primary key
- notification_id (UUID): Notification reference
- channel (ENUM): Delivery channel
- recipient (VARCHAR): Target address/token
- status (ENUM): pending, processing, delivered, failed, etc.
- external_id (VARCHAR): Provider message ID
- sent_at, delivered_at, opened_at (TIMESTAMPTZ): Timing data
- error_message (TEXT): Failure details
```

## API Reference

### Notifications API

#### `GET /api/notifications`
Get user notifications with filtering and pagination.

**Query Parameters:**
- `limit`: Number of notifications (default: 20)
- `offset`: Pagination offset (default: 0)
- `category`: Filter by category
- `unread_only`: Only unread notifications (boolean)
- `include_archived`: Include archived notifications (boolean)

**Response:**
```json
{
  "success": true,
  "notifications": [...],
  "total": 150,
  "unreadCount": 5,
  "limit": 20,
  "offset": 0
}
```

#### `POST /api/notifications`
Create new notification (admin only).

**Request Body:**
```json
{
  "userIds": ["user-1", "user-2"],
  "title": "Notification Title",
  "message": "Notification message",
  "category": "system",
  "priority": "normal",
  "channels": ["in_app", "email"],
  "templateKey": "template_key",
  "templateData": {"var1": "value1"}
}
```

#### `PUT /api/notifications/[id]`
Update notification (mark as read, archive).

**Request Body:**
```json
{
  "action": "mark_read" | "archive" | "mark_all_read"
}
```

### Preferences API

#### `GET /api/notifications/preferences`
Get user notification preferences.

#### `PUT /api/notifications/preferences`
Update user preferences for a specific category.

**Request Body:**
```json
{
  "category": "schedule",
  "preferences": {
    "channels": ["in_app", "email"],
    "quietHoursStart": "22:00",
    "quietHoursEnd": "07:00",
    "digestFrequency": "daily"
  }
}
```

### Templates API

#### `GET /api/notifications/templates`
Get notification templates (admin only).

#### `POST /api/notifications/templates`
Create new template (admin only).

**Request Body:**
```json
{
  "templateKey": "schedule_created",
  "templateName": "Schedule Created",
  "templateType": "in_app_notification",
  "category": "schedule",
  "contentTemplate": "{{content_title}}에 대한 {{schedule_type}} 작업이 예약되었습니다.",
  "variables": {"content_title": "string", "schedule_type": "string"}
}
```

### Analytics API

#### `GET /api/notifications/analytics`
Get notification analytics and metrics (admin only).

**Query Parameters:**
- `start_date`: Analytics start date
- `end_date`: Analytics end date
- `category`: Filter by category
- `channel`: Filter by channel

## Usage Examples

### Basic Notification Creation

```typescript
import { notificationService } from '@/lib/services/notification-service';

// Create a simple notification
await notificationService.createNotification({
  userId: 'user-123',
  title: 'Welcome!',
  message: 'Welcome to AiEduLog',
  category: 'system',
  type: 'welcome',
  priority: 'normal',
  channels: ['in_app']
});
```

### Using Templates

```typescript
// Create notification with template
await notificationService.createNotification({
  userId: 'user-123',
  title: 'Schedule Created',
  message: 'Temp message', // Will be replaced by template
  category: 'schedule',
  type: 'schedule_created',
  priority: 'normal',
  channels: ['in_app', 'email'],
  templateKey: 'schedule_created',
  templateData: {
    content_title: 'My Article',
    schedule_type: 'publish',
    scheduled_time: '2025-09-02 10:00'
  }
});
```

### Bulk Notifications

```typescript
// Send to multiple users
await notificationService.createBulkNotifications(
  ['user-1', 'user-2', 'user-3'],
  {
    title: 'System Maintenance',
    message: 'Scheduled maintenance tonight at 2 AM',
    category: 'system',
    type: 'system_notification',
    priority: 'high',
    channels: ['in_app', 'email']
  }
);
```

### Schedule Integration

The system automatically creates notifications for schedule events:

```typescript
// Automatically triggered when schedules are created/executed
await notificationService.createScheduleNotification(
  scheduleId,
  'schedule_executed', // or 'schedule_failed', 'schedule_reminder'
  [userId],
  contentTitle,
  scheduleType,
  scheduledTime,
  errorMessage // optional, for failures
);
```

### Real-time Notifications

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function NotificationComponent() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    isConnected
  } = useNotifications({
    realtime: true,
    autoRefresh: true
  });

  return (
    <div>
      <h3>Notifications ({unreadCount})</h3>
      {notifications.map(notification => (
        <div key={notification.id}>
          <h4>{notification.title}</h4>
          <p>{notification.message}</p>
          {!notification.isRead && (
            <button onClick={() => markAsRead(notification.id)}>
              Mark as Read
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Admin Interface

### Notification Management

The admin interface provides:

1. **Template Management**: Create, edit, and manage notification templates
2. **Send Notifications**: Send custom notifications to users or groups
3. **Analytics Dashboard**: View delivery metrics and performance data
4. **User Preferences**: View and manage user notification settings

Access via: `/admin/notifications` (admin role required)

### Template Variables

Templates support variable substitution using `{{variable_name}}` syntax:

```html
<!-- Email Template -->
<h2>{{title}}</h2>
<p>Hello {{user_name}},</p>
<p>Your {{content_type}} "{{content_title}}" has been {{action}}.</p>
<p>Scheduled for: {{scheduled_time}}</p>
```

## Background Processing

### Notification Queue

The system uses a queue-based approach for reliable delivery:

1. Notifications are created and queued
2. Background workers process the queue
3. Delivery attempts are tracked with retry logic
4. Analytics are collected for monitoring

### Worker Endpoint

```bash
# Process notification queue
POST /api/workers/notification-processor
Authorization: Bearer worker-token

{
  "batchSize": 10,
  "workerId": "worker-1"
}
```

## Configuration

### Environment Variables

Add to your `.env.local` file:

```bash
# Email Service
EMAIL_SERVICE_PROVIDER=sendgrid
SENDGRID_API_KEY=your_api_key
FROM_EMAIL=noreply@yourdomain.com

# Push Notifications
PUSH_SERVICE_PROVIDER=firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key

# SMS Service
SMS_SERVICE_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token

# Worker Authentication
WORKER_TOKEN=your_secure_token
```

### Database Setup

Run the migration to set up the notification system:

```bash
# Apply notification system migration
psql -d your_database -f supabase/migrations/20250902_comprehensive_notification_system.sql
```

## Security Considerations

### Row Level Security

All notification tables have RLS enabled:
- Users can only access their own notifications
- Admins have full access to all notifications
- Templates and analytics are admin-only

### Authentication

API endpoints require authentication:
- User endpoints: Valid session required
- Admin endpoints: Admin role required
- Worker endpoints: Worker token required

### Data Privacy

- Personal data in notifications is encrypted at rest
- Delivery tracking includes audit logs
- User preferences control data collection

## Performance Optimization

### Indexing

The system includes optimized indexes for:
- User notification queries
- Real-time lookups
- Analytics aggregation
- Queue processing

### Caching

Consider implementing caching for:
- User preferences
- Template definitions
- Analytics data
- Unread counts

### Monitoring

Key metrics to monitor:
- Queue processing rate
- Delivery success rates
- Response times
- Error rates by channel

## Troubleshooting

### Common Issues

1. **Notifications not delivering**: Check queue processing and provider credentials
2. **Real-time not working**: Verify WebSocket/SSE connection
3. **Template errors**: Validate JSON format and variable names
4. **Rate limiting**: Check user preferences and system limits

### Debug Tools

- Check notification queue status via worker endpoint
- View delivery logs in `notification_deliveries` table
- Monitor analytics for delivery patterns
- Use browser dev tools for real-time connection issues

## Migration from Legacy System

If migrating from the existing simple notification system:

1. Run the comprehensive migration script
2. Update notification creation calls to use new service
3. Migrate existing templates to new format
4. Update client code to use new hooks/components
5. Configure external service providers

The new system is backward compatible with basic notification usage while adding enterprise features.