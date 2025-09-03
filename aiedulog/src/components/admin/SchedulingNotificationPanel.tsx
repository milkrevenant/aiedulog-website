'use client';

/**
 * Scheduling Notification Management Panel
 * 
 * Admin/instructor interface for managing scheduling notifications,
 * testing notification delivery, and configuring notification preferences.
 */

import React, { useState, useEffect } from 'react';
import { ClientSanitizedContent } from '@/components/client/ClientSanitizedContent';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import Grid from '@mui/material/Grid';
import {
  Notifications,
  Email,
  Sms,
  Schedule,
  Send,
  Settings,
  Preview,
  Download,
  CheckCircle,
  Error,
  Warning,
  Info
} from '@mui/icons-material';

interface NotificationConfig {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  reminder24h: boolean;
  reminder1h: boolean;
  reminder15m: boolean;
}

interface NotificationPreferences {
  appointment_confirmations: boolean;
  appointment_reminders_24h: boolean;
  appointment_reminders_1h: boolean;
  appointment_reminders_15m: boolean;
  appointment_changes: boolean;
  instructor_notifications: boolean;
  waitlist_notifications: boolean;
  channels: string[];
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

interface TestNotification {
  id: string;
  type: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  timestamp: string;
}

export default function SchedulingNotificationPanel() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    appointment_confirmations: true,
    appointment_reminders_24h: true,
    appointment_reminders_1h: true,
    appointment_reminders_15m: true,
    appointment_changes: true,
    instructor_notifications: true,
    waitlist_notifications: true,
    channels: ['in_app', 'email']
  });
  const [testResults, setTestResults] = useState<TestNotification[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState('');
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  // Load notification preferences on component mount
  useEffect(() => {
    loadNotificationPreferences();
  }, []);

  const loadNotificationPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/scheduling?action=get_notification_preferences');
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        const prefs = result.data[0];
        setPreferences({
          appointment_confirmations: prefs.appointment_confirmations ?? true,
          appointment_reminders_24h: prefs.appointment_reminders_24h ?? true,
          appointment_reminders_1h: prefs.appointment_reminders_1h ?? true,
          appointment_reminders_15m: prefs.appointment_reminders_15m ?? true,
          appointment_changes: prefs.appointment_changes ?? true,
          instructor_notifications: prefs.instructor_notifications ?? true,
          waitlist_notifications: prefs.waitlist_notifications ?? true,
          channels: prefs.channels || ['in_app', 'email'],
          quiet_hours_start: prefs.quiet_hours_start,
          quiet_hours_end: prefs.quiet_hours_end
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNotificationPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/scheduling', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_notification_preferences',
          preferences
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('알림 설정이 저장되었습니다.');
      } else {
        alert('저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async (notificationType: string) => {
    if (!selectedAppointment && notificationType !== 'waitlist_available') {
      alert('테스트할 예약을 선택해주세요.');
      return;
    }

    const testId = `test-${Date.now()}`;
    const newTest: TestNotification = {
      id: testId,
      type: notificationType,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    setTestResults(prev => [newTest, ...prev]);

    try {
      let body: any = { action: `send_${notificationType}` };
      
      if (selectedAppointment) {
        body.appointmentId = selectedAppointment;
      }

      if (notificationType === 'waitlist_available') {
        body.waitlistData = {
          targetUserId: 'test-user-id',
          instructorName: '김영희 강사',
          appointmentType: '영어 회화 수업',
          appointmentDate: '2024년 9월 15일 일요일',
          appointmentTime: '오후 2:00',
          bookingLink: 'https://aiedulog.com/booking'
        };
      }

      const response = await fetch('/api/notifications/scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      setTestResults(prev => prev.map(test => 
        test.id === testId 
          ? { 
              ...test, 
              status: result.success ? 'success' : 'error',
              message: result.success ? '알림이 성공적으로 전송되었습니다.' : result.error?.message 
            }
          : test
      ));

    } catch (error) {
      setTestResults(prev => prev.map(test => 
        test.id === testId 
          ? { 
              ...test, 
              status: 'error',
              message: '알림 전송 중 오류가 발생했습니다.'
            }
          : test
      ));
    }
  };

  const downloadCalendarFile = async () => {
    if (!selectedAppointment) {
      alert('캘린더 파일을 생성할 예약을 선택해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/notifications/scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_calendar_file',
          appointmentId: selectedAppointment
        })
      });

      if (response.ok) {
        const icsContent = await response.text();
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `appointment-${selectedAppointment}.ics`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('캘린더 파일 생성 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error downloading calendar file:', error);
      alert('캘린더 파일 생성 중 오류가 발생했습니다.');
    }
  };

  const previewTemplate = (templateType: string) => {
    const templates = {
      booking_confirmation: `
        <h2>예약이 완료되었습니다</h2>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
          <p><strong>강사:</strong> 김영희 강사</p>
          <p><strong>수업 유형:</strong> 영어 회화 수업</p>
          <p><strong>일시:</strong> 2024년 9월 15일 일요일 오후 2:00</p>
          <p><strong>예약 번호:</strong> APT-2024-001</p>
        </div>
      `,
      reminder_24h: `
        <h2>⏰ 내일 수업이 있습니다</h2>
        <div style="background: #fffbeb; padding: 20px; border-radius: 8px;">
          <p><strong>강사:</strong> 김영희 강사</p>
          <p><strong>시간:</strong> 내일 오후 2:00</p>
          <p><strong>회의 링크:</strong> https://meet.google.com/abc-def-ghi</p>
        </div>
      `,
      cancellation: `
        <h2>예약이 취소되었습니다</h2>
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px;">
          <p><strong>취소된 수업:</strong> 영어 회화 수업</p>
          <p><strong>원래 일시:</strong> 2024년 9월 15일 오후 2:00</p>
          <p><strong>취소 사유:</strong> 강사 사정으로 인한 취소</p>
        </div>
      `
    };

    setPreviewContent(templates[templateType as keyof typeof templates] || '템플릿을 찾을 수 없습니다.');
    setPreviewDialog(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle color="success" />;
      case 'error': return <Error color="error" />;
      case 'pending': return <CircularProgress size={20} />;
      default: return <Info />;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        스케줄링 알림 관리
      </Typography>
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="알림 설정" icon={<Settings />} />
        <Tab label="알림 테스트" icon={<Send />} />
        <Tab label="템플릿 미리보기" icon={<Preview />} />
      </Tabs>
      {/* Tab 1: 알림 설정 */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid
            size={{
              xs: 12,
              md: 8
            }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  알림 유형별 설정
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={preferences.appointment_confirmations}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          appointment_confirmations: e.target.checked
                        }))}
                      />
                    }
                    label="예약 확정 알림"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={preferences.appointment_reminders_24h}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          appointment_reminders_24h: e.target.checked
                        }))}
                      />
                    }
                    label="24시간 전 알림"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={preferences.appointment_reminders_1h}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          appointment_reminders_1h: e.target.checked
                        }))}
                      />
                    }
                    label="1시간 전 알림"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={preferences.appointment_reminders_15m}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          appointment_reminders_15m: e.target.checked
                        }))}
                      />
                    }
                    label="15분 전 알림"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={preferences.appointment_changes}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          appointment_changes: e.target.checked
                        }))}
                      />
                    }
                    label="예약 변경/취소 알림"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={preferences.instructor_notifications}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          instructor_notifications: e.target.checked
                        }))}
                      />
                    }
                    label="강사 알림"
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={preferences.waitlist_notifications}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          waitlist_notifications: e.target.checked
                        }))}
                      />
                    }
                    label="대기자 명단 알림"
                  />
                </Box>

                <Button 
                  variant="contained" 
                  onClick={saveNotificationPreferences}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <Settings />}
                >
                  설정 저장
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid
            size={{
              xs: 12,
              md: 4
            }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  알림 채널 설정
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>알림 채널</InputLabel>
                  <Select
                    multiple
                    value={preferences.channels}
                    label="알림 채널"
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      channels: e.target.value as string[]
                    }))}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="in_app">인앱 알림</MenuItem>
                    <MenuItem value="email">이메일</MenuItem>
                    <MenuItem value="push">푸시 알림</MenuItem>
                    <MenuItem value="sms">SMS</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="조용한 시간 시작"
                  type="time"
                  fullWidth
                  sx={{ mb: 2 }}
                  value={preferences.quiet_hours_start || ''}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    quiet_hours_start: e.target.value
                  }))}
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="조용한 시간 종료"
                  type="time"
                  fullWidth
                  value={preferences.quiet_hours_end || ''}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    quiet_hours_end: e.target.value
                  }))}
                  InputLabelProps={{ shrink: true }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      {/* Tab 2: 알림 테스트 */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  알림 테스트
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>테스트할 예약 선택</InputLabel>
                  <Select
                    value={selectedAppointment}
                    label="테스트할 예약 선택"
                    onChange={(e) => setSelectedAppointment(e.target.value)}
                  >
                    <MenuItem value="test-appointment-1">영어 회화 수업 - 2024.09.15 14:00</MenuItem>
                    <MenuItem value="test-appointment-2">수학 과외 - 2024.09.16 16:00</MenuItem>
                    <MenuItem value="test-appointment-3">기타 레슨 - 2024.09.17 18:00</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Email />}
                    onClick={() => testNotification('booking_confirmation')}
                  >
                    예약 확인 알림 테스트
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<Schedule />}
                    onClick={() => testNotification('appointment_confirmation')}
                  >
                    예약 확정 알림 테스트
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<Notifications />}
                    onClick={() => testNotification('reminder_24h')}
                  >
                    24시간 전 알림 테스트
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<Warning />}
                    onClick={() => testNotification('cancellation')}
                  >
                    취소 알림 테스트
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<CheckCircle />}
                    onClick={() => testNotification('completion')}
                  >
                    완료 알림 테스트
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<Notifications />}
                    onClick={() => testNotification('waitlist_available')}
                  >
                    대기자 명단 알림 테스트
                  </Button>
                </Box>

                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={downloadCalendarFile}
                  fullWidth
                >
                  캘린더 파일 다운로드
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  테스트 결과
                </Typography>

                {testResults.length === 0 ? (
                  <Alert severity="info">
                    아직 테스트한 알림이 없습니다.
                  </Alert>
                ) : (
                  <List>
                    {testResults.map((test) => (
                      <ListItem key={test.id}>
                        <ListItemIcon>
                          {getStatusIcon(test.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={test.type}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="textSecondary">
                                {new Date(test.timestamp).toLocaleString()}
                              </Typography>
                              {test.message && (
                                <Typography variant="body2" color={test.status === 'error' ? 'error' : 'textSecondary'}>
                                  {test.message}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      {/* Tab 3: 템플릿 미리보기 */}
      {activeTab === 2 && (
        <Grid container spacing={2}>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 4
            }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  예약 확인
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  예약이 완료되었을 때 발송되는 알림
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Preview />}
                  onClick={() => previewTemplate('booking_confirmation')}
                >
                  미리보기
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 4
            }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  24시간 전 알림
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  수업 24시간 전 발송되는 리마인더
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Preview />}
                  onClick={() => previewTemplate('reminder_24h')}
                >
                  미리보기
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 4
            }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  취소 알림
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  예약이 취소되었을 때 발송되는 알림
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Preview />}
                  onClick={() => previewTemplate('cancellation')}
                >
                  미리보기
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      {/* Preview Dialog */}
      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>템플릿 미리보기</DialogTitle>
        <DialogContent>
          <ClientSanitizedContent
            html={previewContent}
            options="NOTIFICATION"
            fallback={
              <Box
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  p: 2,
                  backgroundColor: '#fafafa'
                }}
              >
                {previewContent.replace(/<[^>]*>/g, '')}
              </Box>
            }
          >
            {(sanitizedHTML) => (
              <Box
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  p: 2,
                  backgroundColor: '#fafafa'
                }}
                dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
              />
            )}
          </ClientSanitizedContent>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}