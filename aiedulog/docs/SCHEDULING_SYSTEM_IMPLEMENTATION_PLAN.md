# Scheduling System Implementation Plan
*AIedulog Advanced Appointment & Calendar Management System*

> **⚠️ STATUS: PLANNING DOCUMENT** - This is a planning document for future implementation. The comprehensive appointment booking system described here is **NOT YET IMPLEMENTED**. Currently, only a basic content scheduler exists in the admin panel.

## 🎯 Project Overview

**Objective**: Implement a comprehensive Calendly-like scheduling system for AIedulog platform with advanced booking capabilities, notification system, and administrative controls.

**Timeline**: 2-3 weeks development cycle
**Priority**: Medium-High (Post MVP feature)
**Target Users**: Students, Teachers, Administrators

---

## 📋 System Architecture

### Core Components
```
📅 Scheduling System Architecture
├── 🏠 Public Booking Page: `/scheduling`
├── 👤 User Dashboard: `/dashboard/appointments`
├── 🔔 Notification System: `/notifications` (enhanced)
├── 🎛️ Admin Panel: `/admin/scheduling`
├── 📱 Mobile Interface: Responsive design
└── 🔗 API Layer: REST endpoints + real-time updates
```

---

## 🏗️ Database Schema Design

### Primary Tables

#### 1. **appointments**
```sql
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES identities(id),
    instructor_id UUID REFERENCES identities(id),
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status appointment_status DEFAULT 'pending',
    meeting_type meeting_type_enum DEFAULT 'online',
    meeting_link TEXT,
    meeting_location TEXT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    notes TEXT,
    cancellation_reason TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ
);
```

#### 2. **instructor_availability**
```sql
CREATE TABLE instructor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID REFERENCES identities(id),
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    buffer_time_minutes INTEGER DEFAULT 15,
    max_bookings_per_day INTEGER DEFAULT 8,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. **appointment_types**
```sql
CREATE TABLE appointment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID REFERENCES identities(id),
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    booking_advance_days INTEGER DEFAULT 30,
    cancellation_hours INTEGER DEFAULT 24,
    color_hex VARCHAR(7) DEFAULT '#2E86AB',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. **time_blocks**
```sql
CREATE TABLE time_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID REFERENCES identities(id),
    block_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_blocked BOOLEAN DEFAULT TRUE,
    block_reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. **appointment_notifications**
```sql
CREATE TABLE appointment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id),
    notification_type notification_type_enum,
    scheduled_time TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    is_sent BOOLEAN DEFAULT FALSE,
    template_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enums
```sql
CREATE TYPE appointment_status AS ENUM (
    'pending', 'confirmed', 'completed', 'cancelled', 'no_show'
);

CREATE TYPE meeting_type_enum AS ENUM (
    'online', 'offline', 'hybrid'
);

CREATE TYPE notification_type_enum AS ENUM (
    'confirmation', 'reminder_24h', 'reminder_1h', 
    'cancellation', 'reschedule', 'completion'
);
```

---

## 🎨 User Interface Design

### 1. **Main Scheduling Page (`/scheduling`)**

#### Features:
- **Calendar View**: Month/Week/Day views with available slots
- **Instructor Selection**: Filter by subject area or specific instructor
- **Time Slot Grid**: Interactive time selection with real-time availability
- **Booking Form**: User details, appointment type, special requests
- **Confirmation Flow**: Multi-step booking process with review

#### UI Components:
```tsx
// Key Components
<SchedulingCalendar />
<InstructorSelector />
<TimeSlotGrid />
<BookingForm />
<ConfirmationDialog />
<PaymentIntegration />
```

#### Responsive Design:
- **Desktop**: Side-by-side calendar and booking form
- **Tablet**: Stacked layout with slide-out panels
- **Mobile**: Full-screen step-by-step wizard

### 2. **User Dashboard Integration (`/dashboard/appointments`)**

#### Tab Structure:
```
📋 My Appointments
├── 📅 Upcoming (Active bookings)
├── 📚 Past (Completed sessions)
├── ⏰ Pending (Awaiting confirmation)
├── ❌ Cancelled (Cancelled bookings)
└── ⚙️ Settings (Notification preferences)
```

