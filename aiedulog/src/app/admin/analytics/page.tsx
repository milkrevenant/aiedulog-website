'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import AppHeader from '@/components/AppHeader'
import {
  Box,
  Container,
  Typography,
  GridLegacy as Grid,
  Card,
  CardContent,
  CardHeader,
  Paper,
  Stack,
  Tabs,
  Tab,
  Breadcrumbs,
  Link,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Alert,
  Divider,
  LinearProgress,
} from '@mui/material'
import {
  Dashboard,
  BarChart,
  TrendingUp,
  TrendingDown,
  Visibility,
  TouchApp,
  Share,
  Download,
  Timeline,
  PieChart,
  Assessment,
  Speed,
  Public,
  Phone,
  Computer,
  Tablet,
  Language,
  AccessTime,
  LocationOn,
  People,
  Event,
  FilterList,
  GetApp,
  Refresh,
  MoreVert,
} from '@mui/icons-material'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// Analytics data interfaces
interface AnalyticsData {
  overview: {
    totalViews: number
    totalInteractions: number
    uniqueUsers: number
    avgTimeOnSite: string
    bounceRate: number
    conversionRate: number
  }
  timeSeriesData: Array<{
    date: string
    views: number
    interactions: number
    users: number
  }>
  contentPerformance: Array<{
    id: string
    title: string
    type: 'section' | 'block'
    views: number
    interactions: number
    conversionRate: number
    trend: 'up' | 'down' | 'stable'
  }>
  deviceBreakdown: Array<{
    device: string
    count: number
    percentage: number
  }>
  locationData: Array<{
    country: string
    city: string
    count: number
  }>
  realTimeData: {
    activeUsers: number
    currentViews: number
    topPages: Array<{
      page: string
      users: number
    }>
  }
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      <AnimatePresence mode="wait">
        {value === index && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ py: 3 }}>{children}</Box>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Custom colors for charts
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0']

