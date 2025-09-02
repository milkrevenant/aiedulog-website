import { useState, useEffect, useCallback } from 'react'
import {
  AppointmentWithDetails,
  AppointmentStatus,
  MeetingType,
  AppointmentFilters,
  PaginatedResponse,
  ApiResponse,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  CancelAppointmentRequest,
  RescheduleAppointmentRequest
} from '@/types/appointment-system'

export interface UseAppointmentsOptions {
  filters?: Partial<AppointmentFilters>
  autoLoad?: boolean
  realtime?: boolean
}

export interface UseAppointmentsReturn {
  // Data
  appointments: AppointmentWithDetails[]
  loading: boolean
  error: string | null
  totalPages: number
  currentPage: number
  hasMore: boolean
  stats: {
    total: number
    pending: number
    confirmed: number
    completed: number
    cancelled: number
  }

  // Actions
  loadAppointments: (page?: number, append?: boolean) => Promise<void>
  createAppointment: (request: CreateAppointmentRequest) => Promise<AppointmentWithDetails | null>
  updateAppointment: (id: string, request: UpdateAppointmentRequest) => Promise<AppointmentWithDetails | null>
  cancelAppointment: (id: string, reason: string) => Promise<boolean>
  rescheduleAppointment: (id: string, newDate: string, newTime: string, reason?: string) => Promise<boolean>
  downloadCalendar: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
  
  // Filters
  setFilters: (filters: Partial<AppointmentFilters>) => void
  setPage: (page: number) => void
  resetFilters: () => void
}

const DEFAULT_FILTERS: AppointmentFilters = {
  limit: 10,
  offset: 0,
  sort_by: 'date',
  sort_order: 'desc'
}

export function useAppointments(options: UseAppointmentsOptions = {}): UseAppointmentsReturn {
  const {
    filters: initialFilters = {},
    autoLoad = true,
    realtime = false
  } = options

  // State
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [filters, setFiltersState] = useState<AppointmentFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  })
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0
  })

  // Load appointments
  const loadAppointments = useCallback(async (page = 1, append = false) => {
    try {
      if (!append) setLoading(true)
      setError(null)

      const requestFilters: AppointmentFilters = {
        ...filters,
        offset: (page - 1) * (filters.limit || 10)
      }

      const params = new URLSearchParams()
      Object.entries(requestFilters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','))
          } else {
            params.append(key, value.toString())
          }
        }
      })

      const response = await fetch(`/api/appointments?${params}`)
      const data: PaginatedResponse<AppointmentWithDetails> = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load appointments')
      }

      if (append) {
        setAppointments(prev => [...prev, ...(data.data || [])])
      } else {
        setAppointments(data.data || [])
      }

      setTotalPages(data.meta.total_pages)
      setCurrentPage(page)
      setHasMore(data.meta.has_more)
      
      // Calculate stats from response metadata
      const total = data.meta.total
      const statusCounts = (data.data || []).reduce((acc, apt) => {
        acc[apt.status as keyof typeof acc] = (acc[apt.status as keyof typeof acc] || 0) + 1
        return acc
      }, { pending: 0, confirmed: 0, completed: 0, cancelled: 0 })
      
      setStats({ total, ...statusCounts })
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load appointments'
      setError(errorMessage)
      console.error('Error loading appointments:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Create appointment
  const createAppointment = useCallback(async (
    request: CreateAppointmentRequest
  ): Promise<AppointmentWithDetails | null> => {
    try {
      setError(null)

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data: ApiResponse<AppointmentWithDetails> = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create appointment')
      }

      // Refresh appointments list
      await loadAppointments(currentPage)
      
      return data.data || null
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create appointment'
      setError(errorMessage)
      console.error('Error creating appointment:', err)
      return null
    }
  }, [currentPage, loadAppointments])

  // Update appointment
  const updateAppointment = useCallback(async (
    id: string,
    request: UpdateAppointmentRequest
  ): Promise<AppointmentWithDetails | null> => {
    try {
      setError(null)

      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data: ApiResponse<AppointmentWithDetails> = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update appointment')
      }

      // Update appointment in local state
      if (data.data) {
        setAppointments(prev => 
          prev.map(apt => apt.id === id ? data.data! : apt)
        )
      }
      
      return data.data || null
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update appointment'
      setError(errorMessage)
      console.error('Error updating appointment:', err)
      return null
    }
  }, [])

  // Cancel appointment
  const cancelAppointment = useCallback(async (
    id: string,
    reason: string
  ): Promise<boolean> => {
    try {
      setError(null)

      const request: CancelAppointmentRequest = {
        reason,
        notify_instructor: true
      }

      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data: ApiResponse<AppointmentWithDetails> = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel appointment')
      }

      // Update appointment in local state
      if (data.data) {
        setAppointments(prev => 
          prev.map(apt => apt.id === id ? data.data! : apt)
        )
      }
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel appointment'
      setError(errorMessage)
      console.error('Error cancelling appointment:', err)
      return false
    }
  }, [])

  // Reschedule appointment
  const rescheduleAppointment = useCallback(async (
    id: string,
    newDate: string,
    newTime: string,
    reason = 'User requested reschedule'
  ): Promise<boolean> => {
    try {
      setError(null)

      const request: RescheduleAppointmentRequest = {
        new_date: newDate,
        new_time: newTime,
        reason
      }

      const response = await fetch(`/api/appointments/${id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request reschedule')
      }
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request reschedule'
      setError(errorMessage)
      console.error('Error requesting reschedule:', err)
      return false
    }
  }, [])

  // Download calendar file
  const downloadCalendar = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null)

      const response = await fetch(`/api/appointments/${id}/calendar`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate calendar file')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `appointment-${id}.ics`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download calendar file'
      setError(errorMessage)
      console.error('Error downloading calendar file:', err)
      return false
    }
  }, [])

  // Refresh appointments
  const refresh = useCallback(async () => {
    await loadAppointments(currentPage)
  }, [loadAppointments, currentPage])

  // Set filters
  const setFilters = useCallback((newFilters: Partial<AppointmentFilters>) => {
    setFiltersState(prev => ({
      ...prev,
      ...newFilters,
      offset: 0 // Reset pagination when filters change
    }))
    setCurrentPage(1)
  }, [])

  // Set page
  const setPage = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  // Reset filters
  const resetFilters = useCallback(() => {
    setFiltersState({ ...DEFAULT_FILTERS, ...initialFilters })
    setCurrentPage(1)
  }, [initialFilters])

  // Auto-load on mount and when filters change
  useEffect(() => {
    if (autoLoad) {
      loadAppointments(currentPage)
    }
  }, [loadAppointments, currentPage, autoLoad])

  // Real-time updates (if enabled)
  useEffect(() => {
    if (!realtime) return

    // TODO: Implement real-time subscription using Supabase or WebSocket
    // This would listen for appointment changes and update the local state
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [realtime, refresh])

  return {
    // Data
    appointments,
    loading,
    error,
    totalPages,
    currentPage,
    hasMore,
    stats,

    // Actions
    loadAppointments,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    rescheduleAppointment,
    downloadCalendar,
    refresh,
    
    // Filters
    setFilters,
    setPage,
    resetFilters
  }
}