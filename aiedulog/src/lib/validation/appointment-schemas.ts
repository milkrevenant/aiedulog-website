/**
 * Comprehensive Validation Schemas for Appointment System
 * 
 * SECURITY FEATURES:
 * - Input validation before sanitization
 * - Type safety with TypeScript integration
 * - Custom validators for business logic
 * - Integration with InputSanitizer for security
 * - Comprehensive error messages
 * - API request/response validation
 * 
 * WORKS WITH: InputSanitizer to provide defense-in-depth
 */

import { z } from 'zod';
import { InputSanitizer } from '@/lib/security/input-sanitizer';
import { 
  AppointmentStatus, 
  MeetingType, 
  BookingStepType 
} from '@/types/appointment-system';

// 🔒 SECURITY: Custom validators with sanitization
const sanitizedString = (maxLength: number = 1000) => 
  z.string()
    .transform((val) => InputSanitizer.sanitizeString(val, { maxLength }).sanitizedValue)
    .refine((val) => val.length <= maxLength, {
      message: `String must not exceed ${maxLength} characters after sanitization`
    });

const sanitizedEmail = () => 
  z.string()
    .email('Invalid email format')
    .transform((val) => InputSanitizer.sanitizeEmail(val).sanitizedValue)
    .refine((val) => InputSanitizer.sanitizeEmail(val).isValid, {
      message: 'Email failed security validation'
    });

const sanitizedPhone = () => 
  z.string()
    .transform((val) => InputSanitizer.sanitizePhoneNumber(val).sanitizedValue)
    .refine((val) => val.length >= 10, {
      message: 'Phone number must be at least 10 digits'
    });

const sanitizedUrl = () => 
  z.string()
    .url('Invalid URL format')
    .transform((val) => InputSanitizer.sanitizeUrl(val).sanitizedValue)
    .refine((val) => /^https?:\/\//i.test(val), {
      message: 'URL must start with http:// or https://'
    });

// 🔒 UUID validation with sanitization
const sanitizedUUID = () =>
  z.string()
    .uuid('Invalid UUID format')
    .transform((val) => InputSanitizer.sanitizeString(val, { maxLength: 36 }).sanitizedValue);

// 🔒 Date validation with business rules
const appointmentDate = () =>
  z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .transform((val) => InputSanitizer.sanitizeString(val, { maxLength: 10 }).sanitizedValue)
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, {
      message: 'Appointment date cannot be in the past'
    })
    .refine((val) => {
      const date = new Date(val);
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      return date <= oneYearFromNow;
    }, {
      message: 'Appointment date cannot be more than one year in advance'
    });

// 🔒 Time validation
const appointmentTime = () =>
  z.string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
    .transform((val) => InputSanitizer.sanitizeString(val, { maxLength: 5 }).sanitizedValue)
    .refine((val) => {
      const [hours, minutes] = val.split(':').map(Number);
      return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
    }, {
      message: 'Invalid time format'
    });

// 🔒 CORE SCHEMAS

/**
 * User Details Validation
 */
export const UserDetailsSchema = z.object({
  full_name: sanitizedString(100)
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  
  email: sanitizedEmail(),
  
  phone: sanitizedPhone()
    .optional(),
  
  preferred_language: z.enum(['en', 'ko'])
    .default('ko')
    .optional(),
    
  timezone: sanitizedString(50)
    .optional()
});

/**
 * Appointment Creation Schema - SECURITY CRITICAL
 */
export const CreateAppointmentSchema = z.object({
  instructor_id: sanitizedUUID(),
  
  appointment_type_id: sanitizedUUID(),
  
  appointment_date: appointmentDate(),
  
  start_time: appointmentTime(),
  
  meeting_type: z.nativeEnum(MeetingType),
  
  meeting_location: sanitizedString(500)
    .optional()
    .refine((val) => {
      // If meeting type is offline, location should be provided
      return val && val.length > 0;
    }, {
      message: 'Meeting location is required for offline appointments'
    }),
  
  meeting_link: sanitizedUrl()
    .optional(),
  
  title: sanitizedString(255)
    .min(1, 'Title is required')
    .max(255, 'Title cannot exceed 255 characters'),
  
  description: sanitizedString(2000)
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional(),
  
  notes: sanitizedString(1000)
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional(),
  
  user_details: UserDetailsSchema
    .optional(),
    
  duration_minutes: z.number()
    .int('Duration must be a whole number')
    .min(15, 'Minimum appointment duration is 15 minutes')
    .max(480, 'Maximum appointment duration is 8 hours')
    .optional(),
    
  special_requirements: sanitizedString(500)
    .optional()
}).refine((data) => {
  // Business rule: offline appointments need location
  if (data.meeting_type === MeetingType.OFFLINE && !data.meeting_location) {
    return false;
  }
  // Business rule: online appointments should have meeting link
  if (data.meeting_type === MeetingType.ONLINE && !data.meeting_link) {
    // This is a warning, not an error
  }
  return true;
}, {
  message: 'Meeting location is required for offline appointments',
  path: ['meeting_location']
});

