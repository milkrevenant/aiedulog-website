'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  ExpandMore,
  Refresh,
  Error,
  Warning,
  CheckCircle,
  Info,
  TrendingUp,
  Security,
  Speed,
  Code,
  Assignment,
  GetApp,
} from '@mui/icons-material'
import { runIdentityHealthCheck, generateHealthCheckReport, type HealthCheckResult } from '@/lib/identity/health-check-agent'

export default function IdentityHealthDashboard() {
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportDialog, setReportDialog] = useState(false)
  const [reportContent, setReportContent] = useState('')

  // Auto-run health check on component mount
  useEffect(() => {
    runHealthCheck()
  }, [])

  const runHealthCheck = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await runIdentityHealthCheck()
      setHealthResult(result)
    } catch (err) {
      console.error('Health check failed:', err)
      setError('Health check 실행 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    if (!healthResult) return
    
    try {
      const report = await generateHealthCheckReport()
      setReportContent(report)
      setReportDialog(true)
    } catch (err) {
      console.error('Report generation failed:', err)
      setError('보고서 생성 중 오류가 발생했습니다.')
    }
  }

  const downloadReport = () => {
    const blob = new Blob([reportContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `identity-health-report-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'success'
      case 'WARNING': return 'warning'
      case 'CRITICAL': return 'error'
      default: return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS': return <CheckCircle color="success" />
      case 'WARNING': return <Warning color="warning" />
      case 'FAIL': return <Error color="error" />
      default: return <Info />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'error'
      case 'HIGH': return 'error'
      case 'MEDIUM': return 'warning'
      case 'LOW': return 'info'
      default: return 'default'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'helper usage':
      case 'helperusage':
        return <Code />
      case 'database patterns':
      case 'databasepatterns':
        return <Security />
      case 'component usage':
      case 'componentusage':
        return <Assignment />
      case 'performance':
        return <Speed />
      default:
        return <Info />
    }
  }

  if (loading && !healthResult) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Identity System Health Check 실행 중...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          🔍 Identity System Health Dashboard
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={runHealthCheck}
            disabled={loading}
          >
            {loading ? '검사 중...' : '다시 검사'}
          </Button>
          {healthResult && (
            <Button
              variant="contained"
              startIcon={<GetApp />}
              onClick={generateReport}
            >
              보고서 생성
            </Button>
          )}
        </Stack>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {healthResult && (
        <>
          {/* Overall Status Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container alignItems="center" spacing={2}>
                <Grid
                  size={{
                    xs: 12,
                    md: 3
                  }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                      Overall Status
                    </Typography>
                    <Chip
                      label={healthResult.overall}
                      color={getStatusColor(healthResult.overall) as any}
                      size="medium"
                      sx={{ mt: 1, fontSize: '1.1rem', px: 2, py: 1 }}
                    />
                  </Box>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 3
                  }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary">
                      {healthResult.score}
                      <Typography component="span" variant="h5" color="text.secondary">
                        /100
                      </Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Health Score
                    </Typography>
                  </Box>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 6
                  }}>
                  <LinearProgress
                    variant="determinate"
                    value={healthResult.score}
                    sx={{ height: 8, borderRadius: 4, mb: 1 }}
                    color={healthResult.score >= 80 ? 'success' : healthResult.score >= 60 ? 'warning' : 'error'}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Last checked: {new Date(healthResult.timestamp).toLocaleString('ko-KR')}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Category Scores */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {Object.entries(healthResult.categories).map(([key, category]) => (
              <Grid
                key={key}
                size={{
                  xs: 12,
                  sm: 6,
                  md: 3
                }}>
                <Card>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      {getCategoryIcon(key)}
                      <Typography variant="h6" noWrap>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Typography>
                    </Stack>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {getStatusIcon(category.status)}
                      <Chip
                        label={category.status}
                        color={category.status === 'PASS' ? 'success' : category.status === 'WARNING' ? 'warning' : 'error'}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                    <Typography variant="h4" color="primary">
                      {category.score}
                      <Typography component="span" variant="body2" color="text.secondary">
                        /100
                      </Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {category.summary}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Issues */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🚨 Issues Detected
              </Typography>
              {Object.entries(healthResult.categories).map(([categoryName, category]) => 
                category.issues.length > 0 && (
                  <Accordion key={categoryName}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        {getCategoryIcon(categoryName)}
                        <Typography>
                          {categoryName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </Typography>
                        <Chip 
                          label={`${category.issues.length} issues`}
                          size="small"
                          color="error"
                        />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List>
                        {category.issues.map((issue, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Chip
                                label={issue.severity}
                                color={getSeverityColor(issue.severity) as any}
                                size="small"
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={issue.description}
                              secondary={
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Location:</strong> {issue.location}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Impact:</strong> {issue.impact}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Recommendation:</strong> {issue.recommendation}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                💡 Recommendations ({healthResult.recommendations.length})
              </Typography>
              {healthResult.recommendations.map((recommendation, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Chip
                        label={recommendation.priority}
                        color={recommendation.priority === 'CRITICAL' ? 'error' : 
                               recommendation.priority === 'HIGH' ? 'warning' : 'info'}
                        size="small"
                      />
                      <Typography>{recommendation.title}</Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" paragraph>
                      <strong>Category:</strong> {recommendation.category}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {recommendation.description}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Implementation Steps:</strong>
                    </Typography>
                    <List dense>
                      {recommendation.implementation.map((step, stepIndex) => (
                        <ListItem key={stepIndex}>
                          <ListItemText primary={`${stepIndex + 1}. ${step}`} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        </>
      )}
      {/* Report Dialog */}
      <Dialog
        open={reportDialog}
        onClose={() => setReportDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            Identity Health Check Report
            <IconButton onClick={downloadReport}>
              <GetApp />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography component="pre" variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
              {reportContent}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={downloadReport} startIcon={<GetApp />}>
            Download
          </Button>
          <Button onClick={() => setReportDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}