/**
 * Appointment Service Library
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * Comprehensive business logic for appointment booking system
 * 
 * This service provides reusable functions for:
 * - Availability calculation
 * - Appointment validation
 * - Booking workflows
 * - Notification scheduling
 * - Business rule enforcement
 */

import { createClient } from '@/lib/supabase/server';
import {
  AppointmentWithDetails,
  InstructorAvailability,
  AppointmentType,
  TimeSlot,
  AvailabilityResponse,
  BookingSession,
  NotificationType,
  AppointmentStatus
} from '@/types/appointment-system';

export class AppointmentService {
  private supabase: any;

  constructor() {
    // Note: In a real implementation, you might want to pass supabase client as parameter
    // or use dependency injection
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = createClient();
    }
    return this.supabase;
  }

  // =============================================================================
  // AVAILABILITY MANAGEMENT
  // =============================================================================

  /**
   * Get comprehensive availability for an instructor on a specific date
   */
  async getInstructorAvailability(
    instructorId: string,
    date: string,
    durationMinutes: number = 60
  ): Promise<AvailabilityResponse | null> {
    try {
      const supabase = await this.getSupabase();
      
      // Validate inputs
      if (!this.isValidDate(date)) {
        throw new Error('Invalid date format');
      }
      
      if (durationMinutes < 15 || durationMinutes > 480) {
        throw new Error('Duration must be between 15 and 480 minutes');
      }
      
      // Get instructor info
      const instructor = await this.getInstructorInfo(instructorId);
      if (!instructor) {
        throw new Error('Instructor not found or inactive');
      }
      
      // Get day of week
      const dayOfWeek = new Date(date).getDay();
      
      // Fetch all required data in parallel
      const [availabilityRules, existingAppointments, timeBlocks] = await Promise.all([
        this.getAvailabilityRules(instructorId, dayOfWeek),
        this.getExistingAppointments(instructorId, date),
        this.getTimeBlocks(instructorId, date)
      ]);
      
      // Generate time slots
      const slots = this.generateTimeSlots(
        availabilityRules,
        existingAppointments,
        timeBlocks,
        durationMinutes
      );
      
      // Calculate working hours
      const workingHours = this.calculateWorkingHours(availabilityRules);
      
      return {
        date,
        instructor_id: instructorId,
        instructor_name: instructor.full_name,
        slots,
        total_available: slots.filter(s => s.available).length,
        working_hours: workingHours,
        blocked_periods: timeBlocks.length > 0 ? timeBlocks.map((b: { start_time: string; end_time: string; block_reason?: string }) => ({
          start_time: b.start_time,
          end_time: b.end_time,
          reason: b.block_reason
        })) : undefined
      };
      
    } catch (error) {
      console.error('Error getting instructor availability:', error);
      return null;
    }
  }

  /**
   * Check if a specific time slot is available
   */
  async isTimeSlotAvailable(
    instructorId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string
  ): Promise<{ available: boolean; reason?: string }> {
    try {
      const supabase = await this.getSupabase();
      
      // Check for appointment conflicts
      let conflictQuery = supabase
        .from('appointments')
        .select('id')
        .eq('instructor_id', instructorId)
        .eq('appointment_date', date)
        .not('status', 'eq', 'cancelled')
        .or(`start_time.lte.${startTime},end_time.gte.${endTime}`)
        .or(`start_time.lt.${endTime},end_time.gt.${startTime}`);
      
      if (excludeAppointmentId) {
        conflictQuery = conflictQuery.neq('id', excludeAppointmentId);
      }
      
      const { data: conflicts } = await conflictQuery;
      
      if (conflicts && conflicts.length > 0) {
        return { available: false, reason: 'Time slot already booked' };
      }
      
      // Check availability rules
      const dayOfWeek = new Date(date).getDay();
      const { data: availabilityRules } = await supabase
        .from('instructor_availability')
        .select('*')
        .eq('instructor_id', instructorId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);
      
      if (!availabilityRules || availabilityRules.length === 0) {
        return { available: false, reason: 'Instructor not available on this day' };
      }
      
      const timeSlotValid = availabilityRules.some((rule: { start_time: string; end_time: string }) => 
        rule.start_time <= startTime && rule.end_time >= endTime
      );
      
      if (!timeSlotValid) {
        return { available: false, reason: 'Time slot outside working hours' };
      }
      
      // Check for time blocks
      const { data: blocks } = await supabase
        .from('time_blocks')
        .select('*')
        .eq('instructor_id', instructorId)
        .eq('block_date', date)
        .eq('is_blocked', true);
      
      if (blocks && blocks.length > 0) {
        const hasConflict = blocks.some((block: { start_time: string; end_time: string }) =>
          block.start_time <= startTime && block.end_time >= endTime ||
          block.start_time < endTime && block.end_time > startTime
        );
        
        if (hasConflict) {
          return { available: false, reason: 'Time slot blocked by instructor' };
        }
      }
      
      return { available: true };
      
    } catch (error) {
      console.error('Error checking time slot availability:', error);
      return { available: false, reason: 'Unable to verify availability' };
    }
  }

  // =============================================================================
  // APPOINTMENT CREATION & MANAGEMENT
  // =============================================================================

  /**
   * Create a new appointment with full validation
   */
  async createAppointment(data: {
    userId: string;
    instructorId: string;
    appointmentTypeId: string;
    appointmentDate: string;
    startTime: string;
    meetingType: string;
    meetingLocation?: string;
    notes?: string;
  }): Promise<{ success: boolean; appointment?: AppointmentWithDetails; error?: string }> {
    try {
      const supabase = await this.getSupabase();
      
      // Get appointment type
      const { data: appointmentType, error: typeError } = await supabase
        .from('appointment_types')
        .select('*')
        .eq('id', data.appointmentTypeId)
        .eq('is_active', true)
        .single();
      
      if (typeError || !appointmentType) {
        return { success: false, error: 'Invalid appointment type' };
      }
      
      // Calculate end time
      const startTime = new Date(`${data.appointmentDate}T${data.startTime}`);
      const endTime = new Date(startTime.getTime() + appointmentType.duration_minutes * 60000);
      const endTimeString = endTime.toTimeString().slice(0, 5);
      
      // Check availability
      const availabilityCheck = await this.isTimeSlotAvailable(
        data.instructorId,
        data.appointmentDate,
        data.startTime,
        endTimeString
      );
      
      if (!availabilityCheck.available) {
        return { success: false, error: availabilityCheck.reason };
      }
      
      // Validate business rules
      const businessRuleCheck = await this.validateBusinessRules(
        data.instructorId,
        data.appointmentDate,
        data.startTime,
        appointmentType
      );
      
      if (!businessRuleCheck.valid) {
        return { success: false, error: businessRuleCheck.reason };
      }
      
      // Create appointment
      const appointmentData = {
        user_id: data.userId,
        instructor_id: data.instructorId,
        appointment_type_id: data.appointmentTypeId,
        appointment_date: data.appointmentDate,
        start_time: data.startTime,
        end_time: endTimeString,
        duration_minutes: appointmentType.duration_minutes,
        status: 'pending' as AppointmentStatus,
        meeting_type: data.meetingType,
        meeting_location: data.meetingLocation,
        title: appointmentType.type_name,
        description: appointmentType.description,
        notes: data.notes,
        reminder_sent: false
      };
      
      const { data: appointment, error: createError } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select(`
          *,
          instructor:identities!appointments_instructor_id_fkey(
            id,
            full_name,
            email,
            profile_image_url,
            bio
          ),
          appointment_type:appointment_types(*)
        `)
        .single();
      
      if (createError) {
        console.error('Error creating appointment:', createError);
        return { success: false, error: 'Failed to create appointment' };
      }
      
      // Schedule notifications
      await this.scheduleAppointmentNotifications(appointment.id, data.appointmentDate, data.startTime);
      
      return { success: true, appointment };
      
    } catch (error) {
      console.error('Error in createAppointment:', error);
      return { success: false, error: 'Internal error occurred' };
    }
  }

  /**
   * Cancel an appointment with validation
   */
  async cancelAppointment(
    appointmentId: string,
    userId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await this.getSupabase();
      
      // Get appointment
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          appointment_type:appointment_types(cancellation_hours)
        `)
        .eq('id', appointmentId)
        .single();
      
      if (fetchError || !appointment) {
        return { success: false, error: 'Appointment not found' };
      }
      
      // Check permission
      if (appointment.user_id !== userId) {
        return { success: false, error: 'Access denied' };
      }
      
      // Check if already cancelled
      if (appointment.status === 'cancelled') {
        return { success: false, error: 'Appointment is already cancelled' };
      }
      
      // Check cancellation policy
      const now = new Date();
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
      const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilAppointment < appointment.appointment_type.cancellation_hours) {
        return { 
          success: false, 
          error: `Appointments must be cancelled at least ${appointment.appointment_type.cancellation_hours} hours in advance` 
        };
      }
      
      // Cancel appointment
      const { error: cancelError } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', appointmentId);
      
      if (cancelError) {
        console.error('Error cancelling appointment:', cancelError);
        return { success: false, error: 'Failed to cancel appointment' };
      }
      
      // Send cancellation notification
      await this.scheduleNotification(appointmentId, NotificationType.CANCELLATION, now);
      
      return { success: true };
      
    } catch (error) {
      console.error('Error in cancelAppointment:', error);
      return { success: false, error: 'Internal error occurred' };
    }
  }

  // =============================================================================
  // BOOKING SESSION MANAGEMENT
  // =============================================================================

  /**
   * Create a new booking session
   */
  async createBookingSession(
    userId?: string,
    initialData?: any
  ): Promise<{ success: boolean; session?: BookingSession; error?: string }> {
    try {
      const supabase = await this.getSupabase();
      
      const sessionToken = this.generateSessionToken();
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      
      const { data: session, error } = await supabase
        .from('booking_sessions')
        .insert({
          user_id: userId || null,
          session_token: sessionToken,
          current_step: 'instructor_selection',
          data: initialData || {},
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating booking session:', error);
        return { success: false, error: 'Failed to create booking session' };
      }
      
      return { success: true, session };
      
    } catch (error) {
      console.error('Error in createBookingSession:', error);
      return { success: false, error: 'Internal error occurred' };
    }
  }

  // =============================================================================
  // NOTIFICATION MANAGEMENT
  // =============================================================================

  /**
   * Schedule all notifications for an appointment
   */
  async scheduleAppointmentNotifications(
    appointmentId: string,
    appointmentDate: string,
    startTime: string
  ): Promise<void> {
    try {
      const appointmentDateTime = new Date(`${appointmentDate}T${startTime}`);
      const now = new Date();
      
      // Confirmation notification (immediate)
      await this.scheduleNotification(appointmentId, NotificationType.CONFIRMATION, now);
      
      // 24-hour reminder
      const reminder24h = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
      if (reminder24h > now) {
        await this.scheduleNotification(appointmentId, NotificationType.REMINDER_24H, reminder24h);
      }
      
      // 1-hour reminder
      const reminder1h = new Date(appointmentDateTime.getTime() - 60 * 60 * 1000);
      if (reminder1h > now) {
        await this.scheduleNotification(appointmentId, NotificationType.REMINDER_1H, reminder1h);
      }
      
    } catch (error) {
      console.error('Error scheduling appointment notifications:', error);
      // Don't throw - notification failures shouldn't break appointment creation
    }
  }

  /**
   * Schedule a single notification
   */
  async scheduleNotification(
    appointmentId: string,
    type: NotificationType,
    scheduledTime: Date,
    templateData?: Record<string, any>
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase();
      
      await supabase
        .from('appointment_notifications')
        .insert({
          appointment_id: appointmentId,
          notification_type: type,
          scheduled_time: scheduledTime.toISOString(),
          is_sent: false,
          template_data: templateData || {}
        });
      
    } catch (error) {
      console.error(`Error scheduling ${type} notification:`, error);
      throw error;
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private async getInstructorInfo(instructorId: string) {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('identities')
      .select('id, full_name, status, role')
      .eq('id', instructorId)
      .single();
    
    if (error || !data || data.status !== 'active' || 
        (data.role !== 'instructor' && data.role !== 'admin')) {
      return null;
    }
    
    return data;
  }

  private async getAvailabilityRules(instructorId: string, dayOfWeek: number) {
    const supabase = await this.getSupabase();
    const { data } = await supabase
      .from('instructor_availability')
      .select('*')
      .eq('instructor_id', instructorId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true);
    
    return data || [];
  }

  private async getExistingAppointments(instructorId: string, date: string) {
    const supabase = await this.getSupabase();
    const { data } = await supabase
      .from('appointments')
      .select('start_time, end_time, id')
      .eq('instructor_id', instructorId)
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed']);
    
    return data || [];
  }

  private async getTimeBlocks(instructorId: string, date: string) {
    const supabase = await this.getSupabase();
    const { data } = await supabase
      .from('time_blocks')
      .select('start_time, end_time, block_reason')
      .eq('instructor_id', instructorId)
      .eq('block_date', date)
      .eq('is_blocked', true);
    
    return data || [];
  }

  private generateTimeSlots(
    availabilityRules: any[],
    existingAppointments: any[],
    timeBlocks: any[],
    durationMinutes: number
  ): TimeSlot[] {
    const allSlots: TimeSlot[] = [];
    
    availabilityRules.forEach(rule => {
      const ruleSlots = this.generateSlotsForTimeRange(
        rule.start_time,
        rule.end_time,
        durationMinutes,
        rule.buffer_time_minutes || 15,
        existingAppointments,
        timeBlocks
      );
      
      allSlots.push(...ruleSlots);
    });
    
    return this.deduplicateAndSortSlots(allSlots);
  }

  private generateSlotsForTimeRange(
    startTime: string,
    endTime: string,
    durationMinutes: number,
    bufferMinutes: number,
    appointments: any[],
    blocks: any[]
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    
    let currentMinutes = startMinutes;
    
    while (currentMinutes + durationMinutes <= endMinutes) {
      const slotStart = this.minutesToTime(currentMinutes);
      const slotEnd = this.minutesToTime(currentMinutes + durationMinutes);
      
      const hasConflict = this.hasTimeConflict(
        currentMinutes,
        currentMinutes + durationMinutes,
        appointments,
        blocks
      );
      
      slots.push({
        start_time: slotStart,
        end_time: slotEnd,
        available: !hasConflict,
        buffer_before: bufferMinutes,
        buffer_after: bufferMinutes
      });
      
      currentMinutes += durationMinutes + bufferMinutes;
    }
    
    return slots;
  }

  private hasTimeConflict(
    slotStartMinutes: number,
    slotEndMinutes: number,
    appointments: any[],
    blocks: any[]
  ): boolean {
    // Check appointment conflicts
    for (const appointment of appointments) {
      const apptStart = this.timeToMinutes(appointment.start_time);
      const apptEnd = this.timeToMinutes(appointment.end_time);
      
      if (slotStartMinutes < apptEnd && slotEndMinutes > apptStart) {
        return true;
      }
    }
    
    // Check block conflicts
    for (const block of blocks) {
      const blockStart = this.timeToMinutes(block.start_time);
      const blockEnd = this.timeToMinutes(block.end_time);
      
      if (slotStartMinutes < blockEnd && slotEndMinutes > blockStart) {
        return true;
      }
    }
    
    return false;
  }

  private deduplicateAndSortSlots(slots: TimeSlot[]): TimeSlot[] {
    const uniqueSlots: TimeSlot[] = [];
    const seenSlots = new Set<string>();
    
    slots.sort((a, b) => a.start_time.localeCompare(b.start_time));
    
    for (const slot of slots) {
      const slotKey = `${slot.start_time}-${slot.end_time}`;
      if (!seenSlots.has(slotKey)) {
        seenSlots.add(slotKey);
        uniqueSlots.push(slot);
      }
    }
    
    return uniqueSlots;
  }

  private calculateWorkingHours(availabilityRules: any[]): { start: string; end: string } {
    if (availabilityRules.length === 0) {
      return { start: '09:00', end: '17:00' };
    }
    
    let earliestStart = '23:59';
    let latestEnd = '00:00';
    
    availabilityRules.forEach(rule => {
      if (rule.start_time < earliestStart) earliestStart = rule.start_time;
      if (rule.end_time > latestEnd) latestEnd = rule.end_time;
    });
    
    return { start: earliestStart, end: latestEnd };
  }

  private async validateBusinessRules(
    instructorId: string,
    appointmentDate: string,
    startTime: string,
    appointmentType: any
  ): Promise<{ valid: boolean; reason?: string }> {
    const now = new Date();
    const appointmentDateTime = new Date(`${appointmentDate}T${startTime}`);
    
    // Check if appointment is in the past
    if (appointmentDateTime <= now) {
      return { valid: false, reason: 'Cannot book appointments in the past' };
    }
    
    // Check booking advance limit
    const daysUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilAppointment > appointmentType.booking_advance_days) {
      return { 
        valid: false, 
        reason: `Cannot book more than ${appointmentType.booking_advance_days} days in advance` 
      };
    }
    
    // Add more business rules as needed
    
    return { valid: true };
  }

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && Boolean(dateString.match(/^\d{4}-\d{2}-\d{2}$/));
  }

  private generateSessionToken(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2);
    return `booking_${timestamp}_${randomPart}`;
  }
}

// Export singleton instance
export const appointmentService = new AppointmentService();