/**
 * Appointment Update Schema
 */
export const UpdateAppointmentSchema = z.object({
  appointment_date: appointmentDate().optional(),
  
  start_time: appointmentTime().optional(),
  
  meeting_type: z.nativeEnum(MeetingType).optional(),
  
  meeting_location: sanitizedString(500).optional(),
  
  meeting_link: sanitizedUrl().optional(),
  
  notes: sanitizedString(1000).optional(),
  
  status: z.nativeEnum(AppointmentStatus).optional(),
  
  special_requirements: sanitizedString(500).optional()
});

/**
 * Appointment Cancellation Schema
 */
export const CancelAppointmentSchema = z.object({
  reason: sanitizedString(500)
    .min(1, 'Cancellation reason is required')
    .max(500, 'Cancellation reason cannot exceed 500 characters'),
  
  notify_instructor: z.boolean()
    .default(true)
});

/**
 * Appointment Reschedule Schema
 */
export const RescheduleAppointmentSchema = z.object({
  new_date: appointmentDate(),
  
  new_start_time: appointmentTime(),
  
  reason: sanitizedString(500)
    .max(500, 'Reschedule reason cannot exceed 500 characters')
    .optional()
});

/**
 * Booking Session Schemas
 */
export const CreateBookingSessionSchema = z.object({
  initial_step: z.nativeEnum(BookingStepType)
    .default(BookingStepType.INSTRUCTOR_SELECTION),
  
  instructor_id: sanitizedUUID().optional(),
  
  appointment_type_id: sanitizedUUID().optional(),
  
  preferred_date: appointmentDate().optional(),
  
  metadata: z.record(z.unknown())
    .transform((val) => InputSanitizer.sanitizeObject(val).sanitized)
    .optional()
});

export const UpdateBookingSessionSchema = z.object({
  step: z.nativeEnum(BookingStepType),
  
  data: z.object({
    instructor_id: sanitizedUUID().optional(),
    appointment_type_id: sanitizedUUID().optional(),
    appointment_date: appointmentDate().optional(),
    start_time: appointmentTime().optional(),
    end_time: appointmentTime().optional(),
    duration_minutes: z.number().int().min(15).max(480).optional(),
    meeting_type: z.nativeEnum(MeetingType).optional(),
    meeting_location: sanitizedString(500).optional(),
    notes: sanitizedString(1000).optional(),
    user_details: UserDetailsSchema.optional(),
    pricing: z.object({
      base_price: z.number().min(0),
      tax: z.number().min(0),
      total: z.number().min(0),
      currency: z.string().length(3)
    }).optional()
  }).transform((val) => InputSanitizer.sanitizeObject(val).sanitized),
  
  complete_step: z.boolean().default(false)
});

/**
 * Availability Request Schema
 */
export const AvailabilityRequestSchema = z.object({
  instructor_id: sanitizedUUID().optional(),
  
  date: appointmentDate(),
  
  duration_minutes: z.number()
    .int('Duration must be a whole number')
    .min(15, 'Minimum duration is 15 minutes')
    .max(480, 'Maximum duration is 8 hours')
    .default(60),
  
  appointment_type_id: sanitizedUUID().optional(),
  
  timezone: sanitizedString(50).optional()
});

/**
 * Appointment Filter Schema (for listing/searching)
 */
