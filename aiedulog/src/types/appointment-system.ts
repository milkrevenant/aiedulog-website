/**
 * Type definitions for the AIedulog Appointment Booking System
 * Comprehensive types for appointments, instructors, availability, and booking flow
 */

// =============================================================================
// ENUMS
// =============================================================================

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

export enum MeetingType {
  ONLINE = 'online',
  OFFLINE = 'offline',
  HYBRID = 'hybrid'
}

export enum NotificationType {
  CONFIRMATION = 'confirmation',
  REMINDER_24H = 'reminder_24h',
  REMINDER_1H = 'reminder_1h',
  CANCELLATION = 'cancellation',
  RESCHEDULE = 'reschedule',
  COMPLETION = 'completion'
}

export enum BookingStepType {
  INSTRUCTOR_SELECTION = 'instructor_selection',
  SERVICE_SELECTION = 'service_selection',
  DATE_TIME_SELECTION = 'date_time_selection',
  USER_DETAILS = 'user_details',
  CONFIRMATION = 'confirmation',
  PAYMENT = 'payment'
}

// =============================================================================
// CORE DATA TYPES
// =============================================================================

export interface Appointment {
  id: string;
  user_id: string;
  instructor_id: string;
  appointment_type_id: string;
  appointment_date: string; // ISO date string
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  duration_minutes: number;
  status: AppointmentStatus;
  meeting_type: MeetingType;
  meeting_link?: string;
  meeting_location?: string;
  title: string;
  description?: string;
  notes?: string;
  cancellation_reason?: string;
  reminder_sent: boolean;
  user_rating?: number;
  instructor_rating?: number;
  review_comment?: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  confirmed_at?: string;
}

export interface AppointmentType {
  id: string;
  instructor_id: string;
  type_name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  booking_advance_days: number;
  cancellation_hours: number;
  color_hex: string;
  created_at: string;
}

export interface InstructorAvailability {
  id: string;
  instructor_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  is_available: boolean;
  buffer_time_minutes: number;
  max_bookings_per_day: number;
  created_at: string;
  updated_at: string;
}

export interface TimeBlock {
  id: string;
  instructor_id: string;
  block_date: string; // ISO date string
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  is_blocked: boolean;
  block_reason?: string;
  created_at: string;
}

export interface AppointmentNotification {
  id: string;
  appointment_id: string;
  notification_type: NotificationType;
  scheduled_time: string; // ISO datetime string
  sent_at?: string;
  is_sent: boolean;
  template_data: Record<string, any>;
  created_at: string;
}

// =============================================================================
// EXTENDED TYPES WITH RELATIONS
// =============================================================================

export interface AppointmentWithDetails extends Appointment {
  instructor?: {
    id: string;
    full_name: string;
    email: string;
    profile_image_url?: string;
    bio?: string;
  };
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
  appointment_type?: AppointmentType;
  notifications?: AppointmentNotification[];
}

