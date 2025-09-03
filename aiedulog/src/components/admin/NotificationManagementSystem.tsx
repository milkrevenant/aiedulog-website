'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Alert,
  
  Card,
  CardContent,
  CardActions,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material'
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Smartphone as SmartphoneIcon,
  Webhook as WebhookIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';

interface NotificationTemplate {
  id: string;
  templateKey: string;
  templateName: string;
  templateType: string;
  category: string;
  subjectTemplate?: string;
  contentTemplate: string;
  variables: Record<string, string>;
  isActive: boolean;
  createdAt: string;
}

interface NotificationAnalytics {
  timeSeriesData: any[];
  summaryStats: any[];
  recentCounts: any[];
  deliveryStatus: any[];
  templatePerformance: any[];
}

interface NotificationManagementSystemProps {
  onClose?: () => void;
}

const NotificationManagementSystem: React.FC<NotificationManagementSystemProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Templates state
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    templateKey: '',
    templateName: '',
    templateType: 'in_app_notification',
    category: 'system',
    subjectTemplate: '',
    contentTemplate: '',
    variables: '{}',
    isActive: true
  });

  // Send notification state
  const [sendDialog, setSendDialog] = useState(false);
  const [sendForm, setSendForm] = useState({
    userIds: '',
    title: '',
    message: '',
    category: 'system',
    priority: 'normal',
    channels: ['in_app'],
    templateKey: '',
    templateData: '{}'
  });

  // Analytics state
  const [analytics, setAnalytics] = useState<NotificationAnalytics | null>(null);
  const [analyticsDateRange, setAnalyticsDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const categories = [
    { value: 'schedule', label: '스케줄링' },
    { value: 'content', label: '콘텐츠' },
    { value: 'system', label: '시스템' },
    { value: 'security', label: '보안' },
    { value: 'user', label: '사용자' },
    { value: 'admin', label: '관리' },
    { value: 'marketing', label: '마케팅' }
  ];

  const templateTypes = [
    { value: 'in_app_notification', label: '앱 내 알림' },
    { value: 'email_html', label: '이메일 (HTML)' },
    { value: 'email_text', label: '이메일 (텍스트)' },
    { value: 'push_notification', label: '푸시 알림' },
    { value: 'sms_message', label: 'SMS' },
    { value: 'webhook_payload', label: '웹훅' }
  ];

  const priorities = [
    { value: 'low', label: '낮음' },
    { value: 'normal', label: '보통' },
    { value: 'high', label: '높음' },
    { value: 'critical', label: '중요' },
    { value: 'urgent', label: '긴급' }
  ];

  const channels = [
    { value: 'in_app', label: '앱 내', icon: NotificationsIcon },
    { value: 'email', label: '이메일', icon: EmailIcon },
    { value: 'push', label: '푸시', icon: SmartphoneIcon },
    { value: 'sms', label: 'SMS', icon: SmartphoneIcon },
    { value: 'webhook', label: '웹훅', icon: WebhookIcon }
  ];

  // Load templates
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/templates');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load templates');
      }

      setTemplates(data.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Load analytics
  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        start_date: analyticsDateRange.startDate,
        end_date: analyticsDateRange.endDate
      });

      const response = await fetch(`/api/notifications/analytics?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load analytics');
      }

      setAnalytics(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Create/update template
  const handleSaveTemplate = async () => {
    try {
      setLoading(true);
      setError(null);

      let variables;
      try {
        variables = JSON.parse(templateForm.variables);
      } catch {
        throw new Error('Invalid JSON in variables field');
      }

      const templateData: any = {
        ...templateForm,
        variables
      };

      const url = editingTemplate 
        ? '/api/notifications/templates'
        : '/api/notifications/templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      if (editingTemplate) {
        templateData.id = editingTemplate.id;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      setSuccess(editingTemplate ? 'Template updated successfully' : 'Template created successfully');
      setTemplateDialog(false);
      setEditingTemplate(null);
      setTemplateForm({
        templateKey: '',
        templateName: '',
        templateType: 'in_app_notification',
        category: 'system',
        subjectTemplate: '',
        contentTemplate: '',
        variables: '{}',
        isActive: true
      });
      
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  // Send notification
  const handleSendNotification = async () => {
    try {
      setLoading(true);
      setError(null);

      let templateData;
      try {
        templateData = sendForm.templateData ? JSON.parse(sendForm.templateData) : {};
      } catch {
        throw new Error('Invalid JSON in template data field');
      }

      const userIds = sendForm.userIds
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);

      if (userIds.length === 0) {
        throw new Error('Please provide at least one user ID');
      }

      const notificationData = {
        userIds,
        title: sendForm.title,
        message: sendForm.message,
        category: sendForm.category,
        priority: sendForm.priority,
        channels: sendForm.channels,
        templateKey: sendForm.templateKey || undefined,
        templateData: Object.keys(templateData).length > 0 ? templateData : undefined
      };

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send notification');
      }

      setSuccess(`Notification sent to ${userIds.length} user(s)`);
      setSendDialog(false);
      setSendForm({
        userIds: '',
        title: '',
        message: '',
        category: 'system',
        priority: 'normal',
        channels: ['in_app'],
        templateKey: '',
        templateData: '{}'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  // Edit template
  const handleEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      templateKey: template.templateKey,
      templateName: template.templateName,
      templateType: template.templateType,
      category: template.category,
      subjectTemplate: template.subjectTemplate || '',
      contentTemplate: template.contentTemplate,
      variables: JSON.stringify(template.variables, null, 2),
      isActive: template.isActive
    });
    setTemplateDialog(true);
  };

  useEffect(() => {
    if (activeTab === 0) {
      loadTemplates();
    } else if (activeTab === 2) {
      loadAnalytics();
    }
  }, [activeTab, analyticsDateRange]);

  const renderTemplatesTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">알림 템플릿 관리</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setTemplateDialog(true)}
          disabled={loading}
        >
          새 템플릿
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>템플릿 키</TableCell>
              <TableCell>이름</TableCell>
              <TableCell>타입</TableCell>
              <TableCell>카테고리</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>생성일</TableCell>
              <TableCell align="right">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((template) => (
              <TableRow key={template.id}>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {template.templateKey}
                  </Typography>
                </TableCell>
                <TableCell>{template.templateName}</TableCell>
                <TableCell>
                  {templateTypes.find(t => t.value === template.templateType)?.label || template.templateType}
                </TableCell>
                <TableCell>
                  <Chip
                    label={categories.find(c => c.value === template.category)?.label || template.category}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={template.isActive ? '활성' : '비활성'}
                    color={template.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(template.createdAt).toLocaleDateString('ko-KR')}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="편집">
                    <IconButton onClick={() => handleEditTemplate(template)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={templates.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>
    </Box>
  );

  const renderSendTab = () => (
    <Box>
      <Typography variant="h6" mb={3}>알림 보내기</Typography>
      
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={12}>
            <TextField
              fullWidth
              label="사용자 ID (쉼표로 구분)"
              value={sendForm.userIds}
              onChange={(e) => setSendForm(prev => ({ ...prev, userIds: e.target.value }))}
              placeholder="user-id-1, user-id-2, user-id-3"
              helperText="알림을 받을 사용자들의 ID를 쉼표로 구분하여 입력하세요"
            />
          </Grid>
          
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <FormControl fullWidth>
              <InputLabel>카테고리</InputLabel>
              <Select
                value={sendForm.category}
                label="카테고리"
                onChange={(e) => setSendForm(prev => ({ ...prev, category: e.target.value }))}
              >
                {categories.map(cat => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <FormControl fullWidth>
              <InputLabel>우선순위</InputLabel>
              <Select
                value={sendForm.priority}
                label="우선순위"
                onChange={(e) => setSendForm(prev => ({ ...prev, priority: e.target.value }))}
              >
                {priorities.map(priority => (
                  <MenuItem key={priority.value} value={priority.value}>
                    {priority.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={12}>
            <Typography variant="subtitle2" gutterBottom>전송 채널</Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {channels.map(channel => (
                <Chip
                  key={channel.value}
                  label={channel.label}
                  clickable
                  color={sendForm.channels.includes(channel.value) ? 'primary' : 'default'}
                  onClick={() => {
                    setSendForm(prev => ({
                      ...prev,
                      channels: prev.channels.includes(channel.value)
                        ? prev.channels.filter(c => c !== channel.value)
                        : [...prev.channels, channel.value]
                    }));
                  }}
                />
              ))}
            </Box>
          </Grid>
          
          <Grid size={12}>
            <TextField
              fullWidth
              label="제목"
              value={sendForm.title}
              onChange={(e) => setSendForm(prev => ({ ...prev, title: e.target.value }))}
            />
          </Grid>
          
          <Grid size={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="메시지"
              value={sendForm.message}
              onChange={(e) => setSendForm(prev => ({ ...prev, message: e.target.value }))}
            />
          </Grid>
          
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <TextField
              fullWidth
              label="템플릿 키 (선택사항)"
              value={sendForm.templateKey}
              onChange={(e) => setSendForm(prev => ({ ...prev, templateKey: e.target.value }))}
              helperText="템플릿을 사용할 경우 입력"
            />
          </Grid>
          
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="템플릿 데이터 (JSON)"
              value={sendForm.templateData}
              onChange={(e) => setSendForm(prev => ({ ...prev, templateData: e.target.value }))}
              helperText="템플릿 변수 값들을 JSON 형태로 입력"
            />
          </Grid>
          
          <Grid size={12}>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSendNotification}
              disabled={loading || !sendForm.title || !sendForm.message || !sendForm.userIds}
            >
              알림 보내기
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  const renderAnalyticsTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">알림 분석</Typography>
        <Box display="flex" gap={2}>
          <TextField
            type="date"
            label="시작일"
            value={analyticsDateRange.startDate}
            onChange={(e) => setAnalyticsDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            label="종료일"
            value={analyticsDateRange.endDate}
            onChange={(e) => setAnalyticsDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAnalytics}
            disabled={loading}
          >
            새로고침
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {analytics && (
        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid
            size={{
              xs: 12,
              md: 3
            }}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="primary">
                  {analytics.summaryStats.reduce((sum, stat) => sum + (stat.total_sent || 0), 0).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  총 발송 수
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid
            size={{
              xs: 12,
              md: 3
            }}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="success.main">
                  {analytics.summaryStats.reduce((sum, stat) => sum + (stat.total_delivered || 0), 0).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  성공 전송
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid
            size={{
              xs: 12,
              md: 3
            }}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="info.main">
                  {analytics.summaryStats.reduce((sum, stat) => sum + (stat.total_opened || 0), 0).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  열람 수
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid
            size={{
              xs: 12,
              md: 3
            }}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="error.main">
                  {analytics.summaryStats.reduce((sum, stat) => sum + (stat.total_failed || 0), 0).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  실패 수
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Template Performance */}
          <Grid size={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>템플릿 성능</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>템플릿</TableCell>
                      <TableCell align="right">발송</TableCell>
                      <TableCell align="right">전달</TableCell>
                      <TableCell align="right">열람</TableCell>
                      <TableCell align="right">클릭</TableCell>
                      <TableCell align="right">전달률</TableCell>
                      <TableCell align="right">열람률</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.templatePerformance.map((template, index) => (
                      <TableRow key={index}>
                        <TableCell>{template.template_key}</TableCell>
                        <TableCell align="right">{template.total_sent?.toLocaleString()}</TableCell>
                        <TableCell align="right">{template.total_delivered?.toLocaleString()}</TableCell>
                        <TableCell align="right">{template.total_opened?.toLocaleString()}</TableCell>
                        <TableCell align="right">{template.total_clicked?.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          {((template.delivery_rate || 0) * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell align="right">
                          {((template.open_rate || 0) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom display="flex" alignItems="center" gap={2}>
        <NotificationsIcon />
        알림 관리 시스템
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="템플릿 관리" icon={<SettingsIcon />} />
          <Tab label="알림 보내기" icon={<SendIcon />} />
          <Tab label="분석" icon={<AnalyticsIcon />} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && renderTemplatesTab()}
          {activeTab === 1 && renderSendTab()}
          {activeTab === 2 && renderAnalyticsTab()}
        </Box>
      </Paper>

      {/* Template Dialog */}
      <Dialog
        open={templateDialog}
        onClose={() => setTemplateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingTemplate ? '템플릿 편집' : '새 템플릿 생성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="템플릿 키"
              value={templateForm.templateKey}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, templateKey: e.target.value }))}
              disabled={!!editingTemplate}
            />
            <TextField
              fullWidth
              label="템플릿 이름"
              value={templateForm.templateName}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, templateName: e.target.value }))}
            />
            <FormControl fullWidth>
              <InputLabel>템플릿 타입</InputLabel>
              <Select
                value={templateForm.templateType}
                label="템플릿 타입"
                onChange={(e) => setTemplateForm(prev => ({ ...prev, templateType: e.target.value }))}
              >
                {templateTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>카테고리</InputLabel>
              <Select
                value={templateForm.category}
                label="카테고리"
                onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value }))}
              >
                {categories.map(cat => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {(templateForm.templateType.includes('email')) && (
              <TextField
                fullWidth
                label="제목 템플릿"
                value={templateForm.subjectTemplate}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, subjectTemplate: e.target.value }))}
                helperText="이메일 제목에 사용됩니다. {{변수명}} 형태로 변수를 사용할 수 있습니다."
              />
            )}
            <TextField
              fullWidth
              multiline
              rows={4}
              label="콘텐츠 템플릿"
              value={templateForm.contentTemplate}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, contentTemplate: e.target.value }))}
              helperText="{{변수명}} 형태로 변수를 사용할 수 있습니다."
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="변수 정의 (JSON)"
              value={templateForm.variables}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, variables: e.target.value }))}
              helperText='예: {"user_name": "string", "date": "string"}'
            />
            <FormControlLabel
              control={
                <Switch
                  checked={templateForm.isActive}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, isActive: e.target.checked }))}
                />
              }
              label="활성화"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialog(false)}>
            취소
          </Button>
          <Button
            onClick={handleSaveTemplate}
            variant="contained"
            disabled={loading || !templateForm.templateKey || !templateForm.templateName || !templateForm.contentTemplate}
          >
            {editingTemplate ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationManagementSystem;