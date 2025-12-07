'use client'

import React, { useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Stack,
  Box,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useForm, Controller } from 'react-hook-form'
import { format } from 'date-fns'

interface CalendarEvent {
  id?: string
  title: string
  description?: string
  start_date: Date
  end_date?: Date
  category: string
  is_public: boolean
}

interface EventDialogProps {
  open: boolean
  onClose: () => void
  onSave: (event: CalendarEvent) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  initialEvent?: CalendarEvent | null
  selectedDate?: Date | null
}

export default function EventDialog({
  open,
  onClose,
  onSave,
  onDelete,
  initialEvent,
  selectedDate,
}: EventDialogProps) {
  const { control, handleSubmit, reset, setValue } = useForm<CalendarEvent>({
    defaultValues: {
      title: '',
      description: '',
      start_date: new Date(),
      end_date: undefined,
      category: 'event',
      is_public: true,
    },
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (initialEvent) {
        reset({
          ...initialEvent,
          start_date: new Date(initialEvent.start_date),
          end_date: initialEvent.end_date ? new Date(initialEvent.end_date) : undefined,
        })
      } else {
        reset({
          title: '',
          description: '',
          start_date: selectedDate || new Date(),
          end_date: undefined,
          category: 'event',
          is_public: true,
        })
      }
    }
  }, [open, initialEvent, selectedDate, reset])

  const onSubmit = async (data: CalendarEvent) => {
    await onSave({
      ...data,
      id: initialEvent?.id,
    })
    onClose()
  }

  const handleDelete = async () => {
    if (initialEvent?.id && onDelete) {
      if (confirm('이 일정을 삭제하시겠습니까?')) {
        await onDelete(initialEvent.id)
        onClose()
      }
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialEvent ? '일정 수정' : '새 일정 추가'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Controller
              name="title"
              control={control}
              rules={{ required: '제목을 입력해주세요' }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="제목"
                  fullWidth
                  error={!!error}
                  helperText={error?.message}
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="설명"
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="일정에 대한 상세 내용을 입력하세요"
                />
              )}
            />

            <Stack direction="row" spacing={2}>
              <Controller
                name="start_date"
                control={control}
                rules={{ required: '시작일을 선택해주세요' }}
                render={({ field }) => (
                  <DatePicker
                    label="시작일"
                    value={field.value}
                    onChange={field.onChange}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                )}
              />
              <Controller
                name="end_date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="종료일 (선택)"
                    value={field.value}
                    onChange={field.onChange}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                )}
              />
            </Stack>

            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>카테고리</InputLabel>
                  <Select {...field} label="카테고리">
                    <MenuItem value="event">행사</MenuItem>
                    <MenuItem value="training">연수</MenuItem>
                    <MenuItem value="meeting">회의</MenuItem>
                    <MenuItem value="academic">학사일정</MenuItem>
                    <MenuItem value="other">기타</MenuItem>
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="is_public"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label="전체 공개"
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          {initialEvent && onDelete && (
            <Button onClick={handleDelete} color="error" sx={{ mr: 'auto' }}>
              삭제
            </Button>
          )}
          <Button onClick={onClose}>취소</Button>
          <Button type="submit" variant="contained">
            저장
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