export interface InstructorProfile {
  id: string;
  full_name: string;
  email: string;
  profile_image_url?: string;
  bio?: string;
  specializations?: string[];
  rating?: number;
  total_appointments?: number;
  availability?: InstructorAvailability[];
  appointment_types?: AppointmentType[];
  time_blocks?: TimeBlock[];
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface AvailabilityRequest {
  instructor_id?: string;
  date: string; // ISO date string
  duration_minutes?: number;
  appointment_type_id?: string;
}

export interface TimeSlot {
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  available: boolean;
  booking_id?: string; // If slot is taken
  buffer_before: number; // minutes
  buffer_after: number; // minutes
}

export interface AvailabilityResponse {
  date: string;
  instructor_id: string;
  instructor_name: string;
  slots: TimeSlot[];
  total_available: number;
  working_hours: {
    start: string;
    end: string;
  };
  blocked_periods?: {
    start_time: string;
    end_time: string;
    reason?: string;
  }[];
}

export interface CreateAppointmentRequest {
  instructor_id: string;
  appointment_type_id: string;
  appointment_date: string; // ISO date string
  start_time: string; // HH:mm format
  meeting_type: MeetingType;
  meeting_location?: string;
  notes?: string;
  user_details?: {
    full_name?: string;
    email?: string;
    phone?: string;
  };
}

export interface UpdateAppointmentRequest {
  appointment_date?: string;
  start_time?: string;
  meeting_type?: MeetingType;
  meeting_location?: string;
  notes?: string;
  status?: AppointmentStatus;
}

export interface CancelAppointmentRequest {
  reason: string;
  notify_instructor?: boolean;
}

export interface RescheduleAppointmentRequest {
  new_date: string; // ISO date string
  new_time: string; // HH:mm format
  reason?: string;
}

// =============================================================================
// BOOKING SESSION TYPES
// =============================================================================

export interface BookingSession {
  id: string;
  user_id?: string; // null for anonymous users
  session_token: string;
  current_step: BookingStepType;
  data: BookingSessionData;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface BookingSessionData {
  instructor_id?: string;
  appointment_type_id?: string;
  appointment_date?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  meeting_type?: MeetingType;
  meeting_location?: string;
  notes?: string;
  user_details?: {
    full_name?: string;
    email?: string;
    phone?: string;
  };
  pricing?: {
    base_price: number;
    tax: number;
    total: number;
    currency: string;
  };
  payment_status?: 'pending' | 'completed' | 'failed';
  completed_steps?: BookingStepType[];
}

export interface CreateBookingSessionRequest {
  initial_step?: BookingStepType;
  instructor_id?: string;
  appointment_type_id?: string;
}

export interface UpdateBookingSessionRequest {
  step: BookingStepType;
  data: Partial<BookingSessionData>;
  complete_step?: boolean;
}

// =============================================================================
// ADMIN MANAGEMENT TYPES
// =============================================================================

export interface AppointmentStats {
  total_appointments: number;
  confirmed_appointments: number;
  pending_appointments: number;
  cancelled_appointments: number;
  completed_appointments: number;
  no_show_appointments: number;
  revenue_total: number;
  revenue_this_month: number;
  popular_time_slots: {
    time_slot: string;
    booking_count: number;
  }[];
  instructor_performance: {
    instructor_id: string;
    instructor_name: string;
    total_bookings: number;
    completion_rate: number;
    average_rating: number;
    revenue: number;
  }[];
}

export interface CreateAvailabilityRequest {
  instructor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  buffer_time_minutes?: number;
  max_bookings_per_day?: number;
}

export interface CreateTimeBlockRequest {
  instructor_id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  block_reason?: string;
}

export interface BulkOperationRequest {
  appointment_ids: string[];
  action: 'confirm' | 'cancel' | 'reschedule';
  data?: {
    new_date?: string;
    new_time?: string;
    reason?: string;
  };
}

export interface AppointmentFilters {
  status?: AppointmentStatus[];
  instructor_id?: string;
  date_from?: string;
  date_to?: string;
  meeting_type?: MeetingType;
  limit?: number;
  offset?: number;
  sort_by?: 'date' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

// =============================================================================
// API RESPONSE WRAPPERS
// =============================================================================

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    has_more?: boolean;
  };
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
    total_pages: number;
  };
}

// =============================================================================
// VALIDATION SCHEMAS (for runtime validation)
// =============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface BusinessRuleViolation {
  rule: string;
  message: string;
  details?: Record<string, any>;
}

// =============================================================================
// CALENDAR INTEGRATION TYPES
// =============================================================================

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  location?: string;
  attendees: {
    email: string;
    name?: string;
    status: 'pending' | 'accepted' | 'declined';
  }[];
  meeting_link?: string;
  timezone: string;
}

export interface CalendarExportData {
  format: 'ics' | 'google' | 'outlook';
  appointments: AppointmentWithDetails[];
  timezone?: string;
}

// =============================================================================
// NOTIFICATION TEMPLATE TYPES
// =============================================================================

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  title_en: string;
  title_ko: string;
  content_en: string;
  content_ko: string;
  action_url?: string;
  template_variables: string[];
  is_active: boolean;
}

export interface NotificationPayload {
  template_id: string;
  recipient: {
    user_id: string;
    email: string;
    full_name?: string;
  };
  variables: Record<string, any>;
  delivery_time?: string; // ISO datetime, null for immediate
  channels: ('email' | 'in_app' | 'sms')[];
}

// =============================================================================
// REAL-TIME UPDATES
// =============================================================================

export interface AppointmentUpdateEvent {
  type: 'appointment_created' | 'appointment_updated' | 'appointment_cancelled';
  appointment_id: string;
  appointment: AppointmentWithDetails;
  affected_users: string[]; // user_ids that should receive this update
  timestamp: string;
}

export interface AvailabilityUpdateEvent {
  type: 'availability_changed';
  instructor_id: string;
  date: string;
  affected_slots: TimeSlot[];
  timestamp: string;
}

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

export interface WebhookEvent {
  id: string;
  event_type: string;
  data: Record<string, any>;
  timestamp: string;
  signature: string;
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
}