export const AppointmentFilterSchema = z.object({
  status: z.array(z.nativeEnum(AppointmentStatus)).optional(),
  
  instructor_id: sanitizedUUID().optional(),
  
  user_id: sanitizedUUID().optional(),
  
  date_from: appointmentDate().optional(),
  
  date_to: appointmentDate().optional(),
  
  meeting_type: z.array(z.nativeEnum(MeetingType)).optional(),
  
  appointment_type_id: sanitizedUUID().optional(),
  
  limit: z.number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  
  offset: z.number()
    .int()
    .min(0, 'Offset cannot be negative')
    .default(0),
  
  sort_by: z.enum(['date', 'created_at', 'updated_at'])
    .default('date'),
  
  sort_order: z.enum(['asc', 'desc'])
    .default('asc'),
    
  search: sanitizedString(100).optional()
}).refine((data) => {
  // Business rule: date_to should be after date_from
  if (data.date_from && data.date_to) {
    return new Date(data.date_from) <= new Date(data.date_to);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['date_to']
});

/**
 * Appointment Type Creation Schema
 */
export const CreateAppointmentTypeSchema = z.object({
  instructor_id: sanitizedUUID(),
  
  type_name: sanitizedString(150)
    .min(1, 'Type name is required')
    .max(150, 'Type name cannot exceed 150 characters'),
  
  description: sanitizedString(2000)
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional(),
  
  duration_minutes: z.number()
    .int('Duration must be a whole number')
    .min(15, 'Minimum duration is 15 minutes')
    .max(480, 'Maximum duration is 8 hours'),
  
  price: z.number()
    .min(0, 'Price cannot be negative')
    .max(1000000, 'Price cannot exceed 1,000,000'),
  
  currency: z.string()
    .length(3, 'Currency must be 3 characters (ISO 4217)')
    .transform(val => val.toUpperCase())
    .default('KRW'),
  
  booking_advance_days: z.number()
    .int('Advance days must be a whole number')
    .min(0, 'Advance days cannot be negative')
    .max(365, 'Advance days cannot exceed 365')
    .default(30),
  
  cancellation_hours: z.number()
    .int('Cancellation hours must be a whole number')
    .min(0, 'Cancellation hours cannot be negative')
    .max(168, 'Cancellation hours cannot exceed 168 (1 week)')
    .default(24),
  
  max_bookings_per_day: z.number()
    .int('Max bookings must be a whole number')
    .min(1, 'Must allow at least 1 booking per day')
    .max(24, 'Cannot exceed 24 bookings per day')
    .default(8),
  
  is_active: z.boolean().default(true),
  
  requires_approval: z.boolean().default(false),
  
  preparation_instructions: sanitizedString(1000).optional(),
  
  equipment_requirements: sanitizedString(500).optional()
});

/**
 * Instructor Availability Schema
 */
export const InstructorAvailabilitySchema = z.object({
  instructor_id: sanitizedUUID(),
  
  day_of_week: z.number()
    .int('Day must be a whole number')
    .min(0, 'Day must be between 0 (Sunday) and 6 (Saturday)')
    .max(6, 'Day must be between 0 (Sunday) and 6 (Saturday)'),
  
  start_time: appointmentTime(),
  
  end_time: appointmentTime(),
  
  is_available: z.boolean().default(true),
  
  buffer_time_minutes: z.number()
    .int('Buffer time must be a whole number')
    .min(0, 'Buffer time cannot be negative')
    .max(60, 'Buffer time cannot exceed 60 minutes')
    .default(15),
  
  max_bookings_per_day: z.number()
    .int('Max bookings must be a whole number')
    .min(1, 'Must allow at least 1 booking')
    .max(24, 'Cannot exceed 24 bookings')
    .default(8),
  
  effective_from: appointmentDate().optional(),
  
  effective_until: appointmentDate().optional()
}).refine((data) => {
  // Business rule: start_time should be before end_time
  const [startHours, startMinutes] = data.start_time.split(':').map(Number);
  const [endHours, endMinutes] = data.end_time.split(':').map(Number);
  const startMinutesTotal = startHours * 60 + startMinutes;
  const endMinutesTotal = endHours * 60 + endMinutes;
  return startMinutesTotal < endMinutesTotal;
}, {
  message: 'End time must be after start time',
  path: ['end_time']
}).refine((data) => {
  // Business rule: effective_until should be after effective_from
  if (data.effective_from && data.effective_until) {
    return new Date(data.effective_from) < new Date(data.effective_until);
  }
  return true;
}, {
  message: 'Effective until date must be after effective from date',
  path: ['effective_until']
});

/**
 * Time Block Schema (for blocking specific time periods)
 */
export const TimeBlockSchema = z.object({
  instructor_id: sanitizedUUID(),
  
  block_date: appointmentDate(),
  
  start_time: appointmentTime(),
  
  end_time: appointmentTime(),
  
  is_blocked: z.boolean().default(true),
  
  block_reason: sanitizedString(500)
    .max(500, 'Block reason cannot exceed 500 characters')
    .optional()
}).refine((data) => {
  // Business rule: start_time should be before end_time
  const [startHours, startMinutes] = data.start_time.split(':').map(Number);
  const [endHours, endMinutes] = data.end_time.split(':').map(Number);
  const startMinutesTotal = startHours * 60 + startMinutes;
  const endMinutesTotal = endHours * 60 + endMinutes;
  return startMinutesTotal < endMinutesTotal;
}, {
  message: 'End time must be after start time',
  path: ['end_time']
});

/**
 * Notification Preferences Schema
 */
export const NotificationPreferencesSchema = z.object({
  email_enabled: z.boolean().default(true),
  sms_enabled: z.boolean().default(false),
  in_app_enabled: z.boolean().default(true),
  
  reminder_24h: z.boolean().default(true),
  reminder_1h: z.boolean().default(true),
  reminder_15m: z.boolean().default(false),
  
  booking_confirmation: z.boolean().default(true),
  cancellation_notice: z.boolean().default(true),
  reschedule_notice: z.boolean().default(true),
  
  instructor_notifications: z.boolean().default(true),
  
  preferred_language: z.enum(['en', 'ko']).default('ko')
});

// 🔒 SECURITY: Type exports for runtime validation
export type UserDetails = z.infer<typeof UserDetailsSchema>;
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof CancelAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof RescheduleAppointmentSchema>;
export type CreateBookingSessionInput = z.infer<typeof CreateBookingSessionSchema>;
export type UpdateBookingSessionInput = z.infer<typeof UpdateBookingSessionSchema>;
export type AvailabilityRequestInput = z.infer<typeof AvailabilityRequestSchema>;
export type AppointmentFilterInput = z.infer<typeof AppointmentFilterSchema>;
export type CreateAppointmentTypeInput = z.infer<typeof CreateAppointmentTypeSchema>;
export type InstructorAvailabilityInput = z.infer<typeof InstructorAvailabilitySchema>;
export type TimeBlockInput = z.infer<typeof TimeBlockSchema>;
export type NotificationPreferencesInput = z.infer<typeof NotificationPreferencesSchema>;

/**
 * Validation helper functions
 */
export const validate = {
  createAppointment: (data: unknown) => CreateAppointmentSchema.safeParse(data),
  updateAppointment: (data: unknown) => UpdateAppointmentSchema.safeParse(data),
  cancelAppointment: (data: unknown) => CancelAppointmentSchema.safeParse(data),
  rescheduleAppointment: (data: unknown) => RescheduleAppointmentSchema.safeParse(data),
  createBookingSession: (data: unknown) => CreateBookingSessionSchema.safeParse(data),
  updateBookingSession: (data: unknown) => UpdateBookingSessionSchema.safeParse(data),
  availabilityRequest: (data: unknown) => AvailabilityRequestSchema.safeParse(data),
  appointmentFilter: (data: unknown) => AppointmentFilterSchema.safeParse(data),
  createAppointmentType: (data: unknown) => CreateAppointmentTypeSchema.safeParse(data),
  instructorAvailability: (data: unknown) => InstructorAvailabilitySchema.safeParse(data),
  timeBlock: (data: unknown) => TimeBlockSchema.safeParse(data),
  userDetails: (data: unknown) => UserDetailsSchema.safeParse(data),
  notificationPreferences: (data: unknown) => NotificationPreferencesSchema.safeParse(data)
};

// Default export
export default {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  CancelAppointmentSchema,
  RescheduleAppointmentSchema,
  CreateBookingSessionSchema,
  UpdateBookingSessionSchema,
  AvailabilityRequestSchema,
  AppointmentFilterSchema,
  CreateAppointmentTypeSchema,
  InstructorAvailabilitySchema,
  TimeBlockSchema,
  UserDetailsSchema,
  NotificationPreferencesSchema,
  validate
};