function ContentAnalytics() {
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const [dateRange, setDateRange] = useState('7d')
  const [refreshing, setRefreshing] = useState(false)

  const router = useRouter()

  // Sample analytics data
  const sampleAnalyticsData: AnalyticsData = {
    overview: {
      totalViews: 45230,
      totalInteractions: 8920,
      uniqueUsers: 12450,
      avgTimeOnSite: '3m 42s',
      bounceRate: 32.8,
      conversionRate: 19.7,
    },
    timeSeriesData: [
      { date: '2024-01-01', views: 1200, interactions: 240, users: 800 },
      { date: '2024-01-02', views: 1500, interactions: 320, users: 950 },
      { date: '2024-01-03', views: 1800, interactions: 380, users: 1100 },
      { date: '2024-01-04', views: 2100, interactions: 420, users: 1250 },
      { date: '2024-01-05', views: 1900, interactions: 390, users: 1180 },
      { date: '2024-01-06', views: 2300, interactions: 480, users: 1350 },
      { date: '2024-01-07', views: 2000, interactions: 410, users: 1200 },
    ],
    contentPerformance: [
      {
        id: '1',
        title: '연구회 소개',
        type: 'section',
        views: 8500,
        interactions: 1200,
        conversionRate: 14.1,
        trend: 'up'
      },
      {
        id: '2',
        title: 'AI 교육 비전',
        type: 'section',
        views: 7200,
        interactions: 980,
        conversionRate: 13.6,
        trend: 'up'
      },
      {
        id: '3',
        title: '메인 히어로 블록',
        type: 'block',
        views: 6800,
        interactions: 840,
        conversionRate: 12.4,
        trend: 'stable'
      },
      {
        id: '4',
        title: '통계 카운터',
        type: 'block',
        views: 5900,
        interactions: 720,
        conversionRate: 12.2,
        trend: 'down'
      },
      {
        id: '5',
        title: '강의 계획',
        type: 'section',
        views: 5200,
        interactions: 650,
        conversionRate: 12.5,
        trend: 'up'
      },
    ],
    deviceBreakdown: [
      { device: 'Desktop', count: 18500, percentage: 41.8 },
      { device: 'Mobile', count: 16200, percentage: 36.6 },
      { device: 'Tablet', count: 9580, percentage: 21.6 },
    ],
    locationData: [
      { country: 'South Korea', city: 'Seoul', count: 15200 },
      { country: 'South Korea', city: 'Busan', count: 8900 },
      { country: 'South Korea', city: 'Daegu', count: 5600 },
      { country: 'United States', city: 'New York', count: 2100 },
      { country: 'Japan', city: 'Tokyo', count: 1800 },
    ],
    realTimeData: {
      activeUsers: 127,
      currentViews: 45,
      topPages: [
        { page: '연구회 소개', users: 23 },
        { page: 'AI 교육 비전', users: 18 },
        { page: '강의 계획', users: 12 },
        { page: '뉴스', users: 8 },
      ]
    }
  }

  useEffect(() => {
    // Simulate loading analytics data
    setTimeout(() => {
      setAnalyticsData(sampleAnalyticsData)
      setLoading(false)
    }, 1500)
  }, [])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleRefreshData = async () => {
    setRefreshing(true)
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false)
    }, 2000)
  }

  const handleExportData = () => {
    // Implementation for data export
    console.log('Exporting analytics data...')
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp color="success" />
      case 'down': return <TrendingDown color="error" />
      default: return null
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading analytics dashboard...
        </Typography>
      </Box>
    )
  }

  if (!analyticsData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Alert severity="error">
          Failed to load analytics data. Please try again.
        </Alert>
      </Box>
    )
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ mb: 4 }}>
            <Breadcrumbs sx={{ mb: 2 }}>
              <Link href="/admin" underline="hover" color="inherit">
                <Dashboard sx={{ mr: 0.5 }} fontSize="inherit" />
                Admin
              </Link>
              <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                <BarChart sx={{ mr: 0.5 }} fontSize="inherit" />
                Content Analytics
              </Typography>
            </Breadcrumbs>
            
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Box>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                  Advanced Content Analytics
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Real-time insights into content performance and user engagement
                </Typography>
              </Box>
              
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Date Range</InputLabel>
                  <Select
                    value={dateRange}
                    label="Date Range"
                    onChange={(e) => setDateRange(e.target.value)}
                  >
                    <MenuItem value="1d">Last 24h</MenuItem>
                    <MenuItem value="7d">Last 7 days</MenuItem>
                    <MenuItem value="30d">Last 30 days</MenuItem>
                    <MenuItem value="90d">Last 90 days</MenuItem>
                  </Select>
                </FormControl>
                
                <Button
                  variant="outlined"
                  startIcon={<GetApp />}
                  onClick={handleExportData}
                >
                  Export
                </Button>
                
                <Button
                  variant="contained"
                  startIcon={refreshing ? <CircularProgress size={20} /> : <Refresh />}
                  onClick={handleRefreshData}
                  disabled={refreshing}
                  sx={{ 
                    background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                    boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .3)',
                  }}
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </motion.div>

        {/* Overview Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              textAlign: 'center'
            }}>
              <CardContent>
                <Visibility sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {formatNumber(analyticsData.overview.totalViews)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Views
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              textAlign: 'center'
            }}>
              <CardContent>
                <TouchApp sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {formatNumber(analyticsData.overview.totalInteractions)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Interactions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              textAlign: 'center'
            }}>
              <CardContent>
                <People sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {formatNumber(analyticsData.overview.uniqueUsers)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Unique Users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              textAlign: 'center'
            }}>
              <CardContent>
                <AccessTime sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {analyticsData.overview.avgTimeOnSite}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Avg. Time
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              color: 'white',
              textAlign: 'center'
            }}>
              <CardContent>
                <Speed sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {analyticsData.overview.bounceRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Bounce Rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
              color: '#333',
              textAlign: 'center'
            }}>
              <CardContent>
                <Assessment sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {analyticsData.overview.conversionRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Conversion
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Real-time Data */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom color="primary">
                Real-time Activity
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="success.main">
                {analyticsData.realTimeData.activeUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active users right now
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom color="primary">
                Current Views
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="warning.main">
                {analyticsData.realTimeData.currentViews}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pages being viewed now
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="primary">
                Top Active Pages
              </Typography>
              <List dense>
                {analyticsData.realTimeData.topPages.map((page, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemText 
                      primary={page.page}
                      secondary={`${page.users} users`}
                    />
                    <Chip 
                      label={page.users} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>

        {/* Main Analytics Content */}
        <Paper sx={{ width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              px: 3,
              '& .MuiTab-root': {
                minHeight: '64px',
                fontSize: '0.95rem',
                fontWeight: 500,
              }
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<Timeline />} label="Time Series" iconPosition="start" />
            <Tab icon={<Assessment />} label="Content Performance" iconPosition="start" />
            <Tab icon={<PieChart />} label="Audience" iconPosition="start" />
            <Tab icon={<LocationOn />} label="Geography" iconPosition="start" />
          </Tabs>

          {/* Time Series Analytics */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timeline color="primary" />
                Traffic Trends
              </Typography>
              
              <Card sx={{ mt: 3, p: 2 }}>
                <CardHeader title="Views and Interactions Over Time" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={analyticsData.timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="views" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Views"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="interactions" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        name="Interactions"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="users" 
                        stroke="#ffc658" 
                        strokeWidth={2}
                        name="Users"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>

          {/* Content Performance */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment color="primary" />
                Content Performance
              </Typography>
              
              <Grid container spacing={3}>
                {analyticsData.contentPerformance.map((content, index) => (
                  <Grid item xs={12} md={6} lg={4} key={content.id}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                          <Typography variant="h6" noWrap>
                            {content.title}
                          </Typography>
                          {getTrendIcon(content.trend)}
                        </Stack>
                        
                        <Chip 
                          label={content.type === 'section' ? 'Section' : 'Block'} 
                          size="small" 
                          color={content.type === 'section' ? 'primary' : 'secondary'}
                          sx={{ mb: 2 }}
                        />
                        
                        <Stack spacing={2}>
                          <Box>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">Views</Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {formatNumber(content.views)}
                              </Typography>
                            </Stack>
                            <LinearProgress 
                              variant="determinate" 
                              value={(content.views / 10000) * 100} 
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                          
                          <Box>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">Interactions</Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {formatNumber(content.interactions)}
                              </Typography>
                            </Stack>
                            <LinearProgress 
                              variant="determinate" 
                              value={(content.interactions / 1500) * 100}
                              color="secondary"
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                          
                          <Box>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">Conversion Rate</Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {content.conversionRate}%
                              </Typography>
                            </Stack>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </TabPanel>

          {/* Audience Analytics */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PieChart color="primary" />
                Audience Insights
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Device Breakdown" />
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={analyticsData.deviceBreakdown}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            dataKey="count"
                            label={({ device, percentage }: any) => `${device}: ${percentage}%`}
                          >
                            {analyticsData.deviceBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Device Statistics" />
                    <CardContent>
                      <List>
                        {analyticsData.deviceBreakdown.map((device, index) => (
                          <ListItem key={index}>
                            <ListItemAvatar>
                              <Avatar sx={{ backgroundColor: COLORS[index % COLORS.length] }}>
                                {device.device === 'Desktop' ? <Computer /> :
                                 device.device === 'Mobile' ? <Phone /> : <Tablet />}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={device.device}
                              secondary={`${formatNumber(device.count)} users (${device.percentage}%)`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          {/* Geography */}
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOn color="primary" />
                Geographic Distribution
              </Typography>
              
              <Card>
                <CardHeader title="Top Locations" />
                <CardContent>
                  <List>
                    {analyticsData.locationData.map((location, index) => (
                      <ListItem key={index}>
                        <ListItemAvatar>
                          <Avatar sx={{ backgroundColor: COLORS[index % COLORS.length] }}>
                            <Public />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${location.city}, ${location.country}`}
                          secondary={`${formatNumber(location.count)} users`}
                        />
                        <LinearProgress 
                          variant="determinate" 
                          value={(location.count / analyticsData.locationData[0].count) * 100}
                          sx={{ width: '100px', ml: 2 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>
        </Paper>
      </Container>
    </>
  )
}

export default function ContentAnalyticsPage() {
  return (
    <AuthGuard requireAuth requireModerator>
      <ContentAnalytics />
    </AuthGuard>
  )
}