#### Features:
- **Quick Actions**: Reschedule, Cancel, Join Meeting
- **Appointment Details**: Full information modal
- **Calendar Integration**: Export to Google Calendar, Outlook
- **History Tracking**: Complete appointment history
- **Feedback System**: Post-appointment rating/review

### 3. **Admin Panel (`/admin/scheduling`)**

#### Management Sections:
```
🎛️ Admin Scheduling Management
├── 📊 Dashboard (Statistics, Revenue, Popular times)
├── 👥 Instructors (Manage instructor profiles & availability)
├── 📅 Calendar (Global calendar view with all appointments)
├── 🔧 Settings (System-wide scheduling rules)
├── 📈 Analytics (Booking patterns, conversion rates)
└── 💸 Billing (Payment processing, refunds)
```

#### Advanced Features:
- **Bulk Operations**: Mass cancellations, reschedules
- **Custom Availability**: Override individual instructor schedules
- **Holiday Management**: System-wide blocked dates
- **Automated Workflows**: Auto-confirmations, reminders
- **Revenue Analytics**: Detailed financial reporting

---

## 🔔 Notification System Enhancement

### Notification Types
1. **Booking Confirmations**: Immediate confirmation with calendar invite
2. **Reminders**: 24h, 1h, and 15min before appointment
3. **Cancellations**: Instant notification with rebooking options
4. **Rescheduling**: Change confirmations with new details
5. **Payment Notifications**: Payment confirmations and receipts
6. **System Alerts**: Maintenance, policy changes

### Delivery Channels
- **In-App Notifications**: Real-time browser notifications
- **Email Notifications**: Professional email templates
- **SMS (Optional)**: Critical reminders via SMS
- **Push Notifications**: Mobile app notifications (future)

### Template System
```typescript
interface NotificationTemplate {
  type: NotificationTypeEnum
  title_ko: string
  title_en: string
  content_ko: string
  content_en: string
  action_url?: string
  template_variables: Record<string, any>
}
```

---

## 🔗 API Endpoints Design

### Core Endpoints

#### Public Booking API
```typescript
// Get available time slots
GET /api/scheduling/availability
  ?instructor_id=uuid
  &date=2025-09-01
  &duration=60

// Create appointment
POST /api/scheduling/appointments
Body: {
  instructor_id: string
  appointment_type_id: string
  date: string
  start_time: string
  user_details: UserDetails
}

// Get appointment types
GET /api/scheduling/appointment-types
  ?instructor_id=uuid
```

#### User Management API
```typescript
// User appointments
GET /api/user/appointments
  ?status=upcoming&limit=10

// Cancel appointment
PUT /api/user/appointments/:id/cancel
Body: { reason: string }

// Reschedule appointment
PUT /api/user/appointments/:id/reschedule
Body: { new_date: string, new_time: string }
```

#### Admin Management API
```typescript
// Admin dashboard stats
GET /api/admin/scheduling/stats
  ?period=month&instructor_id=uuid

// Manage instructor availability
POST /api/admin/scheduling/availability
PUT /api/admin/scheduling/availability/:id
DELETE /api/admin/scheduling/availability/:id

// Override bookings
POST /api/admin/scheduling/override
Body: {
  instructor_id: string
  date: string
  reason: string
  block_times: TimeRange[]
}
```

---

## 🎯 Implementation Phases

### Phase 1: Foundation (Week 1)
**Priority: HIGH**
- [ ] Database schema implementation
- [ ] Basic appointment CRUD operations
- [ ] Instructor availability system
- [ ] Simple time slot calculation
- [ ] Basic API endpoints

**Deliverables:**
- Working database with sample data
- API endpoints returning availability
- Basic appointment creation flow

### Phase 2: Core UI (Week 2)
**Priority: HIGH**
- [ ] Main scheduling page (`/scheduling`)
- [ ] Calendar component with Material 3 design
- [ ] Time slot selection interface
- [ ] Booking form with validation
- [ ] Confirmation workflow

**Deliverables:**
- Fully functional booking interface
- Responsive design across all breakpoints
- Integration with existing auth system

### Phase 3: User Dashboard (Week 2-3)
**Priority: MEDIUM**
- [ ] Dashboard appointments tab
- [ ] Appointment management (cancel, reschedule)
- [ ] Historical data display
- [ ] User notification preferences
- [ ] Calendar export functionality

**Deliverables:**
- Complete user appointment management
- Integration with existing dashboard

