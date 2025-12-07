import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/rds-auth-helpers';
import { createRDSClient } from '@/lib/db/rds-client';
import { withAdminSecurity } from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import { TableRow } from '@/lib/db/types';
import {
  AppointmentStats,
  ApiResponse
} from '@/types/appointment-system';

type AppointmentRow = TableRow<'appointments'>;
type AppointmentTypeRow = TableRow<'appointment_types'>;
type UserProfileSummary = Pick<TableRow<'user_profiles'>, 'user_id' | 'full_name'>;

type AppointmentWithType = AppointmentRow & {
  appointment_type?: Pick<AppointmentTypeRow, 'price'> | null;
  instructor?: UserProfileSummary | null;
};

/**
 * GET /api/admin/appointments/stats - Get comprehensive appointment statistics
 *
 * MIGRATION: Migrated to RDS with requireAdmin() (2025-10-14)
 * Security: Admin access only
 *
 * Query Parameters:
 * - period: string (optional) - 'week', 'month', 'quarter', 'year' (default: 'month')
 * - instructor_id: string (optional) - Filter by specific instructor
 * - start_date: string (optional) - Custom date range start (YYYY-MM-DD)
 * - end_date: string (optional) - Custom date range end (YYYY-MM-DD)
 */
const getHandler = async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const rds = createRDSClient();
    const { searchParams } = new URL(request.url);
    
    const period = searchParams.get('period') || 'month';
    const instructorId = searchParams.get('instructor_id');
    const customStartDate = searchParams.get('start_date');
    const customEndDate = searchParams.get('end_date');
    
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let endDate = now;
    
    if (customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    } else {
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStart, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Build base query
    let baseQuery = rds
      .from('appointments')
      .select('*')
      .gte('appointment_date', startDateStr)
      .lte('appointment_date', endDateStr);
    
    if (instructorId) {
      baseQuery = baseQuery.eq('instructor_id', instructorId);
    }
    
    // Get all appointments for the period
    const { data: appointments, error: appointmentsError } = await baseQuery;
    
    if (appointmentsError) {
      console.error('Error fetching appointments for stats:', appointmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch appointment statistics' } as ApiResponse,
        { status: 500 }
      );
    }
    
    // Calculate basic stats
    const appointmentRows = (appointments ?? []) as AppointmentRow[];

    const totalAppointments = appointmentRows.length;
    const confirmedAppointments = appointmentRows.filter(a => a.status === 'confirmed').length;
    const pendingAppointments = appointmentRows.filter(a => a.status === 'pending').length;
    const cancelledAppointments = appointmentRows.filter(a => a.status === 'cancelled').length;
    const completedAppointments = appointmentRows.filter(a => a.status === 'completed').length;
    const noShowAppointments = appointmentRows.filter(a => a.status === 'no_show').length;
    
    // Get popular time slots
    const timeSlotCounts = new Map<string, number>();
    appointmentRows.forEach(appointment => {
      const timeSlot = appointment.start_time.substring(0, 5); // HH:mm format
      timeSlotCounts.set(timeSlot, (timeSlotCounts.get(timeSlot) || 0) + 1);
    });
    
    const popularTimeSlots = Array.from(timeSlotCounts.entries())
      .map(([time_slot, booking_count]) => ({ time_slot, booking_count }))
      .sort((a, b) => b.booking_count - a.booking_count)
      .slice(0, 10); // Top 10 time slots
    
    // Get instructor performance data
    const instructorPerformancePromises = await getInstructorPerformance(
      rds,
      startDateStr,
      endDateStr,
      instructorId || undefined
    );

    // Get revenue data (if appointment types have prices)
    const revenueData = await getRevenueData(rds, appointmentRows);

    // Get current month revenue for comparison
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const currentMonthEnd = now.toISOString().split('T')[0];

    let currentMonthQuery = rds
      .from('appointments')
      .select(`
        *,
        appointment_type:appointment_types(price)
      `)
      .gte('appointment_date', currentMonthStart)
      .lte('appointment_date', currentMonthEnd)
      .eq('status', 'completed');
    
    if (instructorId) {
      currentMonthQuery = currentMonthQuery.eq('instructor_id', instructorId);
    }
    
    const { data: currentMonthAppointments } = await currentMonthQuery;
    const typedCurrentMonthAppointments = (currentMonthAppointments ?? []) as AppointmentWithType[];
    const currentMonthRevenue = typedCurrentMonthAppointments.reduce((total, appointment) => {
      return total + (appointment.appointment_type?.price || 0);
    }, 0);
    
    const stats: AppointmentStats = {
      total_appointments: totalAppointments,
      confirmed_appointments: confirmedAppointments,
      pending_appointments: pendingAppointments,
      cancelled_appointments: cancelledAppointments,
      completed_appointments: completedAppointments,
      no_show_appointments: noShowAppointments,
      revenue_total: revenueData.total,
      revenue_this_month: currentMonthRevenue,
      popular_time_slots: popularTimeSlots,
      instructor_performance: instructorPerformancePromises
    };
    
    const response = {
      data: stats,
      meta: {
        period,
        start_date: startDateStr,
        end_date: endDateStr,
        instructor_id: instructorId
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in admin appointment stats handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * Get instructor performance data
 */
async function getInstructorPerformance(
  rds: any,
  startDate: string,
  endDate: string,
  instructorId?: string
): Promise<any[]> {
  try {
    let query = rds
      .from('appointments')
      .select(`
        instructor_id,
        status,
        appointment_type:appointment_types(price),
        instructor:user_profiles!appointments_instructor_id_fkey(full_name)
      `)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate);
    
    if (instructorId) {
      query = query.eq('instructor_id', instructorId);
    }
    
    const { data: appointmentData, error } = await query;
    const typedAppointments = (appointmentData ?? []) as AppointmentWithType[];
    
    if (error) {
      console.error('Error fetching instructor performance data:', error);
      return [];
    }
    
    // Group by instructor
    const instructorStats = new Map();
    
    typedAppointments.forEach(appointment => {
      const instructorIdKey = appointment.instructor_id;
      
      if (!instructorStats.has(instructorIdKey)) {
        instructorStats.set(instructorIdKey, {
          instructor_id: instructorIdKey,
          instructor_name: appointment.instructor?.full_name || 'Unknown',
          total_bookings: 0,
          completed_bookings: 0,
          revenue: 0
        });
      }
      
      const stats = instructorStats.get(instructorIdKey);
      stats.total_bookings++;
      
      if (appointment.status === 'completed') {
        stats.completed_bookings++;
        stats.revenue += appointment.appointment_type?.price || 0;
      }
    });
    
    // Calculate completion rates and format response
    return Array.from(instructorStats.values()).map(stats => ({
      instructor_id: stats.instructor_id,
      instructor_name: stats.instructor_name,
      total_bookings: stats.total_bookings,
      completion_rate: stats.total_bookings > 0 ? 
        Math.round((stats.completed_bookings / stats.total_bookings) * 100) / 100 : 0,
      average_rating: 0, // Placeholder - would need rating system
      revenue: stats.revenue
    })).sort((a, b) => b.total_bookings - a.total_bookings);
    
  } catch (error) {
    console.error('Error calculating instructor performance:', error);
    return [];
  }
}

/**
 * Calculate revenue data
 */
async function getRevenueData(
  rds: any,
  appointments: AppointmentRow[]
): Promise<{ total: number }> {
  try {
    // Get appointment type prices for completed appointments
    const completedAppointments = appointments.filter(a => a.status === 'completed');

    if (completedAppointments.length === 0) {
      return { total: 0 };
    }

    const appointmentTypeIds = [...new Set(completedAppointments.map(a => a.appointment_type_id))];

    const { data: appointmentTypes, error } = await rds
      .from('appointment_types')
      .select('id, price')
      .in('id', appointmentTypeIds);
    
    if (error) {
      console.error('Error fetching appointment type prices:', error);
      return { total: 0 };
    }
    
    // Create price lookup
    const priceMap = new Map();
    (appointmentTypes ?? []).forEach((type: AppointmentTypeRow) => {
      priceMap.set(type.id, type.price || 0);
    });
    
    // Calculate total revenue
    const totalRevenue = completedAppointments.reduce((total, appointment) => {
      return total + (priceMap.get(appointment.appointment_type_id) || 0);
    }, 0);
    
    return { total: totalRevenue };
    
  } catch (error) {
    console.error('Error calculating revenue:', error);
    return { total: 0 };
  }
}

export const GET = withAdminSecurity(getHandler);