### Phase 4: Admin Panel (Week 3)
**Priority: MEDIUM**
- [ ] Admin scheduling dashboard
- [ ] Instructor management interface
- [ ] System-wide calendar view
- [ ] Analytics and reporting
- [ ] Bulk operations interface

**Deliverables:**
- Comprehensive admin management tools
- Advanced analytics dashboard

### Phase 5: Notifications (Week 3)
**Priority: HIGH**
- [ ] Enhanced notification system
- [ ] Email template system
- [ ] Automated reminder scheduling
- [ ] Real-time notifications
- [ ] Integration with existing notification system

**Deliverables:**
- Complete notification ecosystem
- Professional email templates

### Phase 6: Advanced Features (Future)
**Priority: LOW**
- [ ] Payment integration (Stripe/PayPal)
- [ ] Video call integration (Zoom/Google Meet)
- [ ] SMS notifications
- [ ] Mobile app notifications
- [ ] AI-powered scheduling optimization

---

## 🎨 UI/UX Design Guidelines

### Material 3 Integration
- **Primary Color**: `#2E86AB` (Ocean Blue) - Main booking buttons
- **Secondary Color**: `#A23B72` (Rose Pink) - Instructor highlights
- **Tertiary Color**: `#E6800F` (Orange) - Urgent notifications
- **Success**: `#4CAF50` - Confirmed appointments
- **Warning**: `#FF9800` - Pending/reminder states
- **Error**: `#F44336` - Cancellations/conflicts

### Typography
- **Headers**: IBM Plex Sans KR (Bold)
- **Body Text**: Noto Sans KR (Regular)
- **Time Displays**: Roboto Mono (Monospaced)

### Component Design Patterns
```tsx
// Appointment Card Design
<Card elevation={2} sx={{ 
  borderLeft: 4, 
  borderLeftColor: 'primary.main',
  '&:hover': { elevation: 4 }
}}>
  <CardHeader 
    avatar={<Avatar />}
    title="AI 교육 상담"
    subheader="2025.09.01 14:00-15:00"
  />
  <CardContent>
    <Typography>강사: 박준형</Typography>
    <Typography>온라인 미팅</Typography>
  </CardContent>
  <CardActions>
    <Button variant="outlined" size="small">변경</Button>
    <Button variant="contained" size="small">참가</Button>
  </CardActions>
</Card>
```

---

## 🔒 Security & Privacy Considerations

### Data Protection
- **Personal Information**: GDPR/CCPA compliant data handling
- **Appointment Privacy**: Row-level security policies
- **Payment Security**: PCI DSS compliance (if payments implemented)
- **Meeting Links**: Secure, time-limited access tokens

### Access Control
```sql
-- Row Level Security Policies
CREATE POLICY appointment_access_policy 
ON appointments FOR ALL 
USING (
  user_id = auth.uid() OR 
  instructor_id = auth.uid() OR
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);
```

### Rate Limiting
- **Booking Creation**: 5 bookings per hour per user
- **Cancellation**: 3 cancellations per day per user
- **API Calls**: Standard rate limiting per endpoint

---

## 📊 Analytics & Metrics

### Key Performance Indicators (KPIs)
1. **Booking Conversion Rate**: Visitors to confirmed appointments
2. **Cancellation Rate**: Percentage of appointments cancelled
3. **No-Show Rate**: Percentage of missed appointments
4. **Popular Time Slots**: Most booked time periods
5. **Instructor Utilization**: Percentage of available slots filled
6. **User Satisfaction**: Post-appointment ratings
7. **Revenue per Appointment**: If payment system implemented

### Tracking Events
```typescript
// Analytics Event Types
enum SchedulingEvent {
  BOOKING_STARTED = 'booking_started',
  APPOINTMENT_CREATED = 'appointment_created',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_COMPLETED = 'appointment_completed',
  REMINDER_SENT = 'reminder_sent',
  NO_SHOW_RECORDED = 'no_show_recorded'
}
```

---

## 🚀 Testing Strategy

### Unit Testing
- **Availability Calculation**: Time slot generation algorithms
- **Booking Logic**: Appointment creation and validation
- **Notification System**: Template rendering and delivery
- **API Endpoints**: Input validation and error handling

### Integration Testing
- **Database Transactions**: Concurrent booking scenarios
- **Email Delivery**: End-to-end notification testing
- **Calendar Sync**: External calendar integration
- **Payment Processing**: Transaction flow testing

### User Acceptance Testing
- **Booking Flow**: Complete user journey testing
- **Mobile Experience**: Cross-device functionality
- **Accessibility**: Screen reader and keyboard navigation
- **Performance**: Load testing with concurrent users

---

## 🔧 Technical Implementation Notes

### Performance Optimizations
- **Availability Caching**: Redis caching for frequently requested slots
- **Database Indexing**: Optimized queries for date/time lookups
- **Real-time Updates**: WebSocket connections for live availability
- **Image Optimization**: Instructor profile images with Next.js optimization

### Scalability Considerations
- **Database Partitioning**: Partition appointments by date ranges
- **Microservices**: Separate notification service for high volume
- **CDN Integration**: Global content delivery for faster loading
- **Queue System**: Background job processing for notifications

### Integration Points
- **Existing Auth System**: Seamless user authentication
- **Current Dashboard**: Native integration with existing UI
- **Notification System**: Enhancement of current notifications
- **Admin Panel**: Extension of current admin interface

---

## 📋 Success Criteria

### Launch Requirements
- [ ] **Functional Requirements**: All core booking features working
- [ ] **Performance**: Sub-2 second page load times
- [ ] **Accessibility**: WCAG 2.1 AA compliance
- [ ] **Mobile Experience**: Full functionality on all devices
- [ ] **Security**: Complete security audit passed

### Post-Launch Metrics (30 days)
- [ ] **User Adoption**: 70% of active users try scheduling feature
- [ ] **Booking Completion**: 80% booking completion rate
- [ ] **System Reliability**: 99.9% uptime
- [ ] **User Satisfaction**: 4.5/5 average rating
- [ ] **Bug Reports**: < 5 critical bugs reported

---

## 🎯 Navigation Integration Plan

### Header Navigation Addition
**Location**: Add to authenticated user navigation bar (right side)

```tsx
// Current: [알림] [프로필]
// New: [일정] [알림] [프로필]

<IconButton component={Link} href="/scheduling">
  <CalendarTodayIcon />
</IconButton>
```

### Mobile Navigation
**Location**: Add to mobile drawer menu

```tsx
<ListItem>
  <ListItemIcon>
    <CalendarTodayIcon />
  </ListItemIcon>
  <ListItemText primary="일정 예약" />
</ListItem>
```

---

## 💡 Future Enhancement Ideas

### Advanced Features (Post-Launch)
1. **AI Schedule Optimization**: Machine learning for optimal time suggestions
2. **Group Bookings**: Multi-participant appointments
3. **Recurring Appointments**: Weekly/monthly recurring sessions
4. **Integration APIs**: Third-party calendar sync (Google, Outlook)
5. **Mobile App**: Dedicated iOS/Android scheduling app
6. **Voice Booking**: Voice-activated appointment scheduling
7. **Waitlist System**: Automatic rebooking when slots become available

### Business Intelligence
1. **Predictive Analytics**: Forecast peak booking times
2. **Revenue Optimization**: Dynamic pricing based on demand
3. **User Behavior Analysis**: Booking pattern insights
4. **Instructor Performance**: Detailed instructor analytics
5. **Market Research**: Competitor analysis and benchmarking

---

## 📞 Support & Maintenance

### Documentation Requirements
- [ ] **API Documentation**: Complete Swagger/OpenAPI specs
- [ ] **User Guide**: Step-by-step booking instructions
- [ ] **Admin Manual**: Administrative feature documentation
- [ ] **Troubleshooting Guide**: Common issues and solutions
- [ ] **Developer Guide**: Code structure and architecture

### Ongoing Maintenance
- **Regular Backups**: Automated daily database backups
- **Performance Monitoring**: Real-time performance tracking
- **Security Updates**: Regular dependency updates and patches
- **User Feedback Integration**: Continuous improvement based on feedback
- **Feature Flag Management**: Gradual rollout of new features

---

**Document Version**: 1.0  
**Created**: 2025-09-01  
**Last Updated**: 2025-09-01  
**Author**: AIedulog Development Team  
**Status**: Planning Phase  

*This comprehensive plan serves as the foundation for implementing a world-class scheduling system that will enhance the AIedulog platform's educational services and user